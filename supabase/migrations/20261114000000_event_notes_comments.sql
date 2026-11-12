-- Event notes and comments (core v4.13.0).
-- Notes: events from a linked calendar (Google…) can't be edited here, so members add
-- their own description in `notes`, which calendar syncs never touch. Full members
-- (member and above) write it.
-- Comments: a thread under every event; signed-in people read it, full members write.
alter table public.events
  add column notes    text check (length(notes) <= 5000),
  add column notes_by uuid references public.user_profiles (id) on delete set null,
  add column notes_at timestamptz;

create function public.event_set_notes(p_event_id uuid, p_notes text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  ev public.events;
  v_role text := (select private.my_role());
begin
  select * into ev from public.events where id = p_event_id;
  if not found or ev.feed_id is null then
    raise exception 'notes are only for events from a linked calendar';
  end if;
  -- coalesce: for visitors my_role() is null, and null must mean "no"
  if not coalesce(v_role in ('member', 'circle_lead', 'project_lead', 'advisor', 'admin'), false) then
    raise exception 'not allowed to add notes to this event' using errcode = '42501';
  end if;
  update public.events
  set notes = nullif(left(trim(p_notes), 5000), ''),
      notes_by = case when nullif(trim(p_notes), '') is null then null else (select auth.uid()) end,
      notes_at = case when nullif(trim(p_notes), '') is null then null else now() end
  where id = p_event_id;
end;
$$;
revoke execute on function public.event_set_notes(uuid, text) from public, anon;
grant execute on function public.event_set_notes(uuid, text) to authenticated;

create table public.event_comments (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.user_profiles (id) on delete cascade,
  body       text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index event_comments_event_idx on public.event_comments (event_id, created_at);

alter table public.event_comments enable row level security;

-- Readable by signed-in people who can see the event (the events policy applies inside)
create policy "signed-in users read event comments" on public.event_comments
  for select to authenticated
  using (exists (select 1 from public.events e where e.id = event_comments.event_id));

create policy "full members comment on events" on public.event_comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and coalesce((select private.my_role()) in ('member', 'circle_lead', 'project_lead', 'advisor', 'admin'), false)
    and exists (select 1 from public.events e where e.id = event_comments.event_id)
  );

create policy "authors and admins delete event comments" on public.event_comments
  for delete to authenticated
  using (user_id = (select auth.uid()) or coalesce((select private.my_role()) = 'admin', false));
