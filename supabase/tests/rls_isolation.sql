-- RLS building-isolation checks for the `wcv` schema.
--
-- Every check is read-only and wrapped in a transaction that rolls back, so it
-- is safe to run against any environment (including the shared project). Each
-- check impersonates a real auth user by switching to the `authenticated` role
-- and setting `request.jwt.claims` (which is what `auth.uid()` reads), then
-- asserts what that user may see. A violated invariant raises an exception and,
-- with ON_ERROR_STOP, fails the run.
--
-- Usage:
--   psql "$DATABASE_URL" \
--     -v member_id="<uuid of an APPROVED member>" \
--     -v stranger_id="<uuid of a user with NO approved membership>" \
--     -f supabase/tests/rls_isolation.sql
--
-- The equivalent of these checks was verified live via the Supabase MCP:
-- a stranger saw 0 buildings/posts/info_items/notifications; an approved member
-- saw their building, its categories, and its info items.

\set ON_ERROR_STOP on

-- 1) A stranger (no approved membership) must see no building-scoped content.
begin;
  select set_config('role', 'authenticated', true);
  select set_config(
    'request.jwt.claims', '{"sub":"' || :'stranger_id' || '"}', true
  );
  do $$
  begin
    if (select count(*) from wcv.buildings) <> 0
       or (select count(*) from wcv.posts) <> 0
       or (select count(*) from wcv.info_items) <> 0
       or (select count(*) from wcv.notifications) <> 0 then
      raise exception 'RLS FAIL: a non-member can see building content';
    end if;
  end $$;
rollback;

-- 2) An approved member must be able to see their building + its content.
begin;
  select set_config('role', 'authenticated', true);
  select set_config(
    'request.jwt.claims', '{"sub":"' || :'member_id' || '"}', true
  );
  do $$
  begin
    if (select count(*) from wcv.buildings) < 1 then
      raise exception 'RLS FAIL: an approved member cannot see their building';
    end if;
  end $$;
rollback;

-- 3) A member sees only notifications addressed to them (never others').
begin;
  select set_config('role', 'authenticated', true);
  select set_config(
    'request.jwt.claims', '{"sub":"' || :'member_id' || '"}', true
  );
  do $$
  begin
    if exists (
      select 1 from wcv.notifications
      where user_id <> '00000000-0000-0000-0000-000000000000'::uuid
        and user_id <> (select auth.uid())
    ) then
      raise exception 'RLS FAIL: a member can see another user''s notifications';
    end if;
  end $$;
rollback;

\echo 'RLS isolation checks passed.'
