-- is_admin() was meant to mean "admin", but it also matched circle_lead and
-- project_lead, so every policy built on it gave leads admin rights. Narrow it,
-- then give circle leads exactly the join-application read the join screen needs.
--
-- Policies that call is_admin() and are now admin-only:
--   "admins can update any application"   (decisions stay admin-only)
--   "admins can update any profile"       (leads can no longer edit other profiles)

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_profiles
    where id = (select auth.uid()) and role = 'admin'
  )
$$;

-- Circle leads and admins review join applications (JoinAdminClient, isCircleAdmin).
drop policy if exists "admins can read all applications" on public.applications;

create policy "circle admins read applications" on public.applications
  for select to authenticated
  using ((select private.my_role()) in ('admin', 'circle_lead'));
