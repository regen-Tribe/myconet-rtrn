import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/core/lib/supabase/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { isOpsAdmin } from '@/core/lib/roles'
import { moduleOn } from '@/core/lib/modules'
import { processMeeting } from '@/modules/m18-meetings/lib/pipeline'

// A meeting's lead actions (admins, circle leads, project leads: the people who manage the board):
//   { action: 'settings', circle?, team_id?, visibility?, process? }  set the circle / Circle only; marks a direct
//                                                         recording reviewed; process: run the pipeline
//   { action: 'process' }   run the pipeline now (adds tasks not on the board yet, rewrites the note)
//   { action: 'email' }     send the notes to the circle's leads again
//   { action: 'confirm' }   confirm all of the meeting's draft tasks
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!moduleOn('meetings')) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (!isOpsAdmin(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Admins, circle leads and task leads manage meetings.' }, { status: 403 })
  }
  // Read with the person's own session: they must be able to see this meeting
  const { data: meeting } = await supabase.from('meeting_transcripts').select('id, circle, needs_review, status').eq('id', id).maybeSingle()
  if (!meeting) return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 })

  let body: { action?: unknown; circle?: unknown; team_id?: unknown; visibility?: unknown; process?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }
  const admin = createServiceClient()
  const run = (email: 'auto' | 'again') => processMeeting(admin, id, { requestedBy: user.id, timeoutMs: 120_000, email })

  if (body.action === 'settings') {
    const changes: Record<string, unknown> = {}
    if (body.circle !== undefined) {
      // No circle → it can't be Circle only
      if (body.circle === null || body.circle === '') { changes.circle = null; changes.circle_source = null; changes.visibility = 'community' }
      else {
        const { data: c } = await supabase.from('circles').select('slug').eq('slug', String(body.circle)).is('archived_at', null).maybeSingle()
        if (!c) return NextResponse.json({ error: 'No such circle.' }, { status: 400 })
        changes.circle = c.slug
        changes.circle_source = 'person'
        changes.needs_review = false
      }
    }
    // A subcircle of the meeting's circle (v4.108.0); the database keeps the two in step (meeting_team_circle)
    if (body.team_id !== undefined) {
      if (body.team_id === null || body.team_id === '') changes.team_id = null
      else {
        const { data: t } = await supabase.from('org_units').select('id, circle, kind').eq('id', String(body.team_id)).maybeSingle()
        const circle = 'circle' in changes ? changes.circle : meeting.circle
        if (!t || t.kind !== 'team' || t.circle !== circle) return NextResponse.json({ error: 'That subcircle isn’t in the meeting’s circle.' }, { status: 400 })
        changes.team_id = t.id
      }
    }
    if ((body.visibility === 'community' || body.visibility === 'circle') && changes.visibility === undefined) changes.visibility = body.visibility
    if (changes.visibility === 'circle' && !('circle' in changes ? changes.circle : meeting.circle)) {
      return NextResponse.json({ error: 'Choose a circle before making it Circle only.' }, { status: 400 })
    }
    if (Object.keys(changes).length) {
      const { error } = await admin.from('meeting_transcripts').update(changes).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      await admin.from('agent_actions').insert({ actor: 'person', requested_by: user.id, action: 'meeting_settings', meeting_id: id, detail: changes })
    }
    if (body.process === true) return NextResponse.json({ ok: true, pipeline: await run('auto') })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'process') return NextResponse.json(await run('auto'))
  if (body.action === 'email') return NextResponse.json(await run('again'))

  if (body.action === 'confirm') {
    // With the person's session, so the board's own rule (can_manage_project) applies
    const { data, error } = await supabase.from('deliverables').update({ needs_review: false })
      .eq('source_meeting_id', id).eq('needs_review', true).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (data?.length) await admin.from('agent_actions').insert({ actor: 'person', requested_by: user.id, action: 'confirm_tasks', meeting_id: id, detail: { count: data.length } })
    return NextResponse.json({ ok: true, confirmed: data?.length ?? 0 })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
