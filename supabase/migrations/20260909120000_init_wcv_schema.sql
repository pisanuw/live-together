-- WCV shares the "upvoteme" Supabase project with other applications.
-- To guarantee its tables never collide with theirs, WCV lives ENTIRELY in a
-- dedicated `wcv` schema. Nothing in WCV should ever touch the `public` schema.
--
-- NOTE: This migration is not auto-applied to the shared remote project. It is
-- applied in Stage 1 (via `supabase db push` / the MCP) after confirming, and
-- the `wcv` schema must also be added to the project's exposed Data API schemas
-- (Dashboard: Project Settings > API > Exposed schemas, or config) so the
-- anon/authenticated PostgREST clients can reach it.

create schema if not exists wcv;

comment on schema wcv is
  'West Complex Village (WCV) app. Isolated from other apps sharing this project.';

-- Let the API roles use the schema. Row access is still governed by RLS on each
-- table (added alongside the tables in later Stage 1 migrations).
grant usage on schema wcv to anon, authenticated, service_role;

-- Least privilege by default: future tables are readable (RLS still governs
-- WHICH rows), but writes are granted per-table only where client writes are
-- intended. Privileged writes go through the service_role (server-side).
alter default privileges in schema wcv
  grant select on tables to anon, authenticated;
alter default privileges in schema wcv
  grant all on tables to service_role;
