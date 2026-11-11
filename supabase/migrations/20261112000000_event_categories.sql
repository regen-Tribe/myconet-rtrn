-- Daily events and categories (core v4.12.0). A fourth calendar, 'daily', for the
-- community's rhythm (meals, movement, focus hours), and an optional category on any
-- event ("Food", "Movement"). Linked calendars get rules that sort their events by
-- title: [{ "words": "breakfast, lunch", "kind": "daily", "category": "Food" }, ...];
-- the first rule whose words appear in the title wins, otherwise the feed's kind.
alter table public.events
  drop constraint events_kind_check,
  add constraint events_kind_check check (kind in ('core', 'community', 'task', 'daily')),
  add column category text check (length(trim(category)) between 1 and 40);

alter table public.calendar_feeds
  drop constraint calendar_feeds_kind_check,
  add constraint calendar_feeds_kind_check check (kind in ('core', 'community', 'task', 'daily')),
  add column rules jsonb not null default '[]' check (jsonb_typeof(rules) = 'array' and jsonb_array_length(rules) <= 50);

-- Daily events are posted by the same people as core events
drop policy "members can create events" on public.events;
create policy "members can create events" on public.events as permissive for insert to public
  with check (((created_by = ( SELECT auth.uid() AS uid)) AND (((kind = 'community'::text) AND (( SELECT private.my_role() AS my_role) = ANY (ARRAY['joining'::text, 'member'::text, 'circle_lead'::text, 'project_lead'::text, 'advisor'::text, 'admin'::text]))) OR ((kind = ANY (ARRAY['core'::text, 'daily'::text])) AND (( SELECT private.my_role() AS my_role) = ANY (ARRAY['member'::text, 'circle_lead'::text, 'project_lead'::text, 'advisor'::text, 'admin'::text]))))));

-- The claim now also returns the feed's rules (return type changes, so recreate)
drop function public.calendar_feeds_claim(text, interval, uuid);
create function public.calendar_feeds_claim(p_secret text, p_max_age interval default '1 hour', p_feed_id uuid default null)
 returns table (id uuid, url text, match_circles boolean, kind text, rules jsonb)
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
    returning f.id, f.url, f.match_circles, f.kind, f.rules;
end;
$$;
revoke execute on function public.calendar_feeds_claim(text, interval, uuid) from public;
grant execute on function public.calendar_feeds_claim(text, interval, uuid) to anon, authenticated;

-- Occurrences may now carry their own kind and category (from the feed's rules)
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
    online_url = excluded.online_url, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
    all_day = excluded.all_day, kind = excluded.kind, category = excluded.category,
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
