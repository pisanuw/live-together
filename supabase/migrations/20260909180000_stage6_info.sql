-- Stage 6: info desk. Manager-editable static content per building, grouped
-- into sections. All in the `wcv` schema; writes go through the service role
-- in Server Actions, the RLS SELECT policies are defense-in-depth.

-- ---------------------------------------------------------- info_sections ----
create table wcv.info_sections (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references wcv.buildings(id) on delete cascade,
  slug        text not null,
  title       text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (building_id, slug)
);
create index info_sections_building_idx
  on wcv.info_sections(building_id, sort_order);

-- ------------------------------------------------------------- info_items ----
create table wcv.info_items (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references wcv.buildings(id) on delete cascade,
  section_id  uuid not null references wcv.info_sections(id) on delete cascade,
  title       text not null,
  body        text not null default '',
  phone       text,
  url         text,
  sort_order  int not null default 0,
  updated_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index info_items_section_idx on wcv.info_items(section_id, sort_order);
create trigger info_items_set_updated_at before update on wcv.info_items
  for each row execute function wcv.set_updated_at();

-- ---------------------------------------------------------------- grants ----
grant select on wcv.info_sections, wcv.info_items to anon, authenticated;
grant all on wcv.info_sections, wcv.info_items to service_role;

-- ------------------------------------------------------------------ RLS ----
alter table wcv.info_sections enable row level security;
alter table wcv.info_items    enable row level security;

create policy info_sections_select on wcv.info_sections for select to authenticated
  using (wcv.is_approved_member(building_id));
create policy info_items_select on wcv.info_items for select to authenticated
  using (wcv.is_approved_member(building_id));

-- -------------------------------------------------- seed default sections ----
insert into wcv.info_sections (building_id, slug, title, sort_order)
select b.id, x.slug, x.title, x.ord
from wcv.buildings b
cross join (values
  ('contacts', 'Management & Contacts', 0),
  ('hours', 'Hours & Access', 1),
  ('policies', 'Policies', 2),
  ('amenities', 'Amenities', 3)
) as x(slug, title, ord)
where b.slug = 'wcv'
on conflict (building_id, slug) do nothing;
