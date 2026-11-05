-- Supabase security advisor fixes (core v4.2.1).

-- Pin search_path on functions that didn't set one (lint 0011). `public` keeps
-- their unqualified table names working; pg_temp last so it can't shadow them.
alter function public.update_updated_at() set search_path = public, pg_temp;
alter function public.trg_applications_updated_at() set search_path = public, pg_temp;
alter function public.trg_projects_updated_at() set search_path = public, pg_temp;
alter function public.trg_collab_agreements_updated_at() set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.is_admin() set search_path = public, pg_temp;

-- Not meant to be called over the API (lints 0028/0029): the signup trigger and
-- the event trigger that switches on RLS for new tables. Triggers still run them.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Deliberately left callable: is_admin() (used by RLS policies, answers only for
-- the caller) and promote_to_member_if_eligible() (called by the app).
