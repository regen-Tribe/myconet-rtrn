-- Fix for 20261210000000_amenities_map.sql (v4.43.1): its pin check let a half pin through
-- (map_x set, map_y null), because a CHECK that comes out NULL counts as passed. Now both
-- coordinates are set and between 0 and 100, or both are empty.

alter table public.booking_items drop constraint if exists booking_items_map_pin_check;
alter table public.booking_items add constraint booking_items_map_pin_check check (
  (map_x is null and map_y is null)
  or (map_x is not null and map_y is not null and map_x between 0 and 100 and map_y between 0 and 100)
);
