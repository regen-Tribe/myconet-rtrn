-- v4.76.0: a photo of its own for each bookable thing (a room, a bed, a tool), shown on its card and in its
-- window in Amenities & tools. Without one, the item shows the photo of the place its pin sits in (v4.75.0).
-- Photos live in the public `branding` bucket (admins upload there); the URL is stored here.
-- Who may change it: the existing booking_items policies (admins, and circle leads for their circles' items).

alter table public.booking_items add column if not exists photo_url text;

do $$ begin
  alter table public.booking_items add constraint booking_items_photo_url_https
    check (photo_url is null or photo_url ~ '^https://');
exception when duplicate_object then null; end $$;
