-- Meeting documents (v4.22.0): the rest of what Fireflies writes for a meeting, shown as tabs next to
-- the transcript on the meeting page. { notes, outline, shorthand_bullet, bullet_gist, keywords[],
-- topics[] }, each optional; read like the rest of the row (joining members and above, or the circle
-- for Circle only meetings). Written by the Fireflies routes with the service role.
alter table public.meeting_transcripts
  add column if not exists fireflies_notes jsonb;
