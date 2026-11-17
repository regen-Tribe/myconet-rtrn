import { after, NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { moduleOn } from '@/core/lib/modules'
import { fetchTranscript, transcriptFields } from '@/modules/m18-meetings/lib/fireflies'
import { processMeeting } from '@/modules/m18-meetings/lib/pipeline'

// Meetings recorded straight in Fireflies (not uploaded here; most meetings): Fireflies' own webhook
// calls this (?key=PROTOPIA_INGEST_SECRET … the community's ingest secret). The notes are saved, then
// the meeting pipeline runs: the agent decides whether it's a community meeting and which circle(s),
// and only then puts tasks on the board, saves the note to the second brain and emails the leads.
// Not a community meeting, or not sure → it waits for a lead (needs_review).
export async function POST(req: NextRequest) {
  const secret = process.env.PROTOPIA_INGEST_SECRET
  if (!moduleOn('meetings') || !secret || req.nextUrl.searchParams.get('key') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  let body: { meetingId?: string; meeting_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const meetingId = body.meetingId || body.meeting_id
  if (!meetingId) return NextResponse.json({ error: 'no meetingId' }, { status: 400 })

  const admin = createServiceClient()
  const { data: existing } = await admin.from('meeting_transcripts').select('id').eq('fireflies_id', meetingId).maybeSingle()
  if (existing) return NextResponse.json({ received: true, skipped: 'already imported', id: existing.id })
  try {
    const t = await fetchTranscript(meetingId)
    const { data, error } = await admin.from('meeting_transcripts').insert({
      title: t.title || 'Untitled meeting',
      meeting_date: null,
      attendees: (t.speakers ?? []).map(s => s.name).filter(Boolean),
      fireflies_id: meetingId,
      ...transcriptFields(t),
      source: 'fireflies_direct', needs_review: true, circle: null, created_by: null,
    }).select('id').single()
    if (error) throw new Error(error.message)
    // After the reply; the AI gets 20 s (waitUntil lasts about 30 s). A lead can run it again.
    after(() => processMeeting(admin, data.id, { requestedBy: null, timeoutMs: 22_000, email: 'auto' }).then(() => {}))
    return NextResponse.json({ received: true, id: data.id })
  } catch (e) {
    return NextResponse.json({ received: true, error: e instanceof Error ? e.message : 'error' })
  }
}
