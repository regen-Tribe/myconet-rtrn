-- proposer_update_proposals lets the proposer write any column, including status,
-- so a proposer could mark their own proposal passed or rejected. Status now
-- changes only by an admin, or by the proposer withdrawing an open proposal.
-- Passing and rejecting belong in a function that applies the vote rules.

create or replace function public.proposals_guard_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if (select private.my_role()) = 'admin' then
    return new;
  end if;
  -- Server-side jobs, the SQL editor and migrations (not the API roles) may still change it
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if new.status = 'withdrawn' and old.status = 'open' and old.proposer_id = (select auth.uid()) then
    return new;
  end if;
  raise exception 'Only an admin can change a proposal status' using errcode = '42501';
end
$$;

revoke execute on function public.proposals_guard_status() from public, anon, authenticated;

drop trigger if exists proposals_guard_status on public.proposals;

create trigger proposals_guard_status
  before update on public.proposals
  for each row execute function public.proposals_guard_status();
