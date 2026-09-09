# WCV — West Complex Village Community App

> A web app for the residents of an apartment complex: a forum, an info desk,
> community events with sign-ups, personal event tracking, maintenance requests,
> and per-user settings. Built on **Next.js**, **Supabase**, and **Netlify**.

---

## 1. Goals & Non-Goals

### Goals
- Give residents a single, private place to talk to each other (forum), find
  building information (info desk), discover and sign up for events, track their
  own event sign-ups, and file maintenance requests.
- Give community managers tools to run events, publish info, and triage
  maintenance.
- Access is limited to real residents via **manager invite / approval**.
- Support **multiple complexes (buildings)** from one deployment, each fully
  isolated from the others.
- Ship incrementally: every stage is deployable and useful on its own.

### Non-Goals (v1)
- Native mobile apps (the web app will be a responsive PWA; native comes later).
- Video uploads (schema is designed to allow them; UI ships in a later stage).
- Rent payments, leasing, or accounting integrations.
- Public/anonymous access — everything lives behind login.

---

## 2. Locked Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Frontend framework | **Next.js (App Router, TypeScript)** | SSR-capable, first-class Supabase SSR auth, good Netlify support. |
| Backend / data | **Supabase** (Postgres + Auth + Storage + Edge Functions + Realtime) | One managed platform covers auth, DB, file storage, and serverless. |
| Auth methods | **Google OAuth** + **magic link (email OTP)** | Both handled by Supabase Auth. |
| Access model | **Manager invite / approval** | New users are `pending` until approved; RLS gates all content. |
| Tenancy | **Multi-tenant** (`buildings`) | Every domain row carries `building_id`; RLS isolates buildings. |
| Styling / UI | **Tailwind CSS + shadcn/ui** (Radix) | Fast, accessible, fully themeable (supports Settings "look & feel"). |
| Hosting | **Netlify** (Next.js runtime) | Requested; integrates with the Supabase-hosted DB. |
| Email | **Supabase Auth SMTP** (magic link) + **Resend** (notifications) | SMTP + Resend keys already available in the environment. |

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Netlify (CDN + Edge)                    │
│   Next.js App Router (React 19, TS, Tailwind, shadcn/ui)       │
│   - Server Components / Server Actions for reads & mutations   │
│   - Route Handlers for webhooks (Resend, cron)                 │
└───────────────┬───────────────────────────┬──────────────────┘
                │ @supabase/ssr (cookies)    │ service-role (server only)
                ▼                            ▼
┌──────────────────────────────────────────────────────────────┐
│                          Supabase                              │
│   Auth  ─ Google OAuth, magic link, JWT sessions              │
│   Postgres ─ all tables, Row Level Security on every table    │
│   Storage ─ forum/event/maintenance media, avatars            │
│   Realtime ─ live forum threads & notifications               │
│   Edge Functions ─ send email, enforce event capacity, cron   │
└──────────────────────────────────────────────────────────────┘
```

### Key principles
- **RLS everywhere.** No table is readable/writable without a Row Level
  Security policy. The anon/auth client can only ever see rows the logged-in
  user is entitled to. The service-role key is used **only** in server code
  (Server Actions, Edge Functions), never shipped to the browser.
- **Building isolation.** Every domain table has a `building_id`. A user only
  sees a building's data if they have an **approved** membership in it.
- **Server-first data access.** Reads and mutations go through Next.js Server
  Components / Server Actions using the SSR Supabase client, so sessions live in
  httpOnly cookies, not `localStorage`.

---

## 4. Roles & Access Model

Roles are **per building** (stored on `memberships`), so the same person can be a
resident in one building and a manager in another.

| Role | Capabilities |
|---|---|
| `resident` | Read/post in forum, react, edit own content, view info desk, sign up for events, file & comment on own maintenance requests, manage own settings. |
| `manager` | Everything a resident can, plus: create/edit events, edit info desk, triage/close **all** maintenance requests, pin/moderate forum posts. |
| `admin` | Everything a manager can, plus: invite/approve/suspend members, assign roles, edit building settings. |
| _platform super admin_ | Not a building role. A flagged account (via Supabase `app_metadata`) that can create buildings and bootstrap the first admin. Used rarely, from a protected route. |

### Membership lifecycle
```
invited ──accept──▶ pending ──approve──▶ approved ──suspend──▶ suspended
   │                   │                                          │
   └── (self sign-up) ─┘                                     re-approve
                                             rejected ◀──reject──┘
```
- **Invite:** admin/manager sends an email invite (row in `invites` + Resend
  email with a signed token). Accepting creates an `approved` membership.
- **Self sign-up:** a user who logs in without an invite lands as `pending`;
  an admin/manager approves or rejects them.
- Only `approved` memberships can see building content — enforced in RLS via a
  `is_approved_member(building_id)` helper.

---

## 5. Data Model (Supabase / Postgres)

All tables use `uuid` primary keys (`gen_random_uuid()`), `created_at` /
`updated_at timestamptz`, and (except global tables) a `building_id` FK. Soft
deletes use a nullable `deleted_at`.

### Global / tenancy
- **`buildings`** — `id, name, slug, address, timezone, settings jsonb, created_at`
- **`units`** — `id, building_id, label` (e.g. "Apt 214"); optional resident link.
- **`profiles`** — `id (= auth.users.id), full_name, preferred_name, avatar_url,
  created_at` — one global profile per auth user.
- **`memberships`** — `id, building_id, user_id, role (resident|manager|admin),
  status (pending|approved|rejected|suspended), unit_id, invited_by,
  approved_by, created_at` — **the heart of access + tenancy.** Unique
  `(building_id, user_id)`.
- **`invites`** — `id, building_id, email, role, token_hash, expires_at,
  accepted_at, invited_by`.

### Forum
- **`categories`** — `id, building_id, slug, label, color, sort_order`. Seeded
  per building with: `free-for-sale`, `event`, `lost-found`, `recommendation`,
  `safety`, `general`. Editable by admins.
- **`posts`** — `id, building_id, author_id, title, body, is_pinned,
  created_at, updated_at, edited_at, deleted_at`.
- **`post_categories`** — join `(post_id, category_id)` — a post can carry
  multiple category tags for filtering.
- **`comments`** — `id, building_id, post_id, author_id, parent_comment_id
  (nullable, for one-level threading), body, created_at, edited_at, deleted_at`.
- **`reactions`** — `id, building_id, target_type (post|comment), target_id,
  user_id, emoji, created_at`. Unique `(target_type, target_id, user_id, emoji)`.
- **`attachments`** — `id, building_id, owner_id, storage_path, mime_type,
  kind (image|video), width, height, byte_size, post_id?, comment_id?,
  maintenance_request_id?, event_id?, created_at`. Reused across features.

### Events
- **`events`** — `id, building_id, created_by, title, description, location,
  starts_at, ends_at, capacity (nullable = unlimited), cover_attachment_id,
  is_published, cancelled_at, created_at, updated_at`.
- **`event_signups`** — `id, building_id, event_id, user_id, status
  (registered|waitlisted|cancelled), guests_count, created_at`. Unique
  `(event_id, user_id)`. Capacity + waitlist enforced by an RPC / trigger, not
  the client (prevents overbooking races).

### Maintenance
- **`maintenance_requests`** — `id, building_id, created_by, title, description,
  category (plumbing|electrical|appliance|common-area|other), unit_id, priority
  (low|normal|high|urgent), status (open|in_progress|resolved|closed|cancelled),
  assigned_to, resolved_at, created_at, updated_at`.
- **`maintenance_updates`** — `id, building_id, request_id, author_id, body,
  status_from, status_to, is_internal, created_at` — activity log / comment
  thread, including status changes.

### Info desk
- **`info_sections`** — `id, building_id, slug, title, sort_order`.
- **`info_items`** — `id, building_id, section_id, title, body (markdown),
  phone, url, sort_order, updated_by, updated_at`. Manager-editable static
  content (management contacts, hours, policies, etc.).

### Settings & notifications
- **`user_settings`** — `id (= user_id), theme (system|light|dark), accent,
  locale, notif_prefs jsonb` — per-user, cross-building preferences.
- **`notifications`** — `id, building_id, user_id, type, title, body, link,
  read_at, created_at` — in-app notifications (via Realtime).
- **`push_subscriptions`** — `id, user_id, endpoint, keys jsonb, user_agent,
  created_at` — Web Push (later stage).
- Legal docs (Privacy Policy, Terms of Service) ship as versioned markdown in
  the repo (`/content/legal/*`), rendered in Settings; no table needed.

### ER sketch
```
auth.users ─1:1─ profiles
auth.users ─1:N─ memberships ─N:1─ buildings ─1:N─ units
buildings ─1:N─ categories, posts, events, maintenance_requests, info_sections
posts ─1:N─ comments ─1:N─ comments (parent_comment_id)
posts/comments ─1:N─ reactions, attachments
events ─1:N─ event_signups
maintenance_requests ─1:N─ maintenance_updates
```

---

## 6. Row Level Security (RLS) Strategy

Helper functions (SQL, `security definer`) keep policies short:
- `is_approved_member(bid uuid) → bool` — current user has an `approved`
  membership in `bid`.
- `member_role(bid uuid) → text` — the current user's role in `bid`.
- `is_manager(bid uuid) → bool` — role is `manager` or `admin`.
- `is_admin(bid uuid) → bool` — role is `admin`.

General policy shape per domain table:
- **SELECT:** `is_approved_member(building_id)`.
- **INSERT:** `is_approved_member(building_id)` and (for author-owned rows)
  `author_id = auth.uid()`.
- **UPDATE/DELETE own:** `author_id = auth.uid()` (residents edit their own).
- **Manager override:** `is_manager(building_id)` for moderation, events, info
  desk, and maintenance triage.
- **`memberships` / `invites`:** users see their own membership; admins/managers
  see and manage all rows in their building.
- **Storage:** bucket policies mirror the same helpers, keyed off the
  `building_id` prefix in the object path.

Advisory: run `get_advisors` (security + performance) after each migration and
resolve findings before deploy.

---

## 7. Storage Layout

Buckets (all private; access via signed URLs or RLS-guarded downloads):
- `avatars` — path `user_id/…`
- `forum-media` — path `building_id/post_id/…`
- `event-media` — path `building_id/event_id/…`
- `maintenance-media` — path `building_id/request_id/…`

Client uploads go straight to Storage with RLS policies; on success a row is
written to `attachments`. Images are validated (mime + size) client-side and
re-checked server-side. Video is accepted at the schema level but the upload UI
is gated until the video stage.

---

## 8. Notifications

- **Auth emails** (magic link, invites): Supabase Auth SMTP.
- **Transactional / event notifications:** Resend, called from Edge Functions
  (e.g. "your maintenance request was updated", "event you signed up for was
  cancelled", "you were approved").
- **In-app:** `notifications` table streamed to the client via Supabase
  Realtime; a bell icon with unread count.
- **Web Push:** `push_subscriptions` + VAPID keys + a service worker (later
  stage; the PWA shell lands earlier).
- Every notification respects `user_settings.notif_prefs` (per-category toggles
  exposed in Settings).

---

## 9. Environment & Configuration

`.env` is **gitignored**; `.env.example` documents required keys. The existing
repo `.env` is a broad personal file with unrelated secrets — WCV reads only the
subset below.

```dotenv
# ---- Supabase ----
NEXT_PUBLIC_SUPABASE_URL=            # project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # publishable anon key (browser-safe)
SUPABASE_SERVICE_ROLE_KEY=           # SERVER ONLY — never exposed to client
SUPABASE_STORAGE_BUCKET=forum-media

# ---- App ----
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # used for auth redirects & emails

# ---- Email (notifications) ----
RESEND_API_KEY=
AUTH_FROM_EMAIL=no-reply@example.com

# ---- Web Push (later stage) ----
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# ---- Optional: observability ----
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

Google OAuth client ID/secret are configured in the **Supabase dashboard**
(Auth → Providers), not in app env. Redirect URLs: `NEXT_PUBLIC_SITE_URL` +
`/auth/callback` for local, preview, and production.

---

## 10. Deployment

- **Supabase:** one project per environment (or branch databases for previews).
  Schema managed as SQL migrations in `supabase/migrations/`, applied via the
  Supabase CLI / MCP. Never hand-edit the remote schema outside migrations.
- **Netlify:** connect the git repo; build with the official Next.js runtime.
  Env vars set in the Netlify UI (production + deploy-preview contexts). Deploy
  previews get their own Supabase branch DB where feasible.
- **Secrets:** service-role key and Resend key are Netlify env vars scoped to
  the server; only `NEXT_PUBLIC_*` reach the browser bundle.

---

## 11. Testing & CI

- **Unit:** Vitest for utilities and pure logic.
- **Component:** React Testing Library for key components.
- **E2E:** Playwright for the critical flows (login, post, sign up for event,
  file maintenance request), run against a local Supabase stack.
- **DB:** pgTAP or SQL assertions for RLS policies (verify a user in building A
  cannot read building B).
- **CI (GitHub Actions):** lint (ESLint) → typecheck (`tsc --noEmit`) → unit +
  component tests → build. E2E on PRs to main. Gate merges on green.

---

## 12. Security & Privacy

- All data behind auth + RLS; building isolation enforced at the DB layer.
- Service-role key server-only; never in client bundles or logs.
- Input validation with Zod at every Server Action / Route Handler boundary.
- Uploads: mime/size limits, private buckets, signed URLs.
- Rate limiting on invite/magic-link endpoints (Upstash or Supabase Edge).
- Privacy Policy + Terms of Service surfaced in Settings and at sign-up.
- Audit trail for admin actions (approvals, role changes) via `maintenance_
  updates`-style logging on membership changes.

---

## 13. Multi-Stage Implementation Roadmap

Each stage ends in a deployable, demoable increment. Suggested order:

### Stage 0 — Project scaffold & infrastructure
- Next.js (App Router, TS) + Tailwind + shadcn/ui initialized.
- Supabase project created; CLI wired up; `supabase/migrations/` established.
- `.gitignore`, `.env.example`, ESLint/Prettier, Vitest, Playwright, GitHub
  Actions skeleton.
- Netlify site connected; first "hello world" deploy green.
- **Done when:** empty app deploys to Netlify and connects to Supabase.

### Stage 1 — Auth & tenancy foundation
- `@supabase/ssr` auth (Google + magic link), `/auth/callback`, sign-in/out.
- Tables: `buildings`, `profiles`, `memberships`, `invites`, `units`.
- RLS helpers (`is_approved_member`, `is_manager`, `is_admin`) + policies.
- Invite/approval flow: super-admin bootstraps a building + first admin; admins
  invite + approve members; pending/rejected states handled in UI.
- **Done when:** an invited resident can log in, be approved, and land in an
  (empty) building; a stranger is held at `pending`.

### Stage 2 — App shell, navigation & settings scaffold
- Responsive layout: sidebar/nav for Forum, Info Desk, Events, My Events,
  Maintenance, Settings. Building switcher for multi-building users.
- Theme system (light/dark/system + accent) wired to `user_settings`.
- Profile: preferred name + avatar upload.
- **Done when:** navigation, theming, and profile editing work end to end.

### Stage 3 — Forum (core feature)
- Tables: `categories` (seeded), `posts`, `post_categories`, `comments`,
  `reactions`, `attachments`.
- Create/edit/delete own posts & comments; one-level threaded replies.
- Emoji reactions on posts and comments.
- Category tagging + filtering; pinned posts; manager moderation.
- Image attachments (upload → Storage → `attachments`).
- Realtime updates for open threads.
- **Done when:** residents can post, reply, react, tag, filter, and attach
  images; managers can pin/moderate.

### Stage 4 — Events & My Events
- Tables: `events`, `event_signups`.
- Manager: create/edit/publish/cancel events with capacity + cover image.
- Resident: browse upcoming events, sign up / cancel; capacity + waitlist
  enforced by RPC (no overbooking).
- **My Events:** the signed-in user's upcoming & past sign-ups.
- Notifications on cancel / waitlist promotion.
- **Done when:** capacity-limited sign-ups work correctly under concurrency and
  appear in My Events.

### Stage 5 — Maintenance requests
- Tables: `maintenance_requests`, `maintenance_updates`.
- Resident: file a request (with photos), see own open & closed requests, add
  comments.
- Manager: see all requests, triage (assign, set priority/status), post
  updates; residents notified on changes.
- Open vs closed views with filters.
- **Done when:** full request lifecycle (open → in_progress → resolved/closed)
  works for both roles with notifications.

### Stage 6 — Info Desk
- Tables: `info_sections`, `info_items`.
- Manager-editable sections (management contacts, phone numbers, hours,
  policies) rendered from markdown.
- **Done when:** managers edit info; residents view it, click-to-call phones.

### Stage 7 — Settings completion
- Preferred name, look-and-feel (theme/accent), notification preferences,
  Privacy Policy, Terms of Service, account/data controls.
- **Done when:** all settings persist and notif prefs actually gate emails.

### Stage 8 — Notifications hardening & PWA
- Resend-backed transactional emails via Edge Functions across all features.
- In-app notification center (Realtime + `notifications`).
- PWA manifest + service worker + Web Push (`push_subscriptions`, VAPID).
- **Done when:** users receive email + in-app + push notifications per prefs.

### Stage 9 — Admin & moderation tooling
- Member management (invite, approve, suspend, roles), building settings,
  category management, basic content moderation dashboard.
- **Done when:** an admin can run a building without touching the database.

### Stage 10 — Polish, hardening & launch
- Accessibility pass, empty/error/loading states, E2E coverage of critical
  flows, RLS test suite, performance & Supabase advisor cleanup, seed/demo data,
  production launch checklist.
- **Done when:** green CI, passing RLS/E2E tests, clean advisors, production
  deploy.

### Later (post-v1)
- Video attachments UI, richer search, direct messages, native mobile
  (React Native / Expo), payments/leasing integrations.

---

## 14. Open Questions (revisit before the relevant stage)
- How are buildings onboarded — self-serve or manually by the platform owner?
- Should residents be verifiable against a unit list at approval time?
- Retention/moderation policy for forum content and reporting/abuse handling.
- Do managers need CSV export of event sign-ups / maintenance history?
