-- The community's look: logo (top bar) and banner image (landing page, Home,
-- Dashboard). Set by an admin in the Blueprint's Look & feel step.

-- One row per community (id is always true)
create table public.community_settings (
  id          boolean primary key default true check (id),
  logo_url    text check (length(logo_url) <= 1000),
  banner_url  text check (length(banner_url) <= 1000),
  updated_at  timestamptz not null default now()
);

alter table public.community_settings enable row level security;

create policy "community settings are public" on public.community_settings
  for select to anon, authenticated using (true);
create policy "admins add community settings" on public.community_settings
  for insert to authenticated with check ((select private.my_role()) = 'admin');
create policy "admins edit community settings" on public.community_settings
  for update to authenticated
  using ((select private.my_role()) = 'admin')
  with check ((select private.my_role()) = 'admin');

create trigger community_settings_touch_updated_at before update on public.community_settings
  for each row execute function public.touch_events_updated_at();

insert into public.community_settings (id) values (true) on conflict do nothing;

-- Public bucket for the images; only admins upload or replace them
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', true, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'])
on conflict (id) do nothing;

create policy "branding images are public" on storage.objects
  for select to public using (bucket_id = 'branding');
create policy "admins upload branding images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'branding' and (select private.my_role()) = 'admin');
create policy "admins replace branding images" on storage.objects
  for update to authenticated
  using (bucket_id = 'branding' and (select private.my_role()) = 'admin');
create policy "admins remove branding images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'branding' and (select private.my_role()) = 'admin');
