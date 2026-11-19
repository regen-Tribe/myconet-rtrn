import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { circleDecider } from '@/modules/m07-ops/lib/pm-access'
import { mergeTasks } from '@/modules/m07-ops/lib/board-review'

// A circle lead (or an admin) accepts or dismisses one of the project manager's suggestions:
//   { action: 'accept' | 'dismiss' }. Accepting does the change and logs it in agent_actions, so it
//   can be undone from the board like the agent's own changes. { action: 'redirect', note } closes it after the
//   lead told the agent what to do instead (v4.36.0; the agent made those changes through Ask / Do).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const me = await circleDecider()
  if (!me) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  // Accepting can put it somewhere else (v4.38.3): a new project in another circle or team ({ circle, team_id }),
  // or an existing project instead ({ project_id }: the suggestion's tasks move into it)
  const { action, note, circle: toCircle, team_id: toTeam, project_id: toProject } = await req.json().catch(() => ({})) as {
    action?: string; note?: string; circle?: string; team_id?: string | null; project_id?: string
  }
  const admin = createServiceClient()
  const { data: s } = await admin.from('agent_suggestions').select('*').eq('id', id).maybeSingle()
  if (!s || s.status !== 'open') return NextResponse.json({ error: 'This suggestion is no longer open.' }, { status: 409 })
  if (!me.canDecide(s.circle)) return NextResponse.json({ error: 'Only this circle’s leads and admins decide its suggestions.' }, { status: 403 })
  const close = (status: string, decided_note: string | null = null) => admin.from('agent_suggestions').update({ status, decided_by: me.user.id, decided_at: new Date().toISOString(), decided_note }).eq('id', id)
  if (action === 'dismiss') { await close('dismissed'); return NextResponse.json({ ok: true }) }
  // Done another way: kept as dismissed (not suggested again) with what the lead wanted instead
  if (action === 'redirect') { await close('dismissed', typeof note === 'string' ? note.trim().slice(0, 2000) || null : null); return NextResponse.json({ ok: true }) }
  if (action !== 'accept') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  const p = s.payload as Record<string, any>
  const logRow = (action: string, target: string, detail: object) => ({
    actor: 'project-manager', requested_by: me.user.id, action, target_table: 'deliverables', target_id: target,
    detail: { circle: s.circle, reason: s.reason, suggestion: id, ...detail },
  })
  // The tasks must still be this circle's
  const taskIds = [p.keep, p.drop, p.task, ...(p.tasks ?? [])].filter(Boolean) as string[]
  // Where the change went, for the panel's link once accepted (v4.36.1)
  let result: { project_id?: string | null; task_id?: string | null } = {}
  const { data: rows } = await admin.from('deliverables').select('id, title, project_id, assignee_id, due_date, circle').in('id', taskIds)
  const task = (tid: string) => rows?.find(r => r.id === tid && r.circle === s.circle)

  if (s.kind === 'merge') {
    const keep = task(p.keep), drop = task(p.drop)
    if (!keep || !drop) { await close('stale'); return NextResponse.json({ error: 'One of the tasks is gone.' }, { status: 409 }) }
    const r = await mergeTasks(admin, keep, drop)
    if (r.error) return NextResponse.json({ error: r.error }, { status: 500 })
    await admin.from('agent_actions').insert(logRow('pm_merge', keep.id, { kept: keep.title, dropped: r.dropped, links: r.links, filled: r.filled }))
    result = { task_id: keep.id, project_id: keep.project_id }
  } else if (s.kind === 'move' || s.kind === 'new_project') {
    let projectId = (toProject ?? p.project) as string | undefined
    // Where the tasks end up: their circle and team follow the project
    let target: { circle: string | null; team_id: string | null } = { circle: s.circle, team_id: null }
    if (s.kind === 'new_project' && !toProject) {
      // A new project, in the suggested circle or the one the lead picked (and maybe one of its teams)
      const circle = toCircle || s.circle
      if (circle !== s.circle && !me.canDecide(circle)) return NextResponse.json({ error: 'Only that circle’s leads and admins can put a project there.' }, { status: 403 })
      let teamId: string | null = null
      if (toTeam) {
        const { data: team } = await admin.from('org_units').select('id, circle, kind').eq('id', toTeam).maybeSingle()
        if (!team || team.kind !== 'team' || team.circle !== circle) return NextResponse.json({ error: 'That team isn’t in this circle.' }, { status: 400 })
        teamId = team.id
      }
      const { data: proj, error } = await admin.from('projects').insert({
        title: p.title, description: p.description ?? null, circle, team_id: teamId, status: 'backlog',
        created_by: me.user.id, lead_user_id: me.user.id,
      }).select('id').single()
      if (error || !proj) return NextResponse.json({ error: error?.message ?? 'Project not created' }, { status: 500 })
      projectId = proj.id
      target = { circle, team_id: teamId }
    } else {
      const { data: proj } = await admin.from('projects').select('id, circle, team_id, status').eq('id', projectId!).maybeSingle()
      if (!proj || (!toProject && proj.circle !== s.circle)) { await close('stale'); return NextResponse.json({ error: 'The project is gone.' }, { status: 409 }) }
      // Into a project the lead picked: it must be open, and theirs to decide
      if (toProject && (proj.status === 'done' || !me.canDecide(proj.circle))) return NextResponse.json({ error: 'Pick an open project in a circle you lead.' }, { status: 403 })
      target = { circle: proj.circle, team_id: proj.team_id ?? null }
    }
    const list = (s.kind === 'move' ? [p.task] : p.tasks as string[]).map(task).filter((t): t is NonNullable<ReturnType<typeof task>> => !!t)
    if (list.length) await admin.from('deliverables').update({ project_id: projectId, circle: target.circle, team_id: target.team_id }).in('id', list.map(t => t.id))
    await admin.from('agent_actions').insert(list.map(t => logRow('pm_move', t.id, { title: t.title, from: t.project_id, to: projectId, from_circle: t.circle, ...(s.kind === 'new_project' ? { new_project: projectId } : {}) })))
    result = { project_id: projectId ?? null }
  } else if (s.kind === 'assign') {
    const t = task(p.task)
    if (!t) { await close('stale'); return NextResponse.json({ error: 'The task is gone.' }, { status: 409 }) }
    await admin.from('deliverables').update({ assignee_id: p.person_id }).eq('id', t.id)
    await admin.from('agent_actions').insert(logRow('pm_assign', t.id, { title: t.title, from: t.assignee_id, to: p.person_id, person: p.person }))
    result = { task_id: t.id, project_id: t.project_id }
  }
  await close('accepted')
  return NextResponse.json({ ok: true, result })
}
