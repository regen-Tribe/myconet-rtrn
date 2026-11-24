-- When and by whom a task or project last changed (v4.129.0). Oscar: "add tracking", after drafts he had confirmed seemed
-- to come back and nothing showed which tasks had changed: deliverables.updated_at was never kept current (projects' was).
-- Every update now stamps updated_at, and updated_by with the signed-in person; null means the assistant or a background
-- job, which work with the service role.

alter table public.deliverables add column if not exists updated_by uuid references auth.users (id) on delete set null;
alter table public.projects add column if not exists updated_by uuid references auth.users (id) on delete set null;

create or replace function private.stamp_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

drop trigger if exists deliverables_stamp_change on public.deliverables;
create trigger deliverables_stamp_change
  before update on public.deliverables
  for each row execute function private.stamp_change();

-- Projects kept updated_at with their own trigger; this one also says who
drop trigger if exists set_projects_updated_at on public.projects;
drop trigger if exists projects_stamp_change on public.projects;
create trigger projects_stamp_change
  before update on public.projects
  for each row execute function private.stamp_change();
