-- Stage 1: tenancy + auth foundation. ALL objects live in the `wcv` schema.
-- Depends on 20260909120000_init_wcv_schema.sql (creates schema `wcv`).
--
-- Access model:
--   * Reads: authenticated client via PostgREST, gated by the RLS SELECT
--     policies below (requires `wcv` in the project's exposed Data API schemas).
--   * Writes: performed server-side with the service_role key (which bypasses
--     RLS) inside authorized Server Actions — so no INSERT/UPDATE/DELETE grants
--     or policies are given to anon/authenticated here.

-- ---------------------------------------------------------------- enums ----
create type wcv.membership_role as enum ('resident', 'manager', 'admin');
create type wcv.membership_status as enum ('pending', 'approved', 'rejected', 'suspended');

-- ------------------------------------------------------ updated_at helper ----
create or replace function wcv.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------ buildings ----
create table wcv.buildings (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  address    text,
  timezone   text not null default 'America/Los_Angeles',
  settings   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger buildings_set_updated_at before update on wcv.buildings
  for each row execute function wcv.set_updated_at();

-- ---------------------------------------------------------------- units ----
create table wcv.units (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references wcv.buildings(id) on delete cascade,
  label       text not null,
  created_at  timestamptz not null default now(),
  unique (building_id, label)
);
create index units_building_idx on wcv.units(building_id);

-- ------------------------------------------------------------- profiles ----
-- One row per auth user (id === auth.users.id). Created lazily by the app on
-- first login (we intentionally do NOT add a trigger to the shared auth.users).
create table wcv.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  preferred_name text,
  avatar_url     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger profiles_set_updated_at before update on wcv.profiles
  for each row execute function wcv.set_updated_at();

-- ---------------------------------------------------------- memberships ----
create table wcv.memberships (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references wcv.buildings(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        wcv.membership_role   not null default 'resident',
  status      wcv.membership_status not null default 'pending',
  unit_id     uuid references wcv.units(id) on delete set null,
  invited_by  uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (building_id, user_id)
);
create index memberships_user_idx on wcv.memberships(user_id);
create index memberships_building_status_idx on wcv.memberships(building_id, status);
create trigger memberships_set_updated_at before update on wcv.memberships
  for each row execute function wcv.set_updated_at();

-- --------------------------------------------------------------- invites ----
create table wcv.invites (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references wcv.buildings(id) on delete cascade,
  email       text not null,
  role        wcv.membership_role not null default 'resident',
  invited_by  uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at  timestamptz not null default (now() + interval '30 days'),
  created_at  timestamptz not null default now()
);
create index invites_building_idx on wcv.invites(building_id);
-- At most one outstanding invite per (building, email).
create unique index invites_pending_email_idx
  on wcv.invites(building_id, lower(email)) where accepted_at is null;

-- ---------------------------------------------------------------- grants ----
-- Read-only for API roles; all writes go through service_role (server-side).
grant select on wcv.buildings, wcv.units, wcv.profiles, wcv.memberships
  to anon, authenticated;
grant select on wcv.invites to authenticated;
grant all on wcv.buildings, wcv.units, wcv.profiles, wcv.memberships, wcv.invites
  to service_role;

-- --------------------------------------------- helper functions (RLS) ----
-- SECURITY DEFINER so they bypass RLS internally and never recurse when called
-- from a policy on wcv.memberships. Fully schema-qualified (search_path = '').
create or replace function wcv.is_approved_member(bid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from wcv.memberships m
    where m.building_id = bid and m.user_id = auth.uid() and m.status = 'approved'
  );
$$;

create or replace function wcv.member_role(bid uuid)
returns wcv.membership_role language sql stable security definer set search_path = '' as $$
  select m.role from wcv.memberships m
  where m.building_id = bid and m.user_id = auth.uid() and m.status = 'approved'
  limit 1;
$$;

create or replace function wcv.is_manager(bid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from wcv.memberships m
    where m.building_id = bid and m.user_id = auth.uid()
      and m.status = 'approved' and m.role in ('manager', 'admin')
  );
$$;

create or replace function wcv.is_admin(bid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from wcv.memberships m
    where m.building_id = bid and m.user_id = auth.uid()
      and m.status = 'approved' and m.role = 'admin'
  );
$$;

grant execute on function
  wcv.is_approved_member(uuid), wcv.member_role(uuid),
  wcv.is_manager(uuid), wcv.is_admin(uuid)
  to anon, authenticated, service_role;

-- ------------------------------------------------------------------ RLS ----
alter table wcv.buildings   enable row level security;
alter table wcv.units       enable row level security;
alter table wcv.profiles    enable row level security;
alter table wcv.memberships enable row level security;
alter table wcv.invites     enable row level security;

-- buildings: visible to approved members.
create policy buildings_select on wcv.buildings for select to authenticated
  using (wcv.is_approved_member(id));

-- units: visible to approved members of the building.
create policy units_select on wcv.units for select to authenticated
  using (wcv.is_approved_member(building_id));

-- profiles: your own, plus profiles of members in buildings you manage.
create policy profiles_select_self on wcv.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_select_managed on wcv.profiles for select to authenticated
  using (exists (
    select 1 from wcv.memberships m
    where m.user_id = wcv.profiles.id and wcv.is_manager(m.building_id)
  ));

-- memberships: your own rows, or any row in a building you manage.
create policy memberships_select on wcv.memberships for select to authenticated
  using (user_id = (select auth.uid()) or wcv.is_manager(building_id));

-- invites: only managers/admins of the building can read them (they hold
-- email addresses). No permissive policy for others => default deny.
create policy invites_select_managed on wcv.invites for select to authenticated
  using (wcv.is_manager(building_id));

-- ----------------------------------------------------------------- seed ----
insert into wcv.buildings (slug, name, timezone)
values ('wcv', 'West Complex Village', 'America/Los_Angeles')
on conflict (slug) do nothing;
