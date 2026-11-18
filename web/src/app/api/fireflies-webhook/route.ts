import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { moduleOn } from '@/core/lib/modules'
import { fetchTranscript, transcriptFields } from '@/modules/m18-meetings/lib/fireflies'

// Fireflies calls this when a recording sent by /api/meetings/upload is transcribed
// (?key=FIREFLIES_WEBHOOK_SECRET). clientReferenceId is our meeting_transcripts id.
// The meeting then waits for the agent: the sweep (every 2 minutes, full AI time) chooses the
// circle(s) from the content (or keeps the one chosen at upload), puts the tasks on the board, saves
// the second-brain note and emails the leads.
export async function POST(req: NextRequest) {
  const secret = process.env.FIREFLIES_WEBHOOK_SECRET
  if (!moduleOn('meetings') || !secret || req.nextUrl.searchParams.get('key') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  let body: { meetingId?: string; meeting_id?: string; clientReferenceId?: string; client_reference_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ received: true }) }
  const meetingId = body.meetingId || body.meeting_id
  const ref = body.clientReferenceId || body.client_reference_id
  if (!meetingId || !ref) return NextResponse.json({ received: true, note: 'missing meetingId/clientReferenceId' })

  const admin = createServiceClient()
  try {
    const t = await fetchTranscript(meetingId)
    await admin.from('meeting_transcripts').update({ fireflies_id: meetingId, ...transcriptFields(t), error: null, processed_at: null, sweep_attempts: 0 }).eq('id', ref)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Transcript fetch failed'
    await admin.from('meeting_transcripts').update({ status: 'error', error: message }).eq('id', ref)
    return NextResponse.json({ received: true, error: message })
  }
  return NextResponse.json({ received: true })
}
