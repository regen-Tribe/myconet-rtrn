import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { moduleOn } from '@/core/lib/modules'
import { verifyFirefliesSignature } from '@/modules/m18-meetings/lib/fireflies'
import { refreshAndQueue } from '@/modules/m18-meetings/lib/refresh'

// Fireflies Webhooks V2 (app.fireflies.ai/integrations/api/webhook, events meeting.transcribed and
// meeting.summarized, signed with FIREFLIES_SIGNING_SECRET). Fireflies writes its summary and action
// items a few minutes after the transcript, so the first webhooks (/api/fireflies-webhook for uploads,
// /api/fireflies-ingest for direct recordings) often get the transcript only. meeting.summarized
// fetches the notes again and the agent reads the meeting again (in the sweep, v4.32.1): tasks already on the board aren't added
// twice, the second-brain note is updated in place, and the email still goes once. It never adds a
// meeting: what comes in is decided by the upload page and the ingest route alone.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const secret = process.env.FIREFLIES_SIGNING_SECRET
  const raw = await req.text()
  if (!moduleOn('meetings') || !secret || !(await verifyFirefliesSignature(raw, req.headers.get('x-hub-signature'), secret))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  let body: { event?: string; meeting_id?: string; client_reference_id?: string }
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const { event, meeting_id: firefliesId, client_reference_id: ref } = body
  if (event !== 'meeting.transcribed' && event !== 'meeting.summarized') return NextResponse.json({ received: true, skipped: event ?? 'no event' })
  if (!firefliesId) return NextResponse.json({ error: 'no meeting_id' }, { status: 400 })

  const admin = createServiceClient()
  try {
    // Only meetings already in: an upload (our id is its client_reference_id) or one the community's
    // ingest let in (/api/fireflies-ingest, e.g. Protopia's filter of Sonia's account). The account
    // may record other people's calls: anything else is ignored, never fetched or saved.
    const byRef = ref && UUID.test(ref) ? (await admin.from('meeting_transcripts').select('id').eq('id', ref).maybeSingle()).data : null
    const existing = byRef ?? (await admin.from('meeting_transcripts').select('id').eq('fireflies_id', firefliesId).maybeSingle()).data
    if (!existing) return NextResponse.json({ received: true, skipped: 'not a meeting of this community' })
    const id = existing.id as string
    // New notes → the meeting waits for the agent, which the sweep runs with its full AI time
    const got = await refreshAndQueue(admin, id, firefliesId)
    return NextResponse.json({ received: true, id, event, ...got })
  } catch (e) {
    // 5xx so Fireflies retries (30 s, 2 min, 10 min, 30 min, 2 h)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 502 })
  }
}
