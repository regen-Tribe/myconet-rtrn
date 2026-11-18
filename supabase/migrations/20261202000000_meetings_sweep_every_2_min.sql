-- v4.32.1: the meeting agent runs only in the sweep, where the AI gets its full time (150 s), never
-- in a webhook's last 30 s. So the sweep runs every 2 minutes instead of 10: a new meeting is read
-- within about 2 minutes. private.meetings_sweep() sends nothing when no meeting is waiting, and a
-- meeting being read is skipped (processing_started_at), so overlapping runs don't read it twice.
select cron.schedule('myconet-meetings-sweep', '*/2 * * * *', 'select private.meetings_sweep()');
