-- "Later": a task set aside as an idea for later (v4.114.0). Oscar: one list of everything to decide, where a draft can be
-- approved, declined, or put on an Ideas for later list. deliverables.later_at: when it was set aside (null: it isn't).
-- A task set aside isn't a draft any more and leaves the board and the project manager's review until it's brought back.
-- Who may set it: the existing deliverables policies.

alter table public.deliverables add column if not exists later_at timestamptz;
create index if not exists deliverables_later_idx on public.deliverables (later_at) where later_at is not null;
