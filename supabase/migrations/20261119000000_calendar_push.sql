-- Google Calendar push (core v4.17.0). MyCoNet changes go to the linked Google calendar:
--   - a time changed here on an event from that calendar (event_set_times) is changed in Google;
--   - public events made in MyCoNet are added to the calendar marked push_new_events, and
--     their later edits and deletion follow.
-- The portal's server does the Google calls with a service account. It records the Google
-- ids through calendar_push_mark(), allowed only with CALENDAR_SYNC_SECRET (or for an admin),
-- and members can't set those ids themselves.

alter table public.events
  add column google_event_id text,
  add column google_ical_uid text;

alter table public.calendar_feeds
  add column push_new_events boolean not null default false;

-- Only the portal's server sets the Google ids (through calendar_push_mark, which runs as the owner)
create function private.events_keep_google_ids()
 returns trigger
 language plpgsql
 set search_path to ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.google_event_id := null;
      new.google_ical_uid := null;
    else
      new.google_event_id := old.google_event_id;
      new.google_ical_uid := old.google_ical_uid;
    end if;
  end if;
  return new;
end;
$$;

create trigger events_keep_google_ids
  before insert or update on public.events
  for each row execute function private.events_keep_google_ids();

create function public.calendar_push_mark(p_secret text, p_event_id uuid, p_google_event_id text, p_google_ical_uid text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $$
begin
  if not private.can_sync_calendars(p_secret) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.events
  set google_event_id = nullif(left(p_google_event_id, 1024), ''),
      google_ical_uid = nullif(left(p_google_ical_uid, 1024), '')
  where id = p_event_id;
end;
$$;
revoke execute on function public.calendar_push_mark(text, uuid, text, text) from public;
grant execute on function public.calendar_push_mark(text, uuid, text, text) to anon, authenticated;

-- The linked calendars, for the server's push (calendar_feeds is admin-only to read)
create function public.calendar_push_feeds(p_secret text)
 returns table (id uuid, url text, push_new_events boolean)
 language plpgsql
 stable
 security definer
 set search_path to ''
as $$
begin
  if not private.can_sync_calendars(p_secret) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query select f.id, f.url, f.push_new_events from public.calendar_feeds f;
end;
$$;
revoke execute on function public.calendar_push_feeds(text) from public;
grant execute on function public.calendar_push_feeds(text) to anon, authenticated;

create or replace function public.calendar_feed_apply(p_secret text, p_feed_id uuid, p_events jsonb, p_from timestamptz, p_to timestamptz, p_error text default null)
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
      (select c.slug from public.circles c where c.slug = x.circle) as circle,
      case when x.kind in ('core', 'community', 'task', 'daily') then x.kind else feed.kind end as kind,
      nullif(left(trim(x.category), 40), '') as category
    from jsonb_to_recordset(p_events) as x(uid text, title text, description text, location text, online_url text,
                                           starts_at timestamptz, ends_at timestamptz, all_day boolean, circle text,
                                           kind text, category text)
    where x.uid is not null and x.starts_at is not null
      -- Events made in MyCoNet and added to Google come back in the feed: MyCoNet keeps them, so skip them
      and not exists (select 1 from public.events p where p.google_ical_uid is not null
                      and (x.uid = p.google_ical_uid or x.uid like p.google_ical_uid || '#%'));

  insert into public.events (title, description, location, online_url, starts_at, ends_at, all_day,
                             kind, category, is_public, circle, created_by, feed_id, external_uid)
  select i.title, i.description, i.location, i.online_url, i.starts_at, i.ends_at, i.all_day,
         i.kind, i.category, feed.is_public, i.circle, feed.created_by, feed.id, i.uid
  from pg_temp.incoming i
  on conflict (feed_id, external_uid) do update set
    title = excluded.title, description = excluded.description, location = excluded.location,
    online_url = excluded.online_url,
    -- A time someone changed here (event_set_times) stays; the rest still follows the calendar
    starts_at = case when events.times_set_by is null then excluded.starts_at else events.starts_at end,
    ends_at = case when events.times_set_by is null then excluded.ends_at else events.ends_at end,
    all_day = case when events.times_set_by is null then excluded.all_day else events.all_day end,
    kind = excluded.kind, category = excluded.category,
    is_public = excluded.is_public, circle = excluded.circle
  where (events.title, events.description, events.location, events.online_url, events.starts_at, events.ends_at,
         events.all_day, events.kind, events.category, events.is_public, events.circle)
    is distinct from (excluded.title, excluded.description, excluded.location, excluded.online_url, excluded.starts_at,
                      excluded.ends_at, excluded.all_day, excluded.kind, excluded.category, excluded.is_public, excluded.circle);

  delete from public.events e
  where e.feed_id = p_feed_id and e.starts_at >= p_from and e.starts_at < p_to
    and not exists (select 1 from pg_temp.incoming i where i.uid = e.external_uid);

  select count(*) into n from pg_temp.incoming;
  update public.calendar_feeds set last_error = null, last_count = n, last_synced_at = now() where id = p_feed_id;
  return n;
end;
$$;
