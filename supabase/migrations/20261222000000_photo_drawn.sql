-- A picture that is a drawing, not a photo of the thing (v4.116.0).
-- Some communities fill a card with an illustration until someone takes a real photo. Those cards go to the
-- end of Amenities & tools, after the ones with a photo. Uploading a photo in the app clears the mark.
alter table public.booking_items add column if not exists photo_drawn boolean not null default false;
alter table public.places add column if not exists photo_drawn boolean not null default false;

comment on column public.booking_items.photo_drawn is 'photo_url is an illustration standing in for a photo: the card sorts last';
comment on column public.places.photo_drawn is 'photo_url is an illustration standing in for a photo: the card sorts last';
