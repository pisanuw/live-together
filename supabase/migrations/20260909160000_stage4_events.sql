-- Stage 4: events + sign-ups. All in the `wcv` schema. Manager CRUD and reads
-- go through the service role in Server Actions (building-scoped + authorized in
-- app code); the RLS SELECT policies are defense-in-depth. Sign-up / cancel run
-- through SECURITY DEFINER RPCs that lock the event row so capacity and the
-- waitlist stay correct under concurrent requests (no overbooking).

-- ---------------------------------------------------------------- events ----
create table wcv.events (
  id            uuid primary key default gen_random_uuid(),
  building_id   uuid not null references wcv.buildings(id) on delete cascade,
  created_by    uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  description   text not null default '',
  location      text,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  capacity      int check (capacity is null or capacity > 0),
  cover_path    text,
  is_published  boolean not null default false,
  cancelled_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index events_building_time_idx on wcv.events(building_id, starts_at);
create trigger events_set_updated_at before update on wcv.events
  for each row execute function wcv.set_updated_at();

-- --------------------------------------------------------- event_signups ----
create table wcv.event_signups (
  id           uuid primary key default gen_random_uuid(),
  building_id  uuid not null references wcv.buildings(id) on delete cascade,
  event_id     uuid not null references wcv.events(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'registered'
                 check (status in ('registered', 'waitlisted', 'cancelled')),
  guests_count int not null default 0 check (guests_count >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (event_id, user_id)
);
create index event_signups_event_idx on wcv.event_signups(event_id, status);
create index event_signups_user_idx on wcv.event_signups(user_id);
create trigger event_signups_set_updated_at before update on wcv.event_signups
  for each row execute function wcv.set_updated_at();

-- ---------------------------------------------------------------- grants ----
grant select on wcv.events, wcv.event_signups to anon, authenticated;
grant all on wcv.events, wcv.event_signups to service_role;

-- ------------------------------------------------------------------ RLS ----
alter table wcv.events        enable row level security;
alter table wcv.event_signups enable row level security;

-- Events: approved members see published events; managers also see drafts.
create policy events_select on wcv.events for select to authenticated
  using (
    wcv.is_approved_member(building_id)
    and (is_published or wcv.is_manager(building_id))
  );

-- Sign-ups: you see your own; managers see everyone's in their building.
create policy event_signups_select on wcv.event_signups for select to authenticated
  using (
    wcv.is_approved_member(building_id)
    and (user_id = (select auth.uid()) or wcv.is_manager(building_id))
  );

-- --------------------------------------------- concurrency-safe sign-up ----
-- Locks the event row (FOR UPDATE) so simultaneous requests can't overbook.
-- Seats used per registration = 1 + guests_count. Called by the service role
-- from an authorized Server Action, which passes the acting user's id.
create or replace function wcv.signup_for_event(
  p_event_id uuid, p_user_id uuid, p_guests int default 0
) returns wcv.event_signups
language plpgsql security definer set search_path = '' as $$
declare
  v_event  wcv.events;
  v_taken  int;
  v_status text;
  v_row    wcv.event_signups;
begin
  if p_guests < 0 then p_guests := 0; end if;

  select * into v_event from wcv.events where id = p_event_id for update;
  if not found then raise exception 'event_not_found'; end if;
  if v_event.cancelled_at is not null then raise exception 'event_cancelled'; end if;
  if not v_event.is_published then raise exception 'event_not_published'; end if;
  if coalesce(v_event.ends_at, v_event.starts_at) < now() then
    raise exception 'event_past';
  end if;

  select * into v_row from wcv.event_signups
    where event_id = p_event_id and user_id = p_user_id;

  -- Already actively signed up: just adjust guest count, keep the status.
  if v_row.id is not null and v_row.status in ('registered', 'waitlisted') then
    update wcv.event_signups set guests_count = p_guests
      where id = v_row.id returning * into v_row;
    return v_row;
  end if;

  if v_event.capacity is null then
    v_status := 'registered';
  else
    select coalesce(sum(1 + guests_count), 0) into v_taken
      from wcv.event_signups
      where event_id = p_event_id and status = 'registered'
        and user_id <> p_user_id;
    if v_taken + (1 + p_guests) <= v_event.capacity then
      v_status := 'registered';
    else
      v_status := 'waitlisted';
    end if;
  end if;

  if v_row.id is not null then  -- reactivating a previously cancelled sign-up
    update wcv.event_signups
      set status = v_status, guests_count = p_guests
      where id = v_row.id returning * into v_row;
  else
    insert into wcv.event_signups (building_id, event_id, user_id, status, guests_count)
      values (v_event.building_id, p_event_id, p_user_id, v_status, p_guests)
      returning * into v_row;
  end if;
  return v_row;
end;
$$;

-- Cancels a sign-up and promotes waitlisted members (oldest first) into any
-- seats that just opened, all under the event row lock.
create or replace function wcv.cancel_event_signup(p_event_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_event wcv.events;
  v_taken int;
  v_wl    wcv.event_signups;
begin
  select * into v_event from wcv.events where id = p_event_id for update;
  if not found then return; end if;

  update wcv.event_signups set status = 'cancelled'
    where event_id = p_event_id and user_id = p_user_id
      and status in ('registered', 'waitlisted');

  if v_event.capacity is not null then
    loop
      select coalesce(sum(1 + guests_count), 0) into v_taken
        from wcv.event_signups
        where event_id = p_event_id and status = 'registered';
      select * into v_wl from wcv.event_signups
        where event_id = p_event_id and status = 'waitlisted'
        order by created_at asc limit 1;
      exit when not found;
      exit when v_taken + (1 + v_wl.guests_count) > v_event.capacity;
      update wcv.event_signups set status = 'registered' where id = v_wl.id;
    end loop;
  end if;
end;
$$;

-- Only the service role invokes these (from authorized Server Actions).
revoke all on function wcv.signup_for_event(uuid, uuid, int) from public;
revoke all on function wcv.cancel_event_signup(uuid, uuid) from public;
grant execute on function wcv.signup_for_event(uuid, uuid, int) to service_role;
grant execute on function wcv.cancel_event_signup(uuid, uuid) to service_role;

-- ----------------------------------------------------- event media bucket ----
insert into storage.buckets (id, name, public)
values ('wcv-event-media', 'wcv-event-media', false)
on conflict (id) do nothing;
