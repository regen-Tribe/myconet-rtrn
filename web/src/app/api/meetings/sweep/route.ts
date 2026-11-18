import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { moduleOn } from '@/core/lib/modules'
import { processMeeting } from '@/modules/m18-meetings/lib/pipeline'
import { refreshFromFireflies } from '@/modules/m18-meetings/lib/refresh'
import { NOTES_VERSION } from '@/modules/m18-meetings/lib/second-brain'

// Finishes the meetings the webhooks couldn't: a Worker only gets about 30 s after replying, so a
// long meeting can stop before its note is written. The database calls this every 10 minutes when
// there's something to do (private.meetings_sweep(), pg_cron + pg_net, key MEETINGS_SWEEP_SECRET in
// Vault and as a Worker secret). It works while the caller waits, so the AI gets its full time.
// One meeting per request ({ "id": … } or the oldest waiting): a Worker may make only 50 outside
// calls per request. A meeting is tried at most 3 times; a lead's "let the agent read it" still works.
const STALE_MS = 10 * 60_000

export async function POST(req: NextRequest) {
  const secret = process.env.MEETINGS_SWEEP_SECRET
  if (!moduleOn('meetings') || !secret || req.headers.get('x-sweep-key') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const started = Date.now()
  const body = await req.json().catch(() => ({})) as { id?: string }
  const admin = createServiceClient()
  let q = admin.from('meeting_transcripts')
    .select('id, fireflies_id, summary, fireflies_notes, created_by, sweep_attempts, processing_started_at')
    .eq('status', 'done').lt('sweep_attempts', 3)
    .or(`processed_at.is.null,and(needs_review.eq.false,or(notes_version.is.null,notes_version.lt.${NOTES_VERSION}))`)
    .order('created_at').limit(10)
  if (body.id) q = q.eq('id', body.id)
  const { data: rows, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Not while a webhook's run is still going (a run that died is retried after STALE_MS)
  const todo = (rows ?? []).filter(m => !m.processing_started_at || Date.parse(m.processing_started_at) < started - STALE_MS)
  const m = todo[0]
  if (!m) return NextResponse.json({ swept: 0, waiting: 0 })
  await admin.from('meeting_transcripts').update({ sweep_attempts: (m.sweep_attempts ?? 0) + 1 }).eq('id', m.id)
  let refreshed: string | null = null
  // Notes Fireflies wrote after the meeting came in
  if (m.fireflies_id && (!m.summary || !m.fireflies_notes)) {
    try { await refreshFromFireflies(admin, m.id, m.fireflies_id); refreshed = 'ok' } catch (e) { refreshed = (e as Error).message }
  }
  const r = await processMeeting(admin, m.id, { requestedBy: m.created_by ?? null, timeoutMs: 90_000, email: 'auto' })
  return NextResponse.json({ swept: 1, waiting: todo.length - 1, id: m.id, refreshed, ok: r.ok, skipped: r.skipped ?? null, added: r.added, errors: r.errors })
}
