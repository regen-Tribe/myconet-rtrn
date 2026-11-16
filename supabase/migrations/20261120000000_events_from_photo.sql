-- Events from a photo (core v4.18.0): a photo of the community's schedule board is read by
-- the AI and its events added to the calendar after a review. Who can do it: admins, and the
-- people in the circle that hosts the calendar (its account leads, and anyone listed in that
-- circle or its teams on the Circles page). Admins pick that circle under Linked calendars.
alter table public.circles add column hosts_events boolean not null default false;

create function public.can_add_events_from_photo()
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $$
  -- coalesce: a null role must mean "no"
  select coalesce((select private.my_role()) = 'admin', false)
      or exists (
        select 1 from public.circles c
        where c.hosts_events and c.archived_at is null
          and (
            (coalesce((select private.my_role()) = 'circle_lead', false) and c.slug = any (coalesce((select private.my_lead_circles()), '{}')))
            or exists (
              select 1 from public.org_units u
              join public.org_unit_members m on m.unit_id = u.id
              where u.circle = c.slug and m.user_id = (select auth.uid())
            )
          )
      )
$$;
revoke execute on function public.can_add_events_from_photo() from public, anon;
grant execute on function public.can_add_events_from_photo() to authenticated;
