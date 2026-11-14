-- Event times (core v4.16.4): everyone signed in can change when an event starts and ends,
-- for any event they can see. Only the times: the title, description and the rest stay
-- with the host and leads (the events update policy is unchanged).
-- An event from a linked calendar keeps a time changed here: the sync no longer overwrites
-- it (times_set_by marks it). Everything else on it still follows the calendar.
alter table public.events
  add column times_set_by uuid references public.user_profiles (id) on delete set null,
  add column times_set_at timestamptz;

create function public.event_set_times(p_event_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_all_day boolean default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  ev public.events;
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'sign in to change event times' using errcode = '42501';
  end if;
  select * into ev from public.events where id = p_event_id;
  -- Same rule as reading events: public ones, or any event for joining members and above
  -- (coalesce: a null role must mean "no")
  if not found or not (ev.is_public or coalesce((select private.my_role()) in ('joining', 'member', 'circle_lead', 'project_lead', 'advisor', 'admin'), false)) then
    raise exception 'event not found' using errcode = '42501';
  end if;
  if p_starts_at is null then
    raise exception 'an event needs a start time';
  end if;
  if p_ends_at is not null and p_ends_at < p_starts_at then
    raise exception 'the end can''t be before the start';
  end if;
  update public.events
  set starts_at = p_starts_at,
      ends_at = p_ends_at,
      all_day = coalesce(p_all_day, all_day),
      times_set_by = v_uid,
      times_set_at = now()
  where id = p_event_id;
end;
$$;
revoke execute on function public.event_set_times(uuid, timestamptz, timestamptz, boolean) from public, anon;
grant execute on function public.event_set_times(uuid, timestamptz, timestamptz, boolean) to authenticated;

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
    where x.uid is not null and x.starts_at is not null;

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

