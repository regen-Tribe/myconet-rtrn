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
