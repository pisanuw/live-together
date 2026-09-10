-- Stage 5: maintenance requests + activity log. All in the `wcv` schema.
-- Reads/writes go through the service role in Server Actions (building-scoped +
-- authorized in app code); the RLS SELECT policies are defense-in-depth.

-- ------------------------------------------------- maintenance_requests ----
create table wcv.maintenance_requests (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references wcv.buildings(id) on delete cascade,
  created_by  uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text not null default '',
  category    text not null
    check (category in ('plumbing','electrical','appliance','common-area','other')),
  priority    text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),
  status      text not null default 'open'
    check (status in ('open','in_progress','resolved','closed','cancelled')),
  unit_id     uuid references wcv.units(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index maintenance_requests_building_idx
  on wcv.maintenance_requests(building_id, status, created_at desc);
create index maintenance_requests_creator_idx
  on wcv.maintenance_requests(created_by);
create trigger maintenance_requests_set_updated_at
  before update on wcv.maintenance_requests
  for each row execute function wcv.set_updated_at();

-- -------------------------------------------------- maintenance_updates ----
-- Activity log: comments and status changes. `is_internal` notes are visible
-- to managers only. A pure status change may have a null body.
create table wcv.maintenance_updates (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references wcv.buildings(id) on delete cascade,
  request_id  uuid not null references wcv.maintenance_requests(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  body        text,
  status_from text,
  status_to   text,
  is_internal boolean not null default false,
  created_at  timestamptz not null default now()
);
create index maintenance_updates_request_idx
  on wcv.maintenance_updates(request_id, created_at);

-- Photos on requests reuse the shared attachments table.
alter table wcv.attachments
  add column maintenance_request_id uuid
  references wcv.maintenance_requests(id) on delete cascade;
create index attachments_maintenance_idx
  on wcv.attachments(maintenance_request_id);

-- ---------------------------------------------------------------- grants ----
grant select on wcv.maintenance_requests, wcv.maintenance_updates
  to anon, authenticated;
grant all on wcv.maintenance_requests, wcv.maintenance_updates
  to service_role;

-- ------------------------------------------------------------------ RLS ----
alter table wcv.maintenance_requests enable row level security;
alter table wcv.maintenance_updates  enable row level security;

-- Requests: residents see their own; managers see all in their building.
create policy maintenance_requests_select on wcv.maintenance_requests
  for select to authenticated
  using (
    wcv.is_approved_member(building_id)
    and (created_by = (select auth.uid()) or wcv.is_manager(building_id))
  );

-- Updates: managers see everything; residents see non-internal updates on their
-- own requests.
create policy maintenance_updates_select on wcv.maintenance_updates
  for select to authenticated
  using (
    wcv.is_approved_member(building_id)
    and (
      wcv.is_manager(building_id)
      or (
        is_internal = false
        and exists (
          select 1 from wcv.maintenance_requests r
          where r.id = request_id and r.created_by = (select auth.uid())
        )
      )
    )
  );

-- --------------------------------------------------- maintenance bucket ----
insert into storage.buckets (id, name, public)
values ('wcv-maintenance-media', 'wcv-maintenance-media', false)
on conflict (id) do nothing;
