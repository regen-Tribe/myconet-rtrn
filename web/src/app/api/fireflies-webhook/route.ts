import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { moduleOn } from '@/core/lib/modules'
import { buildTranscriptText, fetchTranscript, parseActionItems } from '@/modules/m18-meetings/lib/fireflies'

// Fireflies calls this when a recording sent by /api/meetings/upload is transcribed
// (?key=FIREFLIES_WEBHOOK_SECRET). clientReferenceId is our meeting_transcripts id.
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
    await admin.from('meeting_transcripts').update({
      fireflies_id: meetingId, status: 'done',
      summary: t.summary?.overview || t.summary?.short_summary || null,
      action_items: parseActionItems(t.summary?.action_items),
      transcript: buildTranscriptText(t.sentences),
      ...(t.date ? { meeting_date: new Date(t.date).toISOString() } : {}),
      error: null,
    }).eq('id', ref)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Transcript fetch failed'
    await admin.from('meeting_transcripts').update({ status: 'error', error: message }).eq('id', ref)
    return NextResponse.json({ received: true, error: message })
  }
  return NextResponse.json({ received: true })
}
