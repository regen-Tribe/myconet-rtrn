-- Projects belong to a team, or to the whole circle (v4.37.0). Oscar: "there should be a link between the teams that
-- are added to circles and projects that are created - they should be able to be tagged to a team in a circle or
-- the circle alone". projects.team_id → org_units (teams only), like deliverables.team_id (v4.34.0): a team sets
-- the project's circle, and moving the project to another circle takes it off its team. A new task in a project
-- starts on the project's team.

alter table public.projects
  add column if not exists team_id uuid references public.org_units (id) on delete set null;
create index if not exists projects_team_idx on public.projects (team_id) where team_id is not null;

-- The same rule as for tasks (private.deliverables_team_circle), for projects
create or replace function private.projects_team_circle()
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
    raise exception 'A project can only be given to a team' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and new.circle is distinct from old.circle and new.team_id is not distinct from old.team_id then
    new.team_id := null;
  else
    new.circle := v_circle;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_team_circle on public.projects;
create trigger projects_team_circle
  before insert or update of team_id, circle on public.projects
  for each row execute function private.projects_team_circle();

-- A new task in a project starts on its team (and the task's own team rule then applies)
create or replace function private.deliverable_default_team()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.team_id is null and new.project_id is not null then
    select p.team_id into new.team_id from public.projects p where p.id = new.project_id;
  end if;
  return new;
end;
$$;

-- Named to run before deliverables_team_circle (triggers fire in name order)
drop trigger if exists deliverables_default_team on public.deliverables;
create trigger deliverables_default_team
  before insert on public.deliverables
  for each row execute function private.deliverable_default_team();
