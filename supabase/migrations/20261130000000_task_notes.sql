-- Task notes and the assignee's own updates (v4.31.0). The task pop-up gets Status, Assigned to and Notes.
-- Leads (private.can_manage_project) edit a task as before; the person a task is assigned to may now
-- change its status and notes, and nothing else, through update_my_task().

alter table public.deliverables
  add column if not exists notes text;

create or replace function public.update_my_task(p_task uuid, p_status text, p_notes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status is not null and p_status not in ('backlog', 'in_progress', 'review', 'done') then
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

revoke all on function public.update_my_task(uuid, text, text) from public, anon;
grant execute on function public.update_my_task(uuid, text, text) to authenticated;
