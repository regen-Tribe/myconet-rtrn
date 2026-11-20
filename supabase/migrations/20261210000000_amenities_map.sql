-- Amenities map (v4.43.0): a picture of the land (an aerial photo or a drawn site plan) and a pin for
-- each bookable thing, so Amenities & tools can show where everything is.
--
-- No new policies: the picture lives on the one community_settings row (admins edit it, everyone
-- reads it, as with the logo and banner), and a pin is two columns on booking_items, so the existing
-- "leads edit items" policy decides who may place it (admins, and circle leads for their items).

alter table public.community_settings
  add column if not exists site_map_url text check (length(site_map_url) <= 1000);

comment on column public.community_settings.site_map_url is
  'Picture of the land for the Amenities map (public branding bucket). Admins set it in Admin › Bookings › Map.';

alter table public.booking_items
  add column if not exists map_x real,
  add column if not exists map_y real;

alter table public.booking_items drop constraint if exists booking_items_map_pin_check;
alter table public.booking_items add constraint booking_items_map_pin_check check (
  (map_x is null and map_y is null)
  or (map_x between 0 and 100 and map_y between 0 and 100)
);

comment on column public.booking_items.map_x is 'Pin on the Amenities map: percent from the left of the picture (0–100), or null.';
comment on column public.booking_items.map_y is 'Pin on the Amenities map: percent from the top of the picture (0–100), or null.';
