# M19 — Map

The land with every place on it. Route: `/map` (in the v4 menu under Community, after Amenities & tools).

- **The picture** is the community's site plan or aerial photo: `community_settings.site_map_url`, the same
  one the Amenities map uses. Admins upload it in Admin › Bookings › Map.
- **Places** are rows in `places` (migration `supabase/migrations/20261211000000_places.sql`): `slug`, `name`,
  `kind`, `map_x` / `map_y` (percent of the picture), `photo_url`, `description`, plus an optional `circle`
  that looks after it and an optional task (`project_id`). Kinds: stay, space, amenity, garden, water,
  nature, gathering, other (`lib/places.ts › KIND_META` gives each a label, icon and pin colour).
- **Bookable things** stay in `booking_items`. One whose pin sits on a place (within 3% of the picture,
  `lib/places.ts › NEAR`) shows in that place's card ("Book …" / "To book here"); the others get their own pin.
- **A place's card** has its photo, kind and circle, the description, a booking button, the circle and the
  task. On a computer it opens beside the pin; on a phone under the map.
- **Who changes places:** admins, and circle leads for places of the circles they lead ("Edit places":
  add, edit, place or move the pin, remove). Photos go to the public `branding` bucket, so only admins can
  upload them. Everyone signed in reads.
- **Links:** `/map?place=<slug>` opens a place's card; `/map?kind=water` starts filtered.

The map itself (zoom, drag, pinch, the card, the list beside it) is the shared
`core/components/v4/SiteMap.tsx`, also behind the Amenities map (`m15-bookings/AmenitiesMap.tsx`).

**Importing places** (for example from the second brain): insert rows by `slug` with
`on conflict (slug) do update` for the fields you own. Never add a second row for the same place.

**Second brain:** places aren't written to the second brain yet. Follow-up: a `places/` note per place
(front matter: kind, circle, visibility `members`, a link to `/map?place=<slug>`), updated in place.
