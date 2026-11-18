-- Meeting names, full second-brain notes and the sweep (v4.23.0).
-- The agent names each meeting "17.11.2026 <what it was about>" from the title people gave and the
-- content; what they called it stays in original_title. notes_version says which shape of note the
-- second brain has, so the sweep can rewrite older ones. The sweep finishes any meeting the
-- webhooks couldn't (a Worker only gets about 30 s after replying): every 10 minutes the database
-- calls the portal's /api/meetings/sweep, once the community stores its address and key in Vault:
--   select vault.create_secret('https://<portal>', 'myconet_url');
--   select vault.create_secret('<MEETINGS_SWEEP_SECRET>', 'meetings_sweep_secret');
-- Without them it does nothing.

alter table public.meeting_transcripts
  add column if not exists original_title text,
  add column if not exists notes_version integer,
  add column if not exists sweep_attempts integer not null default 0;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create or replace function private.meetings_sweep()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'myconet_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'meetings_sweep_secret';
  if v_url is null or v_key is null then
    return;
  end if;
  -- Only when there is something to do (keeps the portal quiet the rest of the time)
  if not exists (
    select 1 from public.meeting_transcripts
    where status = 'done' and sweep_attempts < 3
      -- 2 = NOTES_VERSION in web/src/modules/m18-meetings/lib/second-brain.ts
      and (processed_at is null or (needs_review = false and coalesce(notes_version, 0) < 2))
  ) then
    return;
  end if;
  perform net.http_post(
    url := rtrim(v_url, '/') || '/api/meetings/sweep',
    headers := jsonb_build_object('content-type', 'application/json', 'x-sweep-key', v_key),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
end;
$$;

revoke all on function private.meetings_sweep() from public, anon, authenticated;

select cron.schedule('myconet-meetings-sweep', '*/10 * * * *', 'select private.meetings_sweep()');
