-- A circle's leads are its members (v4.38.1). Oscar: "if you are a lead of a circle, you are automatically a member".
-- Account leads live in user_profiles (role circle_lead + lead_circles); membership in org_unit_members of the
-- circle's unit. Whenever someone's leadership changes, they're in each circle they lead (as 'lead'); a circle they
-- stop leading keeps them as a member, so leaving is a separate choice.

create or replace function public.circle_leads_are_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now text[] := case when new.role = 'circle_lead' then coalesce(new.lead_circles, '{}') else '{}' end;
  v_was text[] := case when tg_op = 'UPDATE' and old.role = 'circle_lead' then coalesce(old.lead_circles, '{}') else '{}' end;
begin
  insert into public.org_unit_members (unit_id, user_id, role)
  select u.id, new.id, 'lead' from public.org_units u where u.kind = 'circle' and u.circle = any (v_now)
  on conflict (unit_id, user_id) do update set role = 'lead';
  -- No longer leading: still a member
  update public.org_unit_members m set role = 'member'
    from public.org_units u
   where m.unit_id = u.id and u.kind = 'circle' and m.user_id = new.id and m.role = 'lead'
     and u.circle = any (v_was) and not (u.circle = any (v_now));
  return null;
end;
$$;

drop trigger if exists circle_leads_are_members on public.user_profiles;
create trigger circle_leads_are_members after insert or update of role, lead_circles on public.user_profiles
  for each row execute function public.circle_leads_are_members();

-- Today's leads
insert into public.org_unit_members (unit_id, user_id, role)
select u.id, p.id, 'lead'
  from public.user_profiles p
  join public.org_units u on u.kind = 'circle' and u.circle = any (coalesce(p.lead_circles, '{}'))
 where p.role = 'circle_lead'
on conflict (unit_id, user_id) do update set role = 'lead';
