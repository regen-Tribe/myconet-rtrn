-- Tasks without a project (v4.34.0). Oscar: "its better that a task can be created without having any project
-- assigned". Until now every task had to be in a project, so a circle's one-off tasks lived in a hidden "chores"
-- project per circle. Now a task can simply have no project: it's on the main board, tagged with its circle, and its
-- pop-up can file it into a project (or a project's task back onto the board) and give it to one of the circle's
-- teams. Who may change a task is unchanged: private.can_manage_project(null) is the role check alone (admins,
-- circle leads, project leads), the same people who managed the chores tasks.

-- ── A task needs no project ──────────────────────────────────────────────────
alter table public.deliverables alter column project_id drop not null;

-- ── A task can be given to one of its circle's teams ─────────────────────────
alter table public.deliverables
  add column if not exists team_id uuid references public.org_units (id) on delete set null;
create index if not exists deliverables_team_idx on public.deliverables (team_id) where team_id is not null;

-- A team belongs to one circle: giving a task to a team puts it in that circle; moving a task to another circle
-- takes it off its team. Only teams (org_units of kind 'team'), not whole circles.
create or replace function private.deliverables_team_circle()
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
    raise exception 'A task can only be given to a team' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and new.circle is distinct from old.circle and new.team_id is not distinct from old.team_id then
    new.team_id := null;
  else
    new.circle := v_circle;
  end if;
  return new;
end;
$$;

drop trigger if exists deliverables_team_circle on public.deliverables;
create trigger deliverables_team_circle
  before insert or update of team_id, circle on public.deliverables
  for each row execute function private.deliverables_team_circle();

-- ── The chores projects go: their tasks move onto the board ──────────────────
-- Their tasks keep their circle (it was always set from the chores project's circle)
update public.deliverables d
   set project_id = null,
       circle = coalesce(d.circle, p.circle)
  from public.projects p
 where p.id = d.project_id and p.is_chores;

delete from public.projects where is_chores;

-- Nothing makes chores projects any more
drop function if exists public.chores_project(text);
drop function if exists public.chores_project_for_server(text);
