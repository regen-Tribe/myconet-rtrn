-- A declined or deleted task stays gone (v4.33.0). The Draft pill on a task can now be swiped left to decline it,
-- which deletes the task. Until now that also deleted its meeting_action_links row (on delete cascade), so the
-- next run of that meeting (e.g. when Fireflies' summary arrives) would add the task again. The link now stays,
-- with no task: the meeting remembers the item was handled and doesn't draft it again.

alter table public.meeting_action_links
  drop constraint if exists meeting_action_links_deliverable_id_fkey;
alter table public.meeting_action_links
  add constraint meeting_action_links_deliverable_id_fkey
    foreign key (deliverable_id) references public.deliverables (id) on delete set null;
