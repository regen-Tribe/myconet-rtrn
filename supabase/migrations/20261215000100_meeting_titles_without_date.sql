-- v4.100.0: a meeting's name no longer carries its date (the date is shown beside it).
-- Before, the assistant named meetings "17.11.2026 Kitchen lead handover". Take the date off the
-- front of existing names; the name the recording had stays in original_title. Runs once; safe to rerun.
update public.meeting_transcripts
set title = btrim(regexp_replace(title, '^\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[./ -]\d{1,2}[./ -]\d{2,4})\s*[-–·:|,]?\s*', ''))
where title ~ '^\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[./ -]\d{1,2}[./ -]\d{2,4})\s*[-–·:|,]?\s*\S';
