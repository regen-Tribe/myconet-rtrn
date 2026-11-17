import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { moduleOn } from '@/core/lib/modules'
import { buildTranscriptText, fetchTranscript, parseActionItems } from '@/modules/m18-meetings/lib/fireflies'

// Meetings recorded straight in Fireflies (not uploaded here): Fireflies' own webhook calls this
// (?key=PROTOPIA_INGEST_SECRET … the community's ingest secret) and the notes are added for review.
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
      meeting_date: t.date ? new Date(t.date).toISOString() : null,
      attendees: (t.speakers ?? []).map(s => s.name).filter(Boolean),
      fireflies_id: meetingId, status: 'done',
      summary: t.summary?.overview || t.summary?.short_summary || null,
      action_items: parseActionItems(t.summary?.action_items),
      transcript: buildTranscriptText(t.sentences),
      source: 'fireflies_direct', needs_review: true, circle: null, created_by: null,
    }).select('id').single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ received: true, id: data.id })
  } catch (e) {
    return NextResponse.json({ received: true, error: e instanceof Error ? e.message : 'error' })
  }
}
