-- Admins and a circle's leads edit that circle's lead list. Oscar: "add the ability for admin and circle leads to edit
-- the circle lead list". Until now only an admin could, from Admin › Permissions: guard_profile_privileges() refuses any
-- change to user_profiles.role or lead_circles by anyone else. This function makes that one change, after its own checks.
--
-- A lead is role circle_lead with the circle in lead_circles (fetchCircleDirectory, private.my_lead_circles()).
-- Adding: a member becomes circle_lead with the circle; someone already circle_lead gets the circle added. Admins lead
-- everything already, and other roles (project lead, advisor, joining, explorer) are changed in Admin › Permissions.
-- Removing: the circle comes off; with no circle left a circle_lead goes back to member. A lead (not an admin) can't
-- remove a circle's last lead. The leads_are_members trigger keeps circle membership in step, as for an admin's change.

create or replace function public.set_circle_lead(p_user uuid, p_circle text, p_lead boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_my_role text;
  v_my_circles text[];
  v_role text;
  v_circles text[];
  v_leads int;
begin
  if v_me is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  select role, coalesce(lead_circles, '{}') into v_my_role, v_my_circles from public.user_profiles where id = v_me;
  if not (coalesce(v_my_role, '') = 'admin' or (coalesce(v_my_role, '') = 'circle_lead' and p_circle = any (v_my_circles))) then
    raise exception 'Only an admin or a lead of this circle can change its leads' using errcode = '42501';
  end if;
  if not exists (select 1 from public.org_units where kind = 'circle' and circle = p_circle) then
    raise exception 'There is no circle "%"', p_circle using errcode = '22023';
  end if;

  select role, coalesce(lead_circles, '{}') into v_role, v_circles from public.user_profiles where id = p_user for update;
  if not found then
    raise exception 'That person isn''t on MyCoNet' using errcode = '22023';
  end if;

  if coalesce(p_lead, false) then
    if p_circle = any (v_circles) and v_role = 'circle_lead' then
      return;
    end if;
    if v_role not in ('member', 'circle_lead') then
      raise exception 'Only members can be made circle leads here (this person is %); an admin changes other roles in Admin › Permissions', v_role
        using errcode = '22023';
    end if;
    update public.user_profiles
       set role = 'circle_lead',
           lead_circles = case when p_circle = any (v_circles) then v_circles else array_append(v_circles, p_circle) end
     where id = p_user;
  else
    if v_role <> 'circle_lead' or not (p_circle = any (v_circles)) then
      return;
    end if;
    if coalesce(v_my_role, '') <> 'admin' then
      select count(*) into v_leads from public.user_profiles where role = 'circle_lead' and p_circle = any (lead_circles);
      if v_leads <= 1 then
        raise exception 'A circle keeps at least one lead. Add another lead first, or ask an admin' using errcode = '22023';
      end if;
    end if;
    update public.user_profiles
       set lead_circles = array_remove(v_circles, p_circle),
           role = case when cardinality(array_remove(v_circles, p_circle)) = 0 then 'member' else 'circle_lead' end
     where id = p_user;
  end if;
end;
$$;

revoke all on function public.set_circle_lead(uuid, text, boolean) from public, anon;
grant execute on function public.set_circle_lead(uuid, text, boolean) to authenticated;
