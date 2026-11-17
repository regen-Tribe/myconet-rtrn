-- Task data (v4.20.0): board tasks get a time, a circle and where they came from,
-- so the agent and meeting notes can add them properly and the calendar can show them.
-- Tasks stay on the task board; the calendar only *shows* dated tasks (no copies).

-- ── Tasks (deliverables) ────────────────────────────────────────────────────
alter table public.deliverables
  add column if not exists due_time time,
  add column if not exists circle text references public.circles (slug),
  add column if not exists source text not null default 'person',
  add column if not exists source_meeting_id uuid references public.meeting_transcripts (id) on delete set null,
  add column if not exists source_item text,
  add column if not exists needs_review boolean not null default false,
  add column if not exists created_by uuid default auth.uid() references auth.users (id) on delete set null;

comment on column public.deliverables.due_time is 'Time of day in the community''s local time; only with a due_date';
comment on column public.deliverables.circle is 'Defaults to the project''s circle';
comment on column public.deliverables.source is 'Who added it: person, agent, or meeting (a meeting action item)';
comment on column public.deliverables.needs_review is 'A draft (e.g. from a meeting) that a lead should confirm';

alter table public.deliverables drop constraint if exists deliverables_source_check;
alter table public.deliverables add constraint deliverables_source_check
  check (source in ('person', 'agent', 'meeting'));
alter table public.deliverables drop constraint if exists deliverables_time_needs_date;
alter table public.deliverables add constraint deliverables_time_needs_date
  check (due_time is null or due_date is not null);

create index if not exists deliverables_due_date_idx on public.deliverables (due_date) where due_date is not null;
create index if not exists deliverables_circle_idx on public.deliverables (circle);

-- A task's circle defaults to its project's circle
create or replace function private.deliverable_default_circle()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.circle is null then
    select p.circle into new.circle from public.projects p where p.id = new.project_id;
  end if;
  return new;
end
$$;

drop trigger if exists deliverables_default_circle on public.deliverables;
create trigger deliverables_default_circle
  before insert on public.deliverables
  for each row execute function private.deliverable_default_circle();

update public.deliverables d
   set circle = p.circle
  from public.projects p
 where p.id = d.project_id and d.circle is null and p.circle is not null;

-- ── Chores projects: one per circle, for one-off tasks ──────────────────────
alter table public.projects add column if not exists is_chores boolean not null default false;
create unique index if not exists projects_one_chores_per_circle on public.projects (circle) where is_chores;

-- The circle's chores project, made the first time someone adds a chore.
-- Same people who can add tasks (private.can_manage_project): admins, circle leads, project leads.
create or replace function public.chores_project(p_circle text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_id uuid;
  v_name text;
begin
  if coalesce((select private.my_role()), '') not in ('admin', 'circle_lead', 'project_lead') then
    raise exception 'Only admins, circle leads and project leads can add chores.' using errcode = '42501';
  end if;

  select id into v_id from public.projects where is_chores and circle = p_circle;
  if v_id is not null then
    return v_id;
  end if;

  select name into v_name from public.circles where slug = p_circle and archived_at is null;
  if v_name is null then
    raise exception 'There''s no circle "%".', p_circle using errcode = '22023';
  end if;

  insert into public.projects (title, description, status, open_for_collaborators, circle, is_chores, created_by)
  values (v_name || ' chores', 'One-off tasks for the ' || v_name || ' circle (clean-ups, repairs, errands).',
          'in_progress', false, p_circle, true, (select auth.uid()))
  on conflict (circle) where is_chores do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.projects where is_chores and circle = p_circle;
  end if;
  return v_id;
end
$$;

revoke all on function public.chores_project(text) from public, anon;
grant execute on function public.chores_project(text) to authenticated;
