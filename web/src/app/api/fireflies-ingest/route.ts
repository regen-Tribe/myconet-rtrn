import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { moduleOn } from '@/core/lib/modules'
import { fetchFirefliesNotes, fetchTranscript, transcriptFields } from '@/modules/m18-meetings/lib/fireflies'
import { refreshAndQueue } from '@/modules/m18-meetings/lib/refresh'

// Meetings from Fireflies that a community's filter let in (Protopia: Sonia's divider), called with
// ?key=PROTOPIA_INGEST_SECRET (the community's ingest secret) and { meetingId, client_reference_id? }.
// A new meeting is saved with its notes and waits for the agent; the sweep (every 2 minutes, full AI
// time) decides whether it's a community meeting and which circle(s), and only then puts tasks on the
// board, saves the note to the second brain and emails the leads. Not a community meeting, or not
// sure → it waits for a lead (needs_review).
// A meeting already in (an upload here, whose id is the client_reference_id, or the same Fireflies id)
// gets its notes refreshed instead, so the filter is the only webhook Fireflies needs (v4.32.1).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const secret = process.env.PROTOPIA_INGEST_SECRET
  if (!moduleOn('meetings') || !secret || req.nextUrl.searchParams.get('key') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  let body: { meetingId?: string; meeting_id?: string; client_reference_id?: string; clientReferenceId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const meetingId = body.meetingId || body.meeting_id
  const ref = body.client_reference_id || body.clientReferenceId
  if (!meetingId) return NextResponse.json({ error: 'no meetingId' }, { status: 400 })

  const admin = createServiceClient()
  try {
    const byRef = ref && UUID.test(ref) ? (await admin.from('meeting_transcripts').select('id').eq('id', ref).maybeSingle()).data : null
    const existing = byRef ?? (await admin.from('meeting_transcripts').select('id').eq('fireflies_id', meetingId).maybeSingle()).data
    if (existing) {
      const got = await refreshAndQueue(admin, existing.id as string, meetingId)
      return NextResponse.json({ received: true, updated: existing.id, ...got })
    }
    // The filter forwards a meeting once Fireflies has summarised it: take the tabs' notes too
    const [t, extra] = await Promise.all([fetchTranscript(meetingId), fetchFirefliesNotes(meetingId)])
    const { data, error } = await admin.from('meeting_transcripts').insert({
      title: t.title || 'Untitled meeting',
      meeting_date: null,
      attendees: (t.speakers ?? []).map(s => s.name).filter(Boolean),
      fireflies_id: meetingId,
      ...transcriptFields(t), ...(extra ? { fireflies_notes: extra } : {}),
      source: 'fireflies_direct', needs_review: true, circle: null, created_by: null,
    }).select('id').single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ received: true, id: data.id, queued: true })
  } catch (e) {
    // 200 with {error}: the filter keeps the meeting and sends it again (Sonia's divider: every hour)
    return NextResponse.json({ received: true, error: e instanceof Error ? e.message : 'error' })
  }
}
