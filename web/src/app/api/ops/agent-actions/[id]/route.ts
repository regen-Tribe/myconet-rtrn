import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { circleDecider } from '@/modules/m07-ops/lib/pm-access'
import { undoRows } from '@/modules/assistant/lib/do-actions'
import { undoGeneral } from '@/modules/assistant/lib/do-catalog'
import { createClient } from '@/core/lib/supabase/server'

// Undo one of the agent's changes ({ action: 'undo' }): a circle's leads or an admin; a Do change also
// by the person who asked for it.
//   do_*      → every row it changed gets its values back; a project it made goes when empty
//   pm_move   → the task goes back to where it was (a project the change made is removed when empty)
//   pm_merge  → the merged-away task comes back, with its meeting links
//   pm_assign → the task has nobody again
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const me = await circleDecider()
  if (!me) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const { action } = await req.json().catch(() => ({})) as { action?: string }
  if (action !== 'undo') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  const admin = createServiceClient()
  const { data: a } = await admin.from('agent_actions').select('*').eq('id', id).maybeSingle()
  if (!a || a.undone_at || !/^(pm|do)_/.test(String(a.action))) return NextResponse.json({ error: 'Nothing to undo.' }, { status: 409 })
  const d = a.detail as Record<string, any>
  const mine = String(a.action).startsWith('do_') && a.requested_by === me.user.id
  if (!mine && !me.canDecide(d.circle ?? null)) return NextResponse.json({ error: 'Only this circle’s leads and admins can undo it.' }, { status: 403 })

  if (String(a.action).startsWith('do_')) {
    // A general change is undone as the person, like it was made
    try { if (d.as_user) await undoGeneral(await createClient(), d.general_rows ?? []); else await undoRows(admin, d) } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 500 }) }
    await admin.from('agent_actions').update({ undone_at: new Date().toISOString(), undone_by: me.user.id }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  if (a.action === 'pm_move') {
    await admin.from('deliverables').update({ project_id: d.from }).eq('id', a.target_id).eq('project_id', d.to)
    if (d.new_project) {
      const { count } = await admin.from('deliverables').select('id', { count: 'exact', head: true }).eq('project_id', d.new_project)
      if (!count) await admin.from('projects').delete().eq('id', d.new_project)
    }
  } else if (a.action === 'pm_merge') {
    const { error } = await admin.from('deliverables').insert(d.dropped)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const l of (d.links ?? []) as { meeting_id: string; item_key: string }[]) {
      await admin.from('meeting_action_links').update({ deliverable_id: d.dropped.id }).eq('meeting_id', l.meeting_id).eq('item_key', l.item_key)
    }
    if (d.filled && Object.keys(d.filled).length) {
      await admin.from('deliverables').update(Object.fromEntries(Object.keys(d.filled).map(k => [k, null]))).eq('id', a.target_id)
    }
  } else if (a.action === 'pm_assign') {
    await admin.from('deliverables').update({ assignee_id: d.from ?? null }).eq('id', a.target_id)
  } else {
    return NextResponse.json({ error: 'This change can’t be undone here.' }, { status: 409 })
  }
  await admin.from('agent_actions').update({ undone_at: new Date().toISOString(), undone_by: me.user.id }).eq('id', id)
  return NextResponse.json({ ok: true })
}
