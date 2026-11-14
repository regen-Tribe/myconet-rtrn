-- A joining account could insert an agreement already marked accepted, active or
-- completed, and promote_to_member_if_eligible() treats that row as proof of
-- membership. Members now create pending agreements only. Only admins and project
-- leads move an agreement forward (the existing update policies).
--
-- Note: AgreementsClient saves drafts with status 'draft', which the table's
-- status check constraint already rejects. Not fixed here.

drop policy if exists "joining users can submit agreements" on public.collaboration_agreements;

create policy "joining users submit pending agreements" on public.collaboration_agreements
  for insert to public
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and auth.uid() in (select id from public.user_profiles where role <> 'explorer')
  );

-- The owner's update could also move their own pending agreement to accepted
-- (no with check). It now has to stay pending; admins and project leads decide.
drop policy if exists "users can update own pending agreement" on public.collaboration_agreements;

create policy "users can update own pending agreement" on public.collaboration_agreements
  for update to public
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'pending');
