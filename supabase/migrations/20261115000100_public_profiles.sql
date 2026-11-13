-- Public profiles (core v4.14.0; based on Max Sivry's "hide member bios and roles
-- from visitors"). Logged-out visitors see a short public card for each person: name,
-- photo, headline, a public bio and their website and social links. Everything else
-- (location, who they are in the network, values, skills, personality, offers,
-- requests, travel, role) is for people who have signed up.
--
-- The public pages that show leads, voter counts and proposal progress read those
-- through the functions below, which return only what those screens display.

-- New public fields, written by the person on Profile › Edit
alter table public.user_profiles
  add column public_bio  text check (length(public_bio) <= 1000),
  add column website_url text check (website_url ~ '^https?://' and length(website_url) <= 300),
  add column instagram   text check (length(instagram) <= 300),
  add column linkedin    text check (length(linkedin) <= 300),
  add column twitter     text check (length(twitter) <= 300);

-- Profiles: visitors get the public card columns only. Column grants, not RLS,
-- because RLS filters rows and cannot hide a column. Signed-in people keep everything.
revoke select on public.user_profiles from anon;
grant select (id, username, first_name, last_name, avatar_url, headline,
              public_bio, website_url, instagram, linkedin, twitter, created_at)
  on public.user_profiles to anon;

-- Bios (values, skills, personality, goals…): signed-in people only
drop policy if exists "Anyone can view bios" on public.user_bio;
create policy "signed-in users read bios" on public.user_bio
  for select to authenticated
  using (true);
revoke select on public.user_bio from anon;

-- Offers and requests: signed-in people only
drop policy if exists "Offers: public read" on public.user_offers;
create policy "signed-in users read offers" on public.user_offers
  for select to authenticated
  using (true);
revoke select on public.user_offers from anon;

drop policy if exists "Anyone can view requests" on public.user_requests;
create policy "signed-in users read requests" on public.user_requests
  for select to authenticated
  using (true);
revoke select on public.user_requests from anon;

-- Home, the org chart, and ops name the admins and circle leads. This returns
-- only those people, not every member's role.
create function public.public_circle_directory()
returns table (
  id uuid,
  first_name text,
  username text,
  role text,
  lead_circles text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.first_name, p.username, p.role, p.lead_circles
  from public.user_profiles p
  where p.role in ('admin', 'circle_lead')
  order by p.first_name
$$;

revoke all on function public.public_circle_directory() from public;
grant execute on function public.public_circle_directory() to anon, authenticated;

-- Governance shows how many people can vote. The count does not list them.
create function public.eligible_voter_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.user_profiles
  where role in ('member', 'circle_lead', 'project_lead', 'advisor', 'admin')
$$;

revoke all on function public.eligible_voter_count() from public;
grant execute on function public.eligible_voter_count() to anon, authenticated;

-- The public governance board scores open proposals by the voter's role.
-- Roles are returned only for people who voted on an open proposal.
create function public.open_proposal_voter_roles()
returns table (
  proposal_id uuid,
  user_id uuid,
  role text
)
language sql
stable
security definer
set search_path = ''
as $$
  select v.proposal_id, v.user_id, p.role
  from public.proposal_votes v
  join public.user_profiles p on p.id = v.user_id
  join public.proposals pr on pr.id = v.proposal_id
  where pr.status = 'open'
$$;

revoke all on function public.open_proposal_voter_roles() from public;
grant execute on function public.open_proposal_voter_roles() to anon, authenticated;
