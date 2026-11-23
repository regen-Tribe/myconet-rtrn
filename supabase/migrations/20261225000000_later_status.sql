-- Later is a status (v4.123.0). Oscar: "later button moves it to the later column (create the column one position left
-- of idea column) and you can set that as the status. lets not longer hide them. its just a new status - later". Tasks
-- and projects can be 'later'; the board shows a Later column before Ideas. v4.114.0's `deliverables.later_at` (set
-- aside, off the board) is replaced: tasks set aside that way become status 'later', and the column stays unused.

alter table public.deliverables drop constraint if exists deliverables_status_check;
alter table public.deliverables add constraint deliverables_status_check
  check (status = any (array['later'::text, 'pending'::text, 'backlog'::text, 'in_progress'::text, 'review'::text, 'done'::text]));

alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check
  check (status = any (array['later'::text, 'pending'::text, 'backlog'::text, 'in_progress'::text, 'review'::text, 'done'::text, 'paused'::text]));

-- What v4.114.0 set aside is now simply Later, back on the board
update public.deliverables set status = 'later', later_at = null where later_at is not null;
comment on column public.deliverables.later_at is 'Unused since v4.123.0 (Later is a status). Kept so older code keeps running.';

-- The assignee's own update accepts Later too
create or replace function public.update_my_task(p_task uuid, p_status text, p_notes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status is not null and p_status not in ('later', 'pending', 'backlog', 'in_progress', 'review', 'done') then
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
