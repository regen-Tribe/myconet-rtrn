-- Log of questions asked to the portal assistant (core v4.9.0). Admins review it in
-- Admin › Questions; questions the community's material couldn't answer are flagged
-- (answered = false) so the Blueprint or documents can be filled in.
create table public.assistant_questions (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- null for visitors who aren't signed in
  user_id    uuid references auth.users (id) on delete set null,
  question   text not null check (length(question) between 1 and 2000),
  answer     text check (length(answer) <= 8000),
  answered   boolean not null,
  status     text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  admin_note text check (length(admin_note) <= 1000),
  updated_at timestamptz not null default now()
);

create index assistant_questions_created_idx on public.assistant_questions (created_at desc);

alter table public.assistant_questions enable row level security;

-- Only admins read and triage the log; rows are written by the function below
create policy "admins read questions" on public.assistant_questions
  for select to authenticated using ((select private.my_role()) = 'admin');
create policy "admins triage questions" on public.assistant_questions
  for update to authenticated
  using ((select private.my_role()) = 'admin')
  with check ((select private.my_role()) = 'admin');

create trigger assistant_questions_touch_updated_at before update on public.assistant_questions
  for each row execute function public.touch_events_updated_at();

-- Called by /api/assistant after each answer, as the person who asked (or a visitor)
create function public.assistant_log_question(p_question text, p_answer text, p_answered boolean)
 returns void
 language sql
 security definer
 set search_path to ''
as $$
  insert into public.assistant_questions (user_id, question, answer, answered)
  values (auth.uid(), left(p_question, 2000), left(p_answer, 8000), coalesce(p_answered, true));
$$;
revoke execute on function public.assistant_log_question(text, text, boolean) from public;
grant execute on function public.assistant_log_question(text, text, boolean) to anon, authenticated;
