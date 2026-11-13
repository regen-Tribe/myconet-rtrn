-- Growth & Healing privacy (core v4.14.1). Fears and traumas move out of user_bio
-- (readable by everyone signed in) into user_growth, where each person chooses who
-- sees them. Each level includes the ones after it:
--   anyone        everyone, including visitors who aren't signed in
--   explorers     everyone who has signed up
--   joining       joining members and above
--   full_members  full members and above (the default)
--   only_me       nobody else
create table public.user_growth (
  user_id    uuid primary key references public.user_profiles (id) on delete cascade,
  fears      text check (length(fears) <= 5000),
  traumas    text check (length(traumas) <= 5000),
  visibility text not null default 'full_members'
             check (visibility in ('anyone', 'explorers', 'joining', 'full_members', 'only_me')),
  updated_at timestamptz not null default now()
);

alter table public.user_growth enable row level security;

create policy "owners manage their growth" on public.user_growth
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- coalesce: for visitors my_role() is null, and null must mean "no"
create policy "people the owner chose read growth" on public.user_growth
  for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or visibility = 'anyone'
    or ((select auth.uid()) is not null and (
         visibility = 'explorers'
         or (visibility = 'joining' and coalesce((select private.my_role()) in ('joining', 'member', 'circle_lead', 'project_lead', 'advisor', 'admin'), false))
         or (visibility = 'full_members' and coalesce((select private.my_role()) in ('member', 'circle_lead', 'project_lead', 'advisor', 'admin'), false))))
  );

grant select on public.user_growth to anon;

-- Existing answers keep the default (full members), which is narrower than before
insert into public.user_growth (user_id, fears, traumas)
select b.user_id, nullif(b.fears, ''), nullif(b.traumas, '')
from public.user_bio b
join public.user_profiles p on p.id = b.user_id
where coalesce(b.fears, '') <> '' or coalesce(b.traumas, '') <> '';

alter table public.user_bio drop column fears, drop column traumas;
