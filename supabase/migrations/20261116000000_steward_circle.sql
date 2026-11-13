-- Steward circle (core v4.15.0). One circle may be marked as the community stewards:
-- the circle that looks after every circle (Protopia: Vision / Strategy). The org
-- chart shows it at the top instead of a separate "Community stewards" box.
-- leads_to_assign (already here) is shown on the org chart as the circle's lead name,
-- for leads who aren't on the portal or aren't assigned as circle leads yet.
alter table public.circles
  add column is_steward boolean not null default false;

-- At most one active steward circle
create unique index circles_one_steward on public.circles ((true)) where is_steward and archived_at is null;
