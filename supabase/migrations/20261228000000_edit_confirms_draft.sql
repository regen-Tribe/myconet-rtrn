-- Any edit a person makes to a draft confirms it. Oscar: "any time a task is edited, it should lose the draft pill",
-- after "Resolve the Micronet email-link issue" was Done and still a Draft: dragging a card on the board, changing the
-- status on a project's page, and the assignee's own update (update_my_task) changed the task but kept needs_review.
-- The Edit fields, the task window and the assistant already cleared it; this makes it one rule everywhere.
--
-- Only a signed-in person's edit counts (auth.uid() set): the meeting pipeline and the project manager's board review
-- work with the service role, and filling in a draft for review is not confirming it. An update that sets needs_review
-- itself (approve, Undo, Later and its Undo) is left as it says.

create or replace function private.edit_confirms_draft()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(old.needs_review, false)
     and new.needs_review is not distinct from old.needs_review
     and (select auth.uid()) is not null
     and (new.title, new.status, new.circle, new.team_id, new.project_id, new.assignee_id, new.assignee_name,
          new.priority, new.due_date, new.due_time, new.notes, new.progress)
         is distinct from
         (old.title, old.status, old.circle, old.team_id, old.project_id, old.assignee_id, old.assignee_name,
          old.priority, old.due_date, old.due_time, old.notes, old.progress)
  then
    new.needs_review := false;
  end if;
  return new;
end;
$$;

drop trigger if exists deliverables_edit_confirms_draft on public.deliverables;
create trigger deliverables_edit_confirms_draft
  before update on public.deliverables
  for each row execute function private.edit_confirms_draft();
