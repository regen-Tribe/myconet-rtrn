-- Each circle's space in the second brain (v4.30.0). "While you use MyCoNet, it keeps your second brain
-- up to date": every circle has a folder in the community's knowledge repo, with a README (its index:
-- purpose, leads, board, meetings, what's inside) and board.md (the project manager's board status).
-- brain_folder is that folder, relative to the repo root; null = the circle's slug, set when the agent
-- first makes the folder. A new, renamed or retired circle asks for a board review, which creates or
-- updates its space (the agent only rewrites its own part of a README people wrote).

alter table public.circles
  add column if not exists brain_folder text;

create or replace function public.circles_request_brain_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.name is distinct from old.name or new.archived_at is distinct from old.archived_at
     -- (the agent recording the folder it just made isn't a change to act on)
     or (new.brain_folder is distinct from old.brain_folder and old.brain_folder is not null) then
    insert into public.board_reviews (circle, requested_at, attempts)
    values (new.slug, now(), 0)
    on conflict (circle) do update set requested_at = now(), attempts = 0;
  end if;
  return new;
end;
$$;

drop trigger if exists circles_request_brain_update on public.circles;
create trigger circles_request_brain_update after insert or update on public.circles
  for each row execute function public.circles_request_brain_update();
