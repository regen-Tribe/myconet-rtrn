-- v4.79.0: circle seals. Each circle can name a glyph for its seal (core/components/v4/circle-glyphs.ts).
-- Null shows the circle's initial. Who may change it: the existing "admins edit circles" policy.
alter table public.circles add column if not exists icon text;

alter table public.circles drop constraint if exists circles_icon_check;
alter table public.circles add constraint circles_icon_check
  check (icon is null or icon ~ '^[a-z][a-z0-9-]{0,31}$');

comment on column public.circles.icon is 'Glyph on the circle seal (circle-glyphs.ts key, e.g. wheat); null shows the initial';
