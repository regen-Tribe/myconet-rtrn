/**
 * Fetches a meeting's notes from Fireflies again and stores them — server only, service role.
 * Used by /api/fireflies-events (summary ready) and the sweep (meetings that missed it). Only for a
 * meeting already in: what comes in is decided by the upload page and the ingest route alone.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchFirefliesNotes, fetchTranscript, transcriptFields } from './fireflies'

export async function refreshFromFireflies(admin: SupabaseClient, id: string, firefliesId: string) {
  const [t, extra] = await Promise.all([fetchTranscript(firefliesId), fetchFirefliesNotes(firefliesId)])
  const fields = transcriptFields(t)
  // Never blank notes that are already in (meeting.transcribed can come after meeting.summarized)
  const { error } = await admin.from('meeting_transcripts').update({
    fireflies_id: firefliesId, status: fields.status, transcript: fields.transcript, error: null,
    ...(fields.summary ? { summary: fields.summary } : {}),
    ...(fields.action_items.length ? { action_items: fields.action_items } : {}),
    ...(fields.meeting_date ? { meeting_date: fields.meeting_date } : {}),
    // Notes, outline, bullets, topics and keywords: the meeting page's tabs
    ...(extra ? { fireflies_notes: extra } : {}),
  }).eq('id', id)
  if (error) throw new Error(error.message)
  return { summary: !!fields.summary, action_items: fields.action_items.length, notes: extra ? Object.keys(extra).filter(k => extra[k as keyof typeof extra]) : [] }
}

/**
 * The meeting waits for the agent: the sweep (/api/meetings/sweep, every 2 minutes) runs the pipeline
 * with its full AI time. The webhooks never run the AI themselves (v4.32.1): a Worker gets only about
 * 30 s after replying, too little for MiniMax to read a long meeting.
 */
export async function queueForAgent(admin: SupabaseClient, id: string) {
  const { error } = await admin.from('meeting_transcripts').update({ processed_at: null, sweep_attempts: 0 }).eq('id', id)
  if (error) throw new Error(error.message)
}

/** Fresh notes from Fireflies; the agent reads the meeting (again) when it hasn't yet, or the summary is new */
export async function refreshAndQueue(admin: SupabaseClient, id: string, firefliesId: string) {
  const { data: before } = await admin.from('meeting_transcripts').select('summary, processed_at').eq('id', id).maybeSingle()
  const got = await refreshFromFireflies(admin, id, firefliesId)
  const queued = !before?.processed_at || (!before?.summary && got.summary)
  if (queued) await queueForAgent(admin, id)
  return { ...got, queued }
}
