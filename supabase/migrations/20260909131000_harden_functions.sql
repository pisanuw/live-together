-- Address security-advisor findings for WCV-owned functions.

-- Pin the trigger function's search_path (0011_function_search_path_mutable).
alter function wcv.set_updated_at() set search_path = '';

-- The RLS helper policies are all `to authenticated`, so anon never needs to
-- execute these SECURITY DEFINER helpers. Revoke to minimize the RPC surface
-- once the `wcv` schema is exposed in the Data API.
revoke execute on function
  wcv.is_approved_member(uuid), wcv.member_role(uuid),
  wcv.is_manager(uuid), wcv.is_admin(uuid)
  from anon;
