-- Stage 3: forum. All in the `wcv` schema. Reads/writes go through the service
-- role in Server Actions (building-scoped + authorized in app code); the RLS
-- SELECT policies below are defense-in-depth for direct API access.

-- ------------------------------------------------------------ categories ----
create table wcv.categories (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references wcv.buildings(id) on delete cascade,
  slug        text not null,
  label       text not null,
  color       text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (building_id, slug)
);

-- ----------------------------------------------------------------- posts ----
create table wcv.posts (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references wcv.buildings(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  body        text not null default '',
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  edited_at   timestamptz,
  deleted_at  timestamptz
);
create index posts_building_feed_idx
  on wcv.posts(building_id, is_pinned desc, created_at desc);
create trigger posts_set_updated_at before update on wcv.posts
  for each row execute function wcv.set_updated_at();

-- ------------------------------------------------------- post_categories ----
create table wcv.post_categories (
  post_id     uuid not null references wcv.posts(id) on delete cascade,
  category_id uuid not null references wcv.categories(id) on delete cascade,
  building_id uuid not null references wcv.buildings(id) on delete cascade,
  primary key (post_id, category_id)
);
create index post_categories_category_idx on wcv.post_categories(category_id);

-- -------------------------------------------------------------- comments ----
create table wcv.comments (
  id                uuid primary key default gen_random_uuid(),
  building_id       uuid not null references wcv.buildings(id) on delete cascade,
  post_id           uuid not null references wcv.posts(id) on delete cascade,
  author_id         uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references wcv.comments(id) on delete cascade,
  body              text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  edited_at         timestamptz,
  deleted_at        timestamptz
);
create index comments_post_idx on wcv.comments(post_id, created_at);
create trigger comments_set_updated_at before update on wcv.comments
  for each row execute function wcv.set_updated_at();

-- ------------------------------------------------------------- reactions ----
create table wcv.reactions (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references wcv.buildings(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id   uuid not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  unique (target_type, target_id, user_id, emoji)
);
create index reactions_target_idx on wcv.reactions(target_type, target_id);

-- ----------------------------------------------------------- attachments ----
create table wcv.attachments (
  id           uuid primary key default gen_random_uuid(),
  building_id  uuid not null references wcv.buildings(id) on delete cascade,
  owner_id     uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  mime_type    text not null,
  kind         text not null default 'image' check (kind in ('image', 'video')),
  byte_size    int,
  post_id      uuid references wcv.posts(id) on delete cascade,
  comment_id   uuid references wcv.comments(id) on delete cascade,
  created_at   timestamptz not null default now()
);
create index attachments_post_idx on wcv.attachments(post_id);

-- ---------------------------------------------------------------- grants ----
grant select on
  wcv.categories, wcv.posts, wcv.post_categories,
  wcv.comments, wcv.reactions, wcv.attachments
  to anon, authenticated;
grant all on
  wcv.categories, wcv.posts, wcv.post_categories,
  wcv.comments, wcv.reactions, wcv.attachments
  to service_role;

-- ------------------------------------------------------------------ RLS ----
alter table wcv.categories      enable row level security;
alter table wcv.posts           enable row level security;
alter table wcv.post_categories enable row level security;
alter table wcv.comments        enable row level security;
alter table wcv.reactions       enable row level security;
alter table wcv.attachments     enable row level security;

create policy categories_select on wcv.categories for select to authenticated
  using (wcv.is_approved_member(building_id));
create policy posts_select on wcv.posts for select to authenticated
  using (wcv.is_approved_member(building_id));
create policy post_categories_select on wcv.post_categories for select to authenticated
  using (wcv.is_approved_member(building_id));
create policy comments_select on wcv.comments for select to authenticated
  using (wcv.is_approved_member(building_id));
create policy reactions_select on wcv.reactions for select to authenticated
  using (wcv.is_approved_member(building_id));
create policy attachments_select on wcv.attachments for select to authenticated
  using (wcv.is_approved_member(building_id));

-- ----------------------------------------------------- forum media bucket ----
insert into storage.buckets (id, name, public)
values ('wcv-forum-media', 'wcv-forum-media', false)
on conflict (id) do nothing;

-- --------------------------------------------------- realtime publication ----
-- Stream open forum threads to the client. Realtime honors the RLS SELECT
-- policies above, so subscribers only receive rows they may already read.
-- Guarded: no-op if realtime isn't set up or a table is already published.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table wcv.posts;
    alter publication supabase_realtime add table wcv.comments;
    alter publication supabase_realtime add table wcv.reactions;
  end if;
exception
  when duplicate_object then null;
end $$;

-- ------------------------------------------------ seed default categories ----
insert into wcv.categories (building_id, slug, label, color, sort_order)
select b.id, x.slug, x.label, x.color, x.ord
from wcv.buildings b
cross join (values
  ('general', 'General', '#64748b', 0),
  ('free-for-sale', 'Free & For Sale', '#16a34a', 1),
  ('event', 'Event', '#7c3aed', 2),
  ('lost-found', 'Lost & Found', '#d97706', 3),
  ('recommendation', 'Recommendation', '#0891b2', 4),
  ('safety', 'Safety', '#dc2626', 5)
) as x(slug, label, color, ord)
where b.slug = 'wcv'
on conflict (building_id, slug) do nothing;
