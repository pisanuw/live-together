-- Stage 2: per-user settings + avatars. All in the `wcv` schema / `wcv-*`
-- storage, isolated from the other apps on the shared project.

create table wcv.user_settings (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  theme       text not null default 'system' check (theme in ('system', 'light', 'dark')),
  accent      text not null default 'default',
  locale      text not null default 'en',
  notif_prefs jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger user_settings_set_updated_at before update on wcv.user_settings
  for each row execute function wcv.set_updated_at();

grant select on wcv.user_settings to authenticated;
grant all on wcv.user_settings to service_role;

alter table wcv.user_settings enable row level security;
create policy user_settings_select_self on wcv.user_settings for select to authenticated
  using (user_id = (select auth.uid()));

-- Private avatar bucket. Access is server-side only via the service role
-- (uploads + short-lived signed URLs), so no storage.objects policies are
-- added. Bucket id is `wcv-` prefixed since buckets are project-global.
insert into storage.buckets (id, name, public)
values ('wcv-avatars', 'wcv-avatars', false)
on conflict (id) do nothing;
