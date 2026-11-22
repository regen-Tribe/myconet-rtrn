-- People an admin adds for someone (a guest with a stay, say) can wait for approval
-- before they show up in Members, search and the people counts. Their bookings and
-- their place in the bookings calendar are untouched.
--
-- `approved` is true for everyone unless an admin sets it otherwise, so nothing
-- changes for a community that doesn't use it. It is a listing switch, not a
-- security boundary: the row stays readable (the calendar and pickers need the name).

alter table public.user_profiles
  add column if not exists approved boolean not null default true;

comment on column public.user_profiles.approved is
  'false = added by an admin and not yet approved: left out of Members, search and counts. Only admins change it.';

-- Visitors read a fixed set of columns (20261115000100_public_profiles.sql); the
-- public pages filter on this one, so they must be allowed to read it.
grant select (approved) on public.user_profiles to anon;

-- Only an admin approves. Same guard that protects role and lead_circles.
create or replace function public.guard_profile_privileges()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if (select private.my_role()) = 'admin' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.role := 'explorer';
    new.lead_circles := '{}';
    new.approved := true;
    return new;
  end if;
  if new.role is distinct from old.role or new.lead_circles is distinct from old.lead_circles then
    raise exception 'Only an admin can change roles or circle leadership' using errcode = '42501';
  end if;
  if new.approved is distinct from old.approved then
    raise exception 'Only an admin can approve a profile' using errcode = '42501';
  end if;
  return new;
end $function$;
