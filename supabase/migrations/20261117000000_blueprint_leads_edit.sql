-- Blueprint answers (core v4.15.8): only admins and circle leads change them.
-- Before, only the person who first opened the blueprint (the row's user_id) could
-- save, so other admins and circle leads saw the editor but their changes were lost.
-- Everyone can still read it ("Anyone can view blueprints" is unchanged).
drop policy if exists "Users can insert own blueprint" on public.blueprints;
drop policy if exists "Users can update own blueprint" on public.blueprints;

-- coalesce: for visitors my_role() is null, and null must mean "no"
create policy "leads create the community blueprint" on public.blueprints
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and coalesce((select private.my_role()) in ('admin', 'circle_lead'), false)
  );

create policy "leads edit the blueprint" on public.blueprints
  for update to authenticated
  using (coalesce((select private.my_role()) in ('admin', 'circle_lead'), false))
  with check (coalesce((select private.my_role()) in ('admin', 'circle_lead'), false));
