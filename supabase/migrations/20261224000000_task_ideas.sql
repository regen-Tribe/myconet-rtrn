-- A task can be an Idea (v4.122.0). Oscar: "in the status drop down… there should be an idea option so it's put in
-- their column". Projects already had 'pending' (shown as Ideas); now tasks do too, so a task of its own sits in the
-- board's Ideas column. Same word in the database as for projects.

alter table public.deliverables drop constraint if exists deliverables_status_check;
alter table public.deliverables add constraint deliverables_status_check
  check (status = any (array['pending'::text, 'backlog'::text, 'in_progress'::text, 'review'::text, 'done'::text]));

-- The assignee's own update (v4.31.0) accepts Idea too
create or replace function public.update_my_task(p_task uuid, p_status text, p_notes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status is not null and p_status not in ('pending', 'backlog', 'in_progress', 'review', 'done') then
    raise exception 'Unknown status %', p_status using errcode = '22023';
  end if;
  update public.deliverables
     set status = coalesce(p_status, status),
         notes = case when p_notes is null then notes else nullif(left(p_notes, 5000), '') end
   where id = p_task and assignee_id = auth.uid();
  if not found then
    raise exception 'Only the person this task is assigned to can update it here' using errcode = '42501';
  end if;
end;
$$;
