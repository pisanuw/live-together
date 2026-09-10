-- Stage 8: in-app notifications + web-push subscriptions. All in the `wcv`
-- schema. Writes go through the service role; RLS SELECT policies limit each
-- user to their own rows (defense-in-depth). Notifications stream over Realtime.

-- --------------------------------------------------------- notifications ----
create table wcv.notifications (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references wcv.buildings(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx
  on wcv.notifications(user_id, created_at desc);
create index notifications_unread_idx
  on wcv.notifications(user_id) where read_at is null;

-- --------------------------------------------------- push_subscriptions ----
create table wcv.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  keys       jsonb not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on wcv.push_subscriptions(user_id);

-- ---------------------------------------------------------------- grants ----
grant select on wcv.notifications to anon, authenticated;
grant select on wcv.push_subscriptions to authenticated;
grant all on wcv.notifications, wcv.push_subscriptions to service_role;

-- ------------------------------------------------------------------ RLS ----
alter table wcv.notifications      enable row level security;
alter table wcv.push_subscriptions enable row level security;

create policy notifications_select on wcv.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy push_subscriptions_select on wcv.push_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

-- --------------------------------------------------- realtime publication ----
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table wcv.notifications;
  end if;
exception
  when duplicate_object then null;
end $$;
