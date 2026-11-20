-- Places on the map (v4.70.0): the Map page shows the community's picture of the land (the same
-- community_settings.site_map_url as the Amenities map) with a pin for every place on it, not only
-- the bookable ones: houses and rooms, shared spaces, gardens, water, forest, meeting spots.
--
-- One row per place. Kept simple on purpose, so a list from the second brain drops straight in:
-- slug, name, kind, map_x/map_y, photo_url, description; plus an optional circle that looks after it
-- and an optional task. Bookable things stay in booking_items: a booking item whose pin sits on a
-- place shows in that place's card ("To book here"), so nothing is stored twice.
--
-- Who: every signed-in person reads; admins add, edit and remove; circle leads for places of the
-- circles they lead (as with booking items). Photos go to the public `branding` bucket (admins).

create table if not exists public.places (
  id          uuid primary key default gen_random_uuid(),
  -- A stable key for imports (e.g. from the second brain): lowercase letters, numbers, dashes
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  name        text not null check (length(trim(name)) between 1 and 80),
  kind        text not null default 'other'
              check (kind in ('stay', 'space', 'amenity', 'garden', 'water', 'nature', 'gathering', 'other')),
  description text check (length(description) <= 2000),
  photo_url   text check (length(photo_url) <= 1000),
  map_x       real,
  map_y       real,
  circle      text references public.circles(slug) on update cascade on delete set null,
  project_id  uuid references public.projects(id) on delete set null,
  sort_order  integer not null default 0,
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint places_map_pin_check check (
    (map_x is null and map_y is null)
    or (map_x is not null and map_y is not null and map_x between 0 and 100 and map_y between 0 and 100)
  )
);

comment on table public.places is 'Places on the Map page (v4.70.0): a pin on the picture of the land, with a photo and a short description.';
comment on column public.places.kind is 'stay, space, amenity, garden, water, nature, gathering or other (the pin''s icon and colour).';
comment on column public.places.map_x is 'Pin: percent from the left of the picture (0–100), or null when not placed yet.';
comment on column public.places.map_y is 'Pin: percent from the top of the picture (0–100), or null when not placed yet.';

create index if not exists places_circle_idx on public.places (circle);
create index if not exists places_project_idx on public.places (project_id);

alter table public.places enable row level security;

drop policy if exists "members see places" on public.places;
create policy "members see places" on public.places
  for select to authenticated using (true);

drop policy if exists "leads add places" on public.places;
create policy "leads add places" on public.places
  for insert to authenticated
  with check (
    (select private.my_role()) = 'admin'
    or ((select private.my_role()) = 'circle_lead' and circle = any (private.my_lead_circles()))
  );

drop policy if exists "leads edit places" on public.places;
create policy "leads edit places" on public.places
  for update to authenticated
  using (
    (select private.my_role()) = 'admin'
    or ((select private.my_role()) = 'circle_lead' and circle = any (private.my_lead_circles()))
  )
  with check (
    (select private.my_role()) = 'admin'
    or ((select private.my_role()) = 'circle_lead' and circle = any (private.my_lead_circles()))
  );

drop policy if exists "leads remove places" on public.places;
create policy "leads remove places" on public.places
  for delete to authenticated
  using (
    (select private.my_role()) = 'admin'
    or ((select private.my_role()) = 'circle_lead' and circle = any (private.my_lead_circles()))
  );

grant select, insert, update, delete on public.places to authenticated;

-- updated_at follows every edit (the same trigger function as booking_items and events)
drop trigger if exists places_touch_updated_at on public.places;
create trigger places_touch_updated_at before update on public.places
  for each row execute function public.touch_events_updated_at();
