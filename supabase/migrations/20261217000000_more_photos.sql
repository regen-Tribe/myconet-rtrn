-- More than one photo for a bookable thing and for a place on the Map.
-- `photo_url` stays the cover (cards, pins); `photos` holds the rest, in order, shown as a strip you swipe through
-- in the item's window and the place's card. https only, like the cover. Who may change them: the existing
-- policies of each table.

alter table public.booking_items add column if not exists photos text[] not null default '{}';
alter table public.places add column if not exists photos text[] not null default '{}';
