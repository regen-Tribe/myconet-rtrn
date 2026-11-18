-- The project manager (v4.25.0): when new tasks come in for a circle, the MyCoNet agent reviews that
-- circle's whole board like a project manager. Safe things it does itself, logged in agent_actions
-- and undoable (merge duplicate drafts it made, file a task into a project when very sure); the rest
-- it suggests here for the circle's leads to accept or dismiss (new projects, merges or moves of
-- confirmed tasks, who could take a task). The database asks for a review every 10 minutes for each
-- circle that's waiting (the same Vault secrets as the meetings sweep).

-- ── Suggestions for the leads ────────────────────────────────────────────────
create table if not exists public.agent_suggestions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  circle text not null,
  -- merge: { keep, drop } · move: { task, project } · new_project: { title, description, tasks[] }
  -- assign: { task, person_id, person }
  kind text not null check (kind in ('merge', 'move', 'new_project', 'assign')),
  payload jsonb not null default '{}',
  reason text,
  status text not null default 'open' check (status in ('open', 'accepted', 'dismissed', 'stale')),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  source_meeting_id uuid references public.meeting_transcripts (id) on delete set null
);
create index if not exists agent_suggestions_open_idx on public.agent_suggestions (circle) where status = 'open';
alter table public.agent_suggestions enable row level security;
-- Everyone signed in sees the board, so they may see what's suggested for it; leads decide through
-- the server (/api/ops/suggestions), which checks they lead the circle
drop policy if exists agent_suggestions_read on public.agent_suggestions;
create policy agent_suggestions_read on public.agent_suggestions for select to authenticated using (true);

-- ── Which circles wait for a review ──────────────────────────────────────────
create table if not exists public.board_reviews (
  circle text primary key,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  attempts integer not null default 0,
  last_error text
);
alter table public.board_reviews enable row level security;
-- Server only (service role); admins may look
drop policy if exists board_reviews_admin_read on public.board_reviews;
create policy board_reviews_admin_read on public.board_reviews for select to authenticated
  using ((select private.my_role()) = 'admin');

-- Agent actions can be undone from the board: who undid it
alter table public.agent_actions
  add column if not exists undone_by uuid references auth.users (id) on delete set null;

create or replace function private.board_review_sweep()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_key text;
  v_circle text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'myconet_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'meetings_sweep_secret';
  if v_url is null or v_key is null then
    return;
  end if;
  -- One request per circle (a Worker may make only 50 outside calls per request)
  for v_circle in
    select circle from public.board_reviews
    where (reviewed_at is null or reviewed_at < requested_at) and attempts < 3
    order by requested_at
    limit 5
  loop
    perform net.http_post(
      url := rtrim(v_url, '/') || '/api/ops/board-review',
      headers := jsonb_build_object('content-type', 'application/json', 'x-sweep-key', v_key),
      body := jsonb_build_object('circle', v_circle),
      timeout_milliseconds := 300000
    );
  end loop;
end;
$$;

revoke all on function private.board_review_sweep() from public, anon, authenticated;

-- A few minutes after the meetings sweep, so a meeting's tasks are on the board first
select cron.schedule('myconet-board-review', '5-59/10 * * * *', 'select private.board_review_sweep()');
