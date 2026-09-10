# WCV — Launch checklist

Pre-launch steps to take a fresh deploy of West Complex Village live. WCV runs
inside the shared `upvoteme` Supabase project, isolated to the `wcv` schema and
`wcv-*` storage buckets.

## 1. Supabase dashboard (one-time, manual)

- [ ] **Expose the schema:** Project Settings → API → **Exposed schemas** →
      add `wcv`. Required for the app's Supabase clients to read/write.
- [ ] **Google provider:** Auth → Providers → Google → set client ID/secret;
      add redirect URL `${SITE_URL}/auth/callback`.
- [ ] **Magic link template:** Auth → Email Templates → Magic Link → point the
      link at `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
      (WCV also sends magic links via Resend, bypassing shared SMTP.)
- [ ] **Redirect URLs:** Auth → URL Configuration → add the site URL(s)
      (local, deploy-preview, production).

## 2. Environment variables (Netlify: production + deploy-preview)

- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (server only — never client)
- [ ] `NEXT_PUBLIC_SITE_URL` (exact deployed origin; used for auth + email links)
- [ ] `RESEND_API_KEY`, `EMAIL_FROM` (transactional email + magic links)
- [ ] `SUPERADMIN_SECRET` (guards `/bootstrap` for the first admin)
- [ ] _Later (Web Push):_ `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

## 3. Database

- [ ] All migrations in `supabase/migrations/` applied (Stages 1–8). Verify with
      `list_migrations` / the Supabase CLI.
- [ ] Advisors clean for `wcv`: run security + performance advisors; there
      should be **no WARN/ERROR** attributable to `wcv` objects. (Residual INFO
      items — unindexed low-selectivity FKs, unused indexes on new/empty tables —
      are acceptable. Any WARNs shown belong to other apps in the shared
      `public` schema, or are project-wide auth settings.)
- [ ] Optional starter content: `supabase/seed.sql` adds a few info-desk items.

## 4. First admin & data

- [ ] Bootstrap the first admin via `/bootstrap` with `SUPERADMIN_SECRET`
      (or seed a membership directly). Admins then invite/approve everyone else.
- [ ] Confirm the seeded building (`wcv`) and forum categories exist.

## 5. Verify the critical flows

- [ ] Invited email → sign in → lands approved; a stranger is held at `/pending`.
- [ ] Forum: post, comment, reply, react, tag, filter, attach an image.
- [ ] Events: manager creates/publishes; resident signs up; capacity waitlists;
      cancel promotes the waitlist; appears in My Events.
- [ ] Maintenance: file with photo → manager triages → status notifications.
- [ ] Notifications: in-app bell updates live; emails arrive per prefs.
- [ ] Settings: theme, accent, notification prefs, data export.
- [ ] PWA installs (manifest + service worker) on a supported browser.

## 6. CI / deploy

- [ ] GitHub Actions green: lint → typecheck → unit tests → build, plus E2E.
- [ ] Netlify build succeeds on the Next.js runtime; connect git auto-deploy.

## Done since v1 scope

- **Web Push** — `web-push` sender wired into `notify()`, a Settings
  enable/disable toggle, service-worker handlers, and VAPID keys in env
  (requires `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`; set in Netlify).
- **Timezone-aware event times** — stored as UTC, rendered in the building's
  IANA timezone.
- **RLS isolation test** — `supabase/tests/rls_isolation.sql` (runnable via psql;
  behavior also verified live).

## Deferred (post-launch)

- Richer search, direct messages, multi-building switcher, video attachments.
- Wiring `supabase/tests/rls_isolation.sql` into CI (needs a DB connection).
