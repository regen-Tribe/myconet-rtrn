-- Portal assistant (core v4.6.0): a chat that answers from the community's Blueprint
-- answers and the documents it uploads.

-- The community's document library. Each document is either shareable (the assistant
-- may use it for anyone) or for leads (admins and circle leads only: finances,
-- internal agreements, personal details). RLS does the filtering, so the assistant
-- only ever sees what the person asking may see.
create table public.community_documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(trim(title)) between 1 and 200),
  file_name   text check (length(file_name) <= 300),
  visibility  text not null check (visibility in ('everyone', 'leads')),
  -- Plain text with [Page N] markers, so answers can cite pages
  content     text not null check (length(content) <= 2000000),
  pages       integer,
  uploaded_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.community_documents enable row level security;

create policy "shareable documents are readable" on public.community_documents
  for select to anon, authenticated
  using (visibility = 'everyone' or (select private.my_role()) in ('admin', 'circle_lead'));
create policy "leads add documents" on public.community_documents
  for insert to authenticated
  with check ((select private.my_role()) in ('admin', 'circle_lead'));
create policy "leads edit documents" on public.community_documents
  for update to authenticated
  using ((select private.my_role()) in ('admin', 'circle_lead'))
  with check ((select private.my_role()) in ('admin', 'circle_lead'));
create policy "leads remove documents" on public.community_documents
  for delete to authenticated
  using ((select private.my_role()) in ('admin', 'circle_lead'));

create trigger community_documents_touch_updated_at before update on public.community_documents
  for each row execute function public.touch_events_updated_at();

-- Question counter: visitors get 2 questions before signing in, signed-in people a
-- daily cap. The server calls this with a hashed key (visitor's IP or the user id);
-- calling it directly only ever adds to a count, so there's nothing to gain.
create table private.assistant_usage (
  key          text primary key,
  count        integer not null default 0,
  window_start timestamptz not null default now()
);

create function public.assistant_count_question(p_key text, p_window_hours integer)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $$
declare v_count integer;
begin
  if p_key is null or length(p_key) > 128 or p_window_hours not between 1 and 8760 then
    raise exception 'bad key or window';
  end if;
  insert into private.assistant_usage as u (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update set
    count = case when u.window_start < now() - make_interval(hours => p_window_hours) then 1 else u.count + 1 end,
    window_start = case when u.window_start < now() - make_interval(hours => p_window_hours) then now() else u.window_start end
  returning count into v_count;
  return v_count;
end $$;
revoke execute on function public.assistant_count_question(text, integer) from public;
grant execute on function public.assistant_count_question(text, integer) to anon, authenticated;
