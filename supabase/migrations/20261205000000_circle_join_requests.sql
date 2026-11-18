-- Asking to join a circle (v4.35.0). Oscar: a way to include people as circle members, including "join from my
-- profile" where a circle lead approves. A circle's members are org_unit_members of its circle unit (as before; the
-- Circles page, Ops › Circles and Admin › Users now add them directly). Someone who isn't a member can ask to join
-- from their profile; that circle's leads (and admins) approve or decline on the Circles page. Approving makes them
-- a member.

create table if not exists public.circle_join_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  circle text not null references public.circles (slug) on delete cascade,
  -- user_profiles, like org_unit_members, so the app can show who's asking
  user_id uuid not null default auth.uid() references public.user_profiles (id) on delete cascade,
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz
);
-- One open request per person and circle
create unique index if not exists circle_join_requests_one_open
  on public.circle_join_requests (circle, user_id) where status = 'pending';

alter table public.circle_join_requests enable row level security;

-- The person sees their own requests; a circle's leads and admins see the requests for that circle
drop policy if exists circle_join_read on public.circle_join_requests;
create policy circle_join_read on public.circle_join_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select private.can_lead_circle(circle)));

-- Anyone signed in asks for themselves
drop policy if exists circle_join_ask on public.circle_join_requests;
create policy circle_join_ask on public.circle_join_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and decided_by is null);

-- …and may withdraw a request that's still open
drop policy if exists circle_join_withdraw on public.circle_join_requests;
create policy circle_join_withdraw on public.circle_join_requests for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'pending');

-- Deciding goes through decide_circle_join(), which checks the lead and adds the member in one step
create or replace function public.decide_circle_join(p_request uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.circle_join_requests;
  v_unit uuid;
begin
  select * into v_req from public.circle_join_requests where id = p_request for update;
  if not found or v_req.status <> 'pending' then
    raise exception 'That request isn''t open any more' using errcode = '22023';
  end if;
  if not private.can_lead_circle(v_req.circle) then
    raise exception 'Only this circle''s leads and admins can decide' using errcode = '42501';
  end if;
  update public.circle_join_requests
     set status = case when p_approve then 'approved' else 'declined' end,
         decided_by = auth.uid(), decided_at = now()
   where id = p_request;
  if p_approve then
    select id into v_unit from public.org_units where kind = 'circle' and circle = v_req.circle;
    if v_unit is null then
      raise exception 'This circle has no place in the org chart yet' using errcode = '22023';
    end if;
    insert into public.org_unit_members (unit_id, user_id, role)
    values (v_unit, v_req.user_id, 'member')
    on conflict (unit_id, user_id) do nothing;
  end if;
end;
$$;

revoke all on function public.decide_circle_join(uuid, boolean) from public, anon;
grant execute on function public.decide_circle_join(uuid, boolean) to authenticated;

-- ── The second brain knows who's in each circle ──────────────────────────────
-- Someone joins or leaves a circle or one of its teams: that circle's space in the second brain (its README lists
-- members and teams) is refreshed by the next board review, as when the circle itself changes.
create or replace function public.org_members_request_brain_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.board_reviews (circle, requested_at, attempts)
  select u.circle, now(), 0 from public.org_units u where u.id = coalesce(new.unit_id, old.unit_id)
  on conflict (circle) do update set requested_at = now(), attempts = 0;
  return null;
end;
$$;

drop trigger if exists org_members_request_brain_update on public.org_unit_members;
create trigger org_members_request_brain_update after insert or update or delete on public.org_unit_members
  for each row execute function public.org_members_request_brain_update();
