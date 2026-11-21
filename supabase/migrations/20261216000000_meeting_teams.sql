-- Meetings can belong to a subcircle (v4.108.0). Oscar: "set subcircles for meetings also so subcircles get their
-- transcripts in their section". meeting_transcripts.team_id → org_units (subcircles only), like projects.team_id
-- (v4.37.0): a subcircle sets the meeting's circle, and moving the meeting to another circle takes it off its subcircle.
-- Who may set it: the existing meeting rules (the lead actions route, as the person).

alter table public.meeting_transcripts
  add column if not exists team_id uuid references public.org_units (id) on delete set null;
create index if not exists meeting_transcripts_team_idx on public.meeting_transcripts (team_id) where team_id is not null;

create or replace function private.meeting_team_circle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_circle text;
  v_kind text;
begin
  if new.team_id is null then
    return new;
  end if;
  select u.circle, u.kind into v_circle, v_kind from public.org_units u where u.id = new.team_id;
  if v_kind is distinct from 'team' then
    raise exception 'A meeting can only be given to a subcircle' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and new.circle is distinct from old.circle and new.team_id is not distinct from old.team_id then
    new.team_id := null;
  else
    new.circle := v_circle;
  end if;
  return new;
end;
$$;

drop trigger if exists meeting_transcripts_team_circle on public.meeting_transcripts;
create trigger meeting_transcripts_team_circle
  before insert or update of team_id, circle on public.meeting_transcripts
  for each row execute function private.meeting_team_circle();
