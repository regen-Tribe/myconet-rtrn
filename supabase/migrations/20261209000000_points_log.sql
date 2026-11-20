-- Points log (LEXICON.md: points). One row per award: who, how many, why, from what, who gave it.
-- A person's total is the sum of the rows that haven't been undone. Points are always recorded;
-- whether any screen shows them is the community's "points" switch (instance/config.jsonc modules).
-- Replaces the unused collaboration_agreements.points_value as the place points live; that column
-- stays as the number an agreement is worth, and accepting the agreement logs it here.

create table if not exists public.points_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  points integer not null check (points <> 0),
  reason text not null check (char_length(reason) between 1 and 500),
  source text not null check (source in ('agreement', 'task', 'event', 'manual')),
  source_id uuid,
  awarded_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  undone_at timestamptz,
  undone_by uuid references public.user_profiles(id) on delete set null,
  check (source = 'manual' or source_id is not null)
);

-- An agreement, task or event awards a person once
create unique index if not exists points_log_once
  on public.points_log (source, source_id, user_id) where source <> 'manual';
create index if not exists points_log_user on public.points_log (user_id) where undone_at is null;

alter table public.points_log enable row level security;

-- People see their own points; admins see everyone's
create policy points_log_read on public.points_log for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Admins award points by hand; every other award comes from the trigger below
create policy points_log_admin_award on public.points_log for insert to authenticated
  with check ((select public.is_admin()) and source = 'manual' and awarded_by = (select auth.uid()));

revoke all on public.points_log from anon;
revoke update, delete, truncate on public.points_log from authenticated;
grant select, insert on public.points_log to authenticated;

-- Undo an award (admins only). The row stays, so the history shows what was given and taken back.
create or replace function public.undo_points(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can undo points' using errcode = '42501';
  end if;
  update public.points_log set undone_at = now(), undone_by = auth.uid()
   where id = p_id and undone_at is null;
  if not found then
    raise exception 'No such award, or it was already undone' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.undo_points(uuid) from public, anon;
grant execute on function public.undo_points(uuid) to authenticated;

-- A person's total, readable by any signed-in member (for profiles and Achievements)
create or replace function public.points_total(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(points), 0)::integer from public.points_log where user_id = p_user and undone_at is null;
$$;

revoke all on function public.points_total(uuid) from public, anon;
grant execute on function public.points_total(uuid) to authenticated;

-- Accepting an agreement that's worth points logs them for the person who made it
create or replace function private.log_agreement_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' and coalesce(new.points_value, 0) <> 0 then
    insert into public.points_log (user_id, points, reason, source, source_id, awarded_by)
    values (new.user_id, new.points_value, 'Agreement accepted', 'agreement', new.id, auth.uid())
    on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.log_agreement_points() from public, anon, authenticated;

drop trigger if exists collaboration_agreements_points on public.collaboration_agreements;
create trigger collaboration_agreements_points
  after update of status on public.collaboration_agreements
  for each row execute function private.log_agreement_points();
