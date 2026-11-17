-- Meetings (core v4.19.0, Sonia's M18): meeting recordings transcribed and summarised by Fireflies.
-- An optional module, on where instance/config.jsonc lists "meetings". Protopia already has the
-- table and bucket (made by hand on 2026-11-16), so every statement here is safe to re-run.
create table if not exists public.meeting_transcripts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_date timestamptz,
  attendees text[] not null default '{}',
  audio_path text,
  fireflies_id text,
  status text not null default 'processing',
  summary text,
  action_items jsonb not null default '[]',
  transcript text,
  error text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null default 'app_upload',
  needs_review boolean not null default false,
  circle text
);
alter table public.meeting_transcripts enable row level security;

create or replace function public.touch_meeting_transcripts_updated_at()
 returns trigger
 language plpgsql
 set search_path to ''
as $$
begin new.updated_at = now(); return new; end
$$;
drop trigger if exists meeting_transcripts_touch on public.meeting_transcripts;
create trigger meeting_transcripts_touch before update on public.meeting_transcripts
  for each row execute function public.touch_meeting_transcripts_updated_at();

-- Reading: joining members and above, like the Meetings pages (coalesce: a null role means "no").
-- Writing goes through the server routes (service role); people can only add their own rows.
drop policy if exists meeting_transcripts_select on public.meeting_transcripts;
create policy meeting_transcripts_select on public.meeting_transcripts for select to authenticated
  using (coalesce((select private.my_role()) in ('joining', 'member', 'circle_lead', 'project_lead', 'advisor', 'admin'), false));
drop policy if exists meeting_transcripts_insert on public.meeting_transcripts;
create policy meeting_transcripts_insert on public.meeting_transcripts for insert to authenticated
  with check (created_by = (select auth.uid()));

-- Recordings: a private bucket, each person's files under their own id
insert into storage.buckets (id, name, public) values ('meeting-audio', 'meeting-audio', false)
  on conflict (id) do nothing;
drop policy if exists meeting_audio_insert on storage.objects;
create policy meeting_audio_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'meeting-audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists meeting_audio_select on storage.objects;
create policy meeting_audio_select on storage.objects for select to authenticated
  using (bucket_id = 'meeting-audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
