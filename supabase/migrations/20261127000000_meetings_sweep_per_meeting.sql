-- The sweep, one meeting per call (v4.23.1): a Worker may make only 50 outside calls per request
-- (Cloudflare free plan), so the database now sends one request per waiting meeting (at most 5
-- every 10 minutes), each with its id. Without the Vault secrets it still does nothing.
create or replace function private.meetings_sweep()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_key text;
  v_id uuid;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'myconet_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'meetings_sweep_secret';
  if v_url is null or v_key is null then
    return;
  end if;
  for v_id in
    select id from public.meeting_transcripts
    where status = 'done' and sweep_attempts < 3
      -- 2 = NOTES_VERSION in web/src/modules/m18-meetings/lib/second-brain.ts
      and (processed_at is null or (needs_review = false and coalesce(notes_version, 0) < 2))
      and (processing_started_at is null or processing_started_at < now() - interval '10 minutes')
    order by created_at
    limit 5
  loop
    perform net.http_post(
      url := rtrim(v_url, '/') || '/api/meetings/sweep',
      headers := jsonb_build_object('content-type', 'application/json', 'x-sweep-key', v_key),
      body := jsonb_build_object('id', v_id),
      timeout_milliseconds := 300000
    );
  end loop;
end;
$$;

revoke all on function private.meetings_sweep() from public, anon, authenticated;
