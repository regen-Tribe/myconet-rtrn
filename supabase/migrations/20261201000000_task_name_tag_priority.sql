-- Tasks (v4.32.0): a typed name, and a priority.
--
-- A typed name: "Assigned to" can be someone who isn't on MyCoNet yet. It's only a
-- name tag on the task: no account or invite is made. Choosing a person's account clears it.
-- Meetings put such a name here too, instead of "(for Luis)" at the end of the title.

alter table public.deliverables
  add column if not exists assignee_name text
    check (assignee_name is null or char_length(assignee_name) between 1 and 80);

-- One assignee at a time: an account wins over a typed name, whoever makes the change
create or replace function private.deliverables_one_assignee()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assignee_id is not null then
    new.assignee_name := null;
  else
    new.assignee_name := nullif(btrim(regexp_replace(coalesce(new.assignee_name, ''), '\s+', ' ', 'g')), '');
  end if;
  return new;
end;
$$;

drop trigger if exists deliverables_one_assignee on public.deliverables;
create trigger deliverables_one_assignee
  before insert or update of assignee_id, assignee_name on public.deliverables
  for each row execute function private.deliverables_one_assignee();

-- Meeting tasks made before this: move "(for Luis)" from the title to the name tag
update public.deliverables
   set assignee_name = left(btrim(substring(title from ' \(for ([^)]+)\)$')), 80),
       title = regexp_replace(title, ' \(for [^)]+\)$', '')
 where source = 'meeting'
   and assignee_id is null
   and title ~ ' \(for [^)]+\)$';
-- … and the ones a lead has since given to an account: the title loses its "(for …)"
update public.deliverables
   set title = regexp_replace(title, ' \(for [^)]+\)$', '')
 where source = 'meeting'
   and assignee_id is not null
   and title ~ ' \(for [^)]+\)$';

-- A priority on each task: none (the default), low, medium, high. Leads set it in the task pop-up
alter table public.deliverables
  add column if not exists priority text not null default 'none'
    check (priority in ('none', 'low', 'medium', 'high'));
