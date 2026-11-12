-- Password reset log (core v4.12.2). Supabase answers "sent" for addresses it doesn't
-- know, so a mistyped address fails silently. The portal's server now records each
-- reset request here: what was typed, whether it matched an account (or only a Gmail
-- spelling of one: Gmail ignores dots and +tags, Supabase doesn't) and any error.
-- Admins read it; rows are kept 30 days. Written only by the portal's server, with the
-- same server secret as calendar sync (CALENDAR_SYNC_SECRET).
create table public.auth_email_log (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('reset')),
  email_typed text not null check (length(email_typed) <= 320),
  -- the account with exactly this address
  user_id     uuid references auth.users (id) on delete cascade,
  -- no exact match, but a Gmail spelling of this account's address ("a.b@gmail.com")
  near_user_id uuid references auth.users (id) on delete cascade,
  ok          boolean not null,
  error       text check (length(error) <= 1000)
);
create index auth_email_log_created_at_idx on public.auth_email_log (created_at desc);

alter table public.auth_email_log enable row level security;

create policy "admins read the auth email log" on public.auth_email_log
  for select to authenticated
  using ((select private.my_role()) = 'admin');

-- "A.B+x@googlemail.com" → "ab@gmail.com"; other addresses are only lower-cased
create function private.gmail_key(p_email text)
 returns text
 language sql
 immutable
 set search_path to ''
as $$
  select case
    when split_part(lower(trim(p_email)), '@', 2) in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(lower(trim(p_email)), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else lower(trim(p_email))
  end;
$$;

create function public.auth_email_log_add(p_secret text, p_kind text, p_email text, p_ok boolean, p_error text default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  v_email text := left(lower(trim(p_email)), 320);
  v_user uuid;
  v_near uuid;
begin
  -- Only the portal's own server writes here; anyone else is ignored
  if p_secret is null or not exists (
    select 1 from private.calendar_sync_key k
    where k.hash = encode(extensions.digest(p_secret, 'sha256'), 'hex')) then
    return;
  end if;
  select u.id into v_user from auth.users u where lower(u.email) = v_email limit 1;
  if v_user is null then
    select u.id into v_near from auth.users u where private.gmail_key(u.email) = private.gmail_key(v_email) limit 1;
  end if;
  insert into public.auth_email_log (kind, email_typed, user_id, near_user_id, ok, error)
  values (p_kind, v_email, v_user, v_near, coalesce(p_ok, false), left(p_error, 1000));
  delete from public.auth_email_log where created_at < now() - interval '30 days';
end;
$$;

revoke execute on function private.gmail_key(text) from public;
revoke execute on function public.auth_email_log_add(text, text, text, boolean, text) from public;
grant execute on function public.auth_email_log_add(text, text, text, boolean, text) to anon, authenticated;
