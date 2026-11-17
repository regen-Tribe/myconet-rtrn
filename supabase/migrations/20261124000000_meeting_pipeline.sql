-- Meeting pipeline (v4.21.0): when Fireflies' notes are in, the agent decides whether it's a
-- community meeting and which circle(s) it's about, drafts its tasks on the board, saves a note to
-- the community's second brain and emails the leads of the circles involved.
-- Rewrites the goals of Sonia's Protopia PR #53 on top of v4.20.0's task data.

-- ── Meetings: who can see them, and what the pipeline did ───────────────────
alter table public.meeting_transcripts
  add column if not exists visibility text not null default 'community',
  add column if not exists processed_at timestamptz,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_error text,
  add column if not exists tasks_drafted integer,
  add column if not exists notes_path text,
  add column if not exists notes_url text,
  add column if not exists notes_emailed_at timestamptz,
  add column if not exists notes_email_count integer,
  add column if not exists notes_email_error text,
  -- Who chose the circle (a person, or the agent from the meeting's content) and the agent's reason
  add column if not exists circle_source text,
  add column if not exists agent_note text;

alter table public.meeting_transcripts drop constraint if exists meeting_transcripts_circle_source_check;
alter table public.meeting_transcripts add constraint meeting_transcripts_circle_source_check
  check (circle_source is null or circle_source in ('person', 'agent'));

comment on column public.meeting_transcripts.visibility is
  'community: every member reads it; circle: only the circle''s members, its leads and admins';

alter table public.meeting_transcripts drop constraint if exists meeting_transcripts_visibility_check;
alter table public.meeting_transcripts add constraint meeting_transcripts_visibility_check
  check (visibility in ('community', 'circle'));

-- In a circle: a lead of it, or on one of its teams in the org chart
create or replace function private.in_circle(p_circle text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select p_circle is not null and (
    p_circle = any (coalesce((select lead_circles from public.user_profiles where id = (select auth.uid())), '{}'))
    or exists (
      select 1 from public.org_unit_members m join public.org_units u on u.id = m.unit_id
       where m.user_id = (select auth.uid()) and u.circle = p_circle
    )
  )
$$;
grant execute on function private.in_circle(text) to authenticated;

-- Circle-only meetings: on top of the existing "joining and above" rule
drop policy if exists meeting_transcripts_circle_only on public.meeting_transcripts;
create policy meeting_transcripts_circle_only on public.meeting_transcripts
  as restrictive for select to authenticated
  using (
    visibility = 'community'
    or (select private.my_role()) = 'admin'
    or (select private.in_circle(circle))
  );

-- ── Which meeting item became which task (no duplicates on a re-run) ─────────
-- item_key: the task's normalised title, so a re-run that words things the same way adds nothing.
create table if not exists public.meeting_action_links (
  meeting_id uuid not null references public.meeting_transcripts (id) on delete cascade,
  item_key text not null,
  item_index integer,
  item_text text not null,
  person_name text,
  assignee_id uuid references public.user_profiles (id) on delete set null,
  deliverable_id uuid references public.deliverables (id) on delete cascade,
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (meeting_id, item_key)
);
create index if not exists meeting_action_links_deliverable_idx on public.meeting_action_links (deliverable_id);
alter table public.meeting_action_links enable row level security;

-- Readable by whoever can read the meeting; written by the server (service role)
drop policy if exists meeting_action_links_select on public.meeting_action_links;
create policy meeting_action_links_select on public.meeting_action_links for select to authenticated
  using (exists (select 1 from public.meeting_transcripts t where t.id = meeting_id));

-- ── What the agent did, so a bad run can be seen and undone ──────────────────
create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- 'meeting-pipeline' now; later the chat agent, Claude via the API…
  actor text not null,
  requested_by uuid references auth.users (id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  meeting_id uuid references public.meeting_transcripts (id) on delete set null,
  detail jsonb not null default '{}',
  undone_at timestamptz
);
create index if not exists agent_actions_meeting_idx on public.agent_actions (meeting_id);
create index if not exists agent_actions_created_idx on public.agent_actions (created_at desc);
alter table public.agent_actions enable row level security;

drop policy if exists agent_actions_admin_read on public.agent_actions;
create policy agent_actions_admin_read on public.agent_actions for select to authenticated
  using ((select private.my_role()) = 'admin');

-- ── Chores for the server: the same as chores_project(), without a signed-in person ──
create or replace function private.ensure_chores_project(p_circle text, p_by uuid)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_id uuid;
  v_name text;
begin
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
          'in_progress', false, p_circle, true, p_by)
  on conflict (circle) where is_chores do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.projects where is_chores and circle = p_circle;
  end if;
  return v_id;
end
$$;

-- People keep using the checked version; it now shares the code above
create or replace function public.chores_project(p_circle text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
begin
  if coalesce((select private.my_role()), '') not in ('admin', 'circle_lead', 'project_lead') then
    raise exception 'Only admins, circle leads and project leads can add chores.' using errcode = '42501';
  end if;
  return private.ensure_chores_project(p_circle, (select auth.uid()));
end
$$;

-- The pipeline runs with the service role (no signed-in person)
create or replace function public.chores_project_for_server(p_circle text)
returns uuid
language sql
security definer
set search_path to ''
as $$ select private.ensure_chores_project(p_circle, null) $$;

revoke all on function public.chores_project_for_server(text) from public, anon, authenticated;
grant execute on function public.chores_project_for_server(text) to service_role;
