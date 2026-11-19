-- Telling the agent what to do instead (v4.36.0). Oscar: when accepting or dismissing the project manager's
-- suggestions, "id like to have the ability to say something to ai that could be better", e.g. "add this to the
-- incubator cacao project tasks". A lead's instruction goes to the agent (Ask / Do), and once done the suggestion is
-- closed with that instruction kept here, so the project manager learns what the circle wanted.
alter table public.agent_suggestions add column if not exists decided_note text
  check (decided_note is null or char_length(decided_note) <= 2000);
