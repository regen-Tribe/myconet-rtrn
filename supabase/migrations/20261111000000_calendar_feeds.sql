-- Calendar feeds (core v4.11.0): an admin links an iCal feed (e.g. a Google Calendar)
-- and its events appear on the community calendar. The portal reads the feed, expands
-- repeating events for the next 90 days and hands them to calendar_feed_apply(), which
-- adds new occurrences, updates changed ones and removes ones the feed no longer has.
-- Sync is run by the portal's server (it knows the sync secret) or by an admin.
create table public.calendar_feeds (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(trim(name)) between 1 and 120),
  -- may be a secret link (Google's "secret address"), so only admins can read it
  url            text not null check (url ~ '^https://' and length(url) <= 2000),
  kind           text not null default 'core' check (kind in ('core', 'community', 'task')),
  is_public      boolean not null default false,
  -- put "Farming Circle" etc. in the matching circle
  match_circles  boolean not null default true,
  enabled        boolean not null default true,
  last_synced_at timestamptz,
  last_count     int,
  last_error     text check (length(last_error) <= 1000),
  created_by     uuid not null default auth.uid() references public.user_profiles (id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.calendar_feeds enable row level security;

create policy "admins manage calendar feeds" on public.calendar_feeds
  for all to authenticated
  using ((select private.my_role()) = 'admin')
  with check ((select private.my_role()) = 'admin');

create trigger calendar_feeds_touch_updated_at before update on public.calendar_feeds
  for each row execute function public.touch_events_updated_at();

-- Events that came from a feed: removing the feed removes its events
alter table public.events
  add column feed_id      uuid references public.calendar_feeds (id) on delete cascade,
  add column external_uid text check (length(external_uid) <= 1000),
  add constraint events_feed_uid_key unique (feed_id, external_uid);

-- sha256 of the portal server's CALENDAR_SYNC_SECRET (one row; set during setup)
create table private.calendar_sync_key (
  id   boolean primary key default true check (id),
  hash text not null
);

create function private.can_sync_calendars(p_secret text)
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $$
  -- coalesce: for visitors my_role() is null, and null must mean "no"
  select coalesce((select private.my_role()) = 'admin', false)
    or (p_secret is not null and exists (
      select 1 from private.calendar_sync_key k
      where k.hash = encode(extensions.digest(p_secret, 'sha256'), 'hex')));
$$;

-- Claims the feeds that are due (never synced, or not within p_max_age) and returns
-- them; claiming stamps last_synced_at so overlapping page loads don't sync twice.
-- p_feed_id syncs that one feed now, whatever its age.
create function public.calendar_feeds_claim(p_secret text, p_max_age interval default '1 hour', p_feed_id uuid default null)
 returns table (id uuid, url text, match_circles boolean)
 language plpgsql
 security definer
 set search_path to ''
as $$
begin
  if not private.can_sync_calendars(p_secret) then
    raise exception 'not allowed to sync calendars' using errcode = '42501';
  end if;
  return query
    update public.calendar_feeds f set last_synced_at = now()
    where f.enabled
      and (case when p_feed_id is not null then f.id = p_feed_id
                else f.last_synced_at is null or f.last_synced_at < now() - p_max_age end)
    returning f.id, f.url, f.match_circles;
end;
$$;

-- Applies one feed's occurrences between p_from and p_to. p_events is a JSON array of
-- { uid, title, description, location, online_url, starts_at, ends_at, all_day, circle }.
-- Occurrences in the window that aren't in p_events are removed (cancelled in the
-- source); past ones outside the window are kept. With p_error, only records the error.
create function public.calendar_feed_apply(p_secret text, p_feed_id uuid, p_events jsonb, p_from timestamptz, p_to timestamptz, p_error text default null)
 returns int
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  feed public.calendar_feeds;
  n int;
begin
  if not private.can_sync_calendars(p_secret) then
    raise exception 'not allowed to sync calendars' using errcode = '42501';
  end if;
  select * into feed from public.calendar_feeds where id = p_feed_id;
  if not found then
    raise exception 'calendar feed not found';
  end if;
  if p_error is not null then
    update public.calendar_feeds set last_error = left(p_error, 1000) where id = p_feed_id;
    return 0;
  end if;
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 5000 then
    raise exception 'p_events must be an array of at most 5000 events';
  end if;

  drop table if exists pg_temp.incoming;
  create temporary table incoming on commit drop as
    select distinct on (x.uid)
      left(x.uid, 1000) as uid,
      coalesce(nullif(left(trim(x.title), 300), ''), '(untitled)') as title,
      nullif(left(x.description, 10000), '') as description,
      nullif(left(x.location, 500), '') as location,
      case when x.online_url ~ '^https?://' then left(x.online_url, 2000) end as online_url,
      x.starts_at,
      case when x.ends_at >= x.starts_at then x.ends_at end as ends_at,
      coalesce(x.all_day, false) as all_day,
      (select c.slug from public.circles c where c.slug = x.circle) as circle
    from jsonb_to_recordset(p_events) as x(uid text, title text, description text, location text, online_url text,
                                           starts_at timestamptz, ends_at timestamptz, all_day boolean, circle text)
    where x.uid is not null and x.starts_at is not null;

  insert into public.events (title, description, location, online_url, starts_at, ends_at, all_day,
                             kind, is_public, circle, created_by, feed_id, external_uid)
  select i.title, i.description, i.location, i.online_url, i.starts_at, i.ends_at, i.all_day,
         feed.kind, feed.is_public, i.circle, feed.created_by, feed.id, i.uid
  from pg_temp.incoming i
  on conflict (feed_id, external_uid) do update set
    title = excluded.title, description = excluded.description, location = excluded.location,
    online_url = excluded.online_url, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
    all_day = excluded.all_day, kind = excluded.kind, is_public = excluded.is_public, circle = excluded.circle
  where (events.title, events.description, events.location, events.online_url, events.starts_at, events.ends_at,
         events.all_day, events.kind, events.is_public, events.circle)
    is distinct from (excluded.title, excluded.description, excluded.location, excluded.online_url, excluded.starts_at,
                      excluded.ends_at, excluded.all_day, excluded.kind, excluded.is_public, excluded.circle);

  delete from public.events e
  where e.feed_id = p_feed_id and e.starts_at >= p_from and e.starts_at < p_to
    and not exists (select 1 from pg_temp.incoming i where i.uid = e.external_uid);

  select count(*) into n from pg_temp.incoming;
  update public.calendar_feeds set last_error = null, last_count = n, last_synced_at = now() where id = p_feed_id;
  return n;
end;
$$;

revoke execute on function private.can_sync_calendars(text) from public;
revoke execute on function public.calendar_feeds_claim(text, interval, uuid) from public;
revoke execute on function public.calendar_feed_apply(text, uuid, jsonb, timestamptz, timestamptz, text) from public;
-- Called by the portal's server with a visitor's (or no) session, guarded by the secret
grant execute on function public.calendar_feeds_claim(text, interval, uuid) to anon, authenticated;
grant execute on function public.calendar_feed_apply(text, uuid, jsonb, timestamptz, timestamptz, text) to anon, authenticated;
