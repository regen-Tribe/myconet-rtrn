/**
 * Ask / Do — server only. What a signed-in person can tell the MyCoNet agent to do on the board, how
 * each change is described (by MyCoNet, not by the AI), who may make it, and how it's made and undone.
 * Every change is logged in agent_actions (actor 'agent-do', requested_by the person) with the rows it
 * changed and their values before (detail.rows), or what it created (detail.created), so Undo can put
 * them back. Permissions are the person's own: admins anything; circle leads their circles; a project's
 * lead (or creator) that project; anyone their own task's status and date; new circles admins and
 * circle leads.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { CIRCLE_COLORS, emojiFor, slugFor } from '@/modules/m04-blueprint/lib/circle-setup'

export type DoKind =
  | 'create_circle' | 'merge_projects' | 'rename_project' | 'create_project' | 'move_tasks'
  | 'rename_task' | 'assign_task' | 'set_task_date' | 'set_task_status' | 'confirm_drafts'

export interface DoAction {
  kind: DoKind
  /** Real ids (the planner's P1/T1 references resolved on the server) */
  project?: string; into?: string; title?: string; description?: string | null; circle?: string
  tasks?: string[]; to?: string | null; person?: string | null; due_date?: string | null; due_time?: string | null; status?: string
  /** create_circle: its emoji (else one from its name) */
  emoji?: string
}

export interface Board {
  projects: { id: string; title: string; description: string | null; circle: string | null; status: string; is_chores: boolean; lead_user_id: string | null; created_by: string | null }[]
  tasks: { id: string; title: string; project_id: string | null; circle: string | null; assignee_id: string | null; due_date: string | null; due_time: string | null; status: string; needs_review: boolean }[]
  people: { id: string; name: string }[]
  circles: { slug: string; name: string }[]
}

export interface Me { id: string; role: string; leadCircles: string[] }

export const TASK_STATUSES = ['later', 'pending', 'backlog', 'in_progress', 'review', 'done']

export async function loadBoard(admin: SupabaseClient): Promise<Board> {
  const [p, t, u, c] = await Promise.all([
    admin.from('projects').select('id, title, description, circle, status, is_chores, lead_user_id, created_by').neq('status', 'paused'),
    admin.from('deliverables').select('id, title, project_id, circle, assignee_id, due_date, due_time, status, needs_review').order('created_at').limit(400),
    admin.from('user_profiles').select('id, first_name, last_name, username'),
    admin.from('circles').select('slug, name').is('archived_at', null).order('sort_order'),
  ])
  return {
    projects: (p.data ?? []) as Board['projects'],
    tasks: (t.data ?? []) as Board['tasks'],
    people: (u.data ?? []).map(x => ({ id: x.id as string, name: [x.first_name, x.last_name].filter(Boolean).join(' ') || (x.username as string) || 'Member' })),
    circles: (c.data ?? []) as Board['circles'],
  }
}

const q = (s: string | null | undefined) => `“${s ?? '?'}”`

/** The plain-words line on the confirm card; null when the action doesn't fit the board */
export function describe(a: DoAction, b: Board): string | null {
  const P = (id?: string | null) => b.projects.find(p => p.id === id)
  const T = (id?: string) => b.tasks.find(t => t.id === id)
  const tasks = (a.tasks ?? []).map(T).filter(Boolean) as Board['tasks']
  const list = (ts: Board['tasks']) => ts.length <= 3 ? ts.map(t => q(t.title)).join(', ') : `${ts.length} tasks`
  const circleName = (slug?: string | null) => b.circles.find(c => c.slug === slug)?.name ?? slug ?? '?'
  switch (a.kind) {
    case 'create_circle':
      return a.title && a.description && !b.circles.some(c => c.name.toLowerCase() === a.title!.toLowerCase())
        ? `Create the circle ${a.emoji ?? emojiFor(a.title)} ${q(a.title)}: ${a.description}` : null
    case 'merge_projects': {
      const from = P(a.project), into = P(a.into)
      if (!from || !into || from.id === into.id) return null
      const n = b.tasks.filter(t => t.project_id === from.id).length
      return `Merge ${q(from.title)} (${n} task${n === 1 ? '' : 's'}) into ${q(into.title)}${a.title && a.title !== into.title ? `, renamed ${q(a.title)}` : ''}; ${q(from.title)} is then deleted`
    }
    case 'rename_project': { const p = P(a.project); return p && a.title ? `Rename the task ${q(p.title)} to ${q(a.title)}` : null }
    case 'create_project':
      return a.title && a.circle && b.circles.some(c => c.slug === a.circle) ? `Create the task ${q(a.title)} in ${circleName(a.circle)}${tasks.length ? ` with ${list(tasks)}` : ''}` : null
    case 'move_tasks': {
      if (!tasks.length) return null
      if (a.to) { const p = P(a.to); return p ? `Move ${list(tasks)} into ${q(p.title)}` : null }
      return `Move ${list(tasks)} out of their task, onto the main board`
    }
    case 'rename_task': { const t = T(a.tasks?.[0]); return t && a.title ? `Rename the task ${q(t.title)} to ${q(a.title)}` : null }
    case 'assign_task': {
      const t = T(a.tasks?.[0]); if (!t) return null
      if (!a.person) return `Take ${q(t.title)} off whoever has it`
      const who = b.people.find(p => p.id === a.person); return who ? `Give ${q(t.title)} to ${who.name}` : null
    }
    case 'set_task_date': { const t = T(a.tasks?.[0]); return t ? (a.due_date ? `Set ${q(t.title)} due ${a.due_date}${a.due_time ? ` ${a.due_time}` : ''}` : `Clear the date of ${q(t.title)}`) : null }
    case 'set_task_status': { const t = T(a.tasks?.[0]); return t && a.status && TASK_STATUSES.includes(a.status) ? `Mark ${q(t.title)} ${a.status === 'pending' ? 'an idea' : a.status === 'later' ? 'later' : a.status === 'backlog' ? 'to do' : a.status.replace('_', ' ')}` : null }
    case 'confirm_drafts': return tasks.length ? `Confirm ${list(tasks)} (no longer drafts)` : null
  }
  return null
}

/** The circle a change belongs to (for permissions and the log) */
export function circleOf(a: DoAction, b: Board): string | null {
  const p = b.projects.find(x => x.id === (a.project ?? a.into ?? a.to))
  if (p?.circle) return p.circle
  if (a.kind === 'create_project') return a.circle ?? null
  const t = b.tasks.find(x => x.id === a.tasks?.[0])
  return t?.circle ?? b.projects.find(x => x.id === t?.project_id)?.circle ?? null
}

/** Why this person can't make the change, or null when they can */
export function blocked(a: DoAction, b: Board, me: Me): string | null {
  if (me.role === 'admin') return null
  const leads = (c: string | null | undefined) => !!c && me.role === 'circle_lead' && me.leadCircles.includes(c)
  const leadsProject = (id?: string | null) => {
    const p = b.projects.find(x => x.id === id)
    return !!p && (leads(p.circle) || p.lead_user_id === me.id || p.created_by === me.id)
  }
  const tasks = (a.tasks ?? []).map(id => b.tasks.find(t => t.id === id)).filter(Boolean) as Board['tasks']
  const leadsTask = (t: Board['tasks'][number]) => leads(t.circle) || leadsProject(t.project_id)
  const no = (who: string) => `Only ${who} can do this.`
  switch (a.kind) {
    case 'create_circle': return me.role === 'circle_lead' ? null : no('admins and circle leads')
    case 'merge_projects': return leadsProject(a.project) && leadsProject(a.into) ? null : no('the leads of both tasks (or their circle) and admins')
    case 'rename_project': return leadsProject(a.project) ? null : no('the task’s lead, its circle’s leads and admins')
    case 'create_project': return leads(a.circle) && tasks.every(leadsTask) ? null : no('the circle’s leads and admins')
    case 'move_tasks': return tasks.every(leadsTask) && (!a.to || leadsProject(a.to)) ? null : no('the leads of the subtasks’ circle or task, and admins')
    case 'set_task_status':
    case 'set_task_date': {
      const t = tasks[0]
      return t && (leadsTask(t) || t.assignee_id === me.id) ? null : no('the person on the task, its leads and admins')
    }
    default: return tasks.length && tasks.every(leadsTask) ? null : no('the leads of the subtask’s circle or task, and admins')
  }
}

type Row = { table: 'deliverables' | 'projects' | 'circles' | 'project_updates' | 'collaboration_agreements' | 'events' | 'places'; id: string; before: Record<string, unknown> }

/** Makes the change and updates the board in memory to match (so one read serves several changes); returns what to log so it can be undone */
export async function execute(admin: SupabaseClient, a: DoAction, b: Board, me: Me): Promise<{ rows: Row[]; created: Row[]; removed: Row[]; error?: string }> {
  // removed: rows deleted whole (a merged-away task), put back first on Undo
  const rows: Row[] = [], created: Row[] = [], removed: Row[] = []
  const P = (id?: string | null) => b.projects.find(p => p.id === id)
  const T = (id: string) => b.tasks.find(t => t.id === id)!
  const upd = async (table: Row['table'], id: string, before: Record<string, unknown>, changes: Record<string, unknown>) => {
    // Changing a draft confirms it (v4.84.0: Oscar, "when user changes any of those, it is no longer a draft"); undo makes it a draft again
    if (table === 'deliverables' && T(id)?.needs_review && !('needs_review' in changes)) { changes = { ...changes, needs_review: false }; before = { ...before, needs_review: true } }
    const { error } = await admin.from(table).update(changes).eq('id', id)
    if (error) throw new Error(error.message)
    rows.push({ table, id, before })
    const item = table === 'projects' ? b.projects.find(x => x.id === id) : table === 'deliverables' ? b.tasks.find(x => x.id === id) : null
    if (item) Object.assign(item, changes)
  }
  const moveAll = async (ids: string[], to: string) => {
    if (!ids.length) return
    const { error } = await admin.from('deliverables').update({ project_id: to }).in('id', ids)
    if (error) throw new Error(error.message)
    const drafts = ids.filter(id => T(id).needs_review)
    if (drafts.length) { const { error: e } = await admin.from('deliverables').update({ needs_review: false }).in('id', drafts); if (e) throw new Error(e.message) }
    for (const id of ids) { rows.push({ table: 'deliverables', id, before: { project_id: T(id).project_id, ...(T(id).needs_review ? { needs_review: true } : {}) } }); T(id).project_id = to; T(id).needs_review = false }
  }
  try {
    switch (a.kind) {
      case 'create_circle': {
        // As + Add circle: a slug no circle had (retired ones included), a free colour, last in order; the
        // trigger makes its org-chart unit, whose description is the purpose the agents read
        const { data: all } = await admin.from('circles').select('slug, color, sort_order, archived_at')
        const taken = new Set((all ?? []).map(r => r.slug as string))
        const used = new Set((all ?? []).filter(r => !r.archived_at).map(r => r.color as string))
        const slug = slugFor(a.title!, taken)
        const { error } = await admin.from('circles').insert({
          slug, name: a.title!.slice(0, 60), emoji: a.emoji ?? emojiFor(a.title!),
          color: CIRCLE_COLORS.find(c => !used.has(c)) ?? CIRCLE_COLORS[(all?.length ?? 0) % CIRCLE_COLORS.length],
          sort_order: Math.max(0, ...(all ?? []).map(r => r.sort_order as number)) + 1,
        })
        if (error) throw new Error(error.message)
        created.push({ table: 'circles', id: slug, before: {} })
        await admin.from('org_units').update({ description: a.description }).eq('kind', 'circle').eq('circle', slug)
        b.circles.push({ slug, name: a.title! })
        break
      }
      case 'merge_projects': {
        const from = P(a.project)!, into = P(a.into)!
        await moveAll(b.tasks.filter(t => t.project_id === from.id).map(t => t.id), into.id)
        const title = a.title?.trim() || into.title
        if (title !== into.title) await upd('projects', into.id, { title: into.title }, { title })
        // What else hangs on the merged-away task comes along: its updates, agreements, events and places
        for (const table of ['project_updates', 'collaboration_agreements', 'events', 'places'] as const) {
          const { data, error } = await admin.from(table).update({ project_id: into.id }).eq('project_id', from.id).select('id')
          if (error) throw new Error(error.message)
          for (const r of data ?? []) rows.push({ table, id: r.id as string, before: { project_id: from.id } })
        }
        // Then it's deleted, not left in Paused (v4.103.0: Oscar, "why are merged tasks in the pause column, lets just
        // delete them"); Undo puts it back, whole
        const { data: full, error: readErr } = await admin.from('projects').select('*').eq('id', from.id).single()
        if (readErr || !full) throw new Error(readErr?.message ?? 'Task not found')
        const { error: delErr } = await admin.from('projects').delete().eq('id', from.id)
        if (delErr) throw new Error(delErr.message)
        removed.push({ table: 'projects', id: from.id, before: full })
        b.projects.splice(b.projects.indexOf(from), 1)
        break
      }
      case 'rename_project': { const p = P(a.project)!; await upd('projects', p.id, { title: p.title }, { title: a.title!.slice(0, 300) }); break }
      case 'create_project': {
        const { data, error } = await admin.from('projects').insert({
          title: a.title!.slice(0, 300), description: a.description ?? null, circle: a.circle, status: 'backlog', created_by: me.id, lead_user_id: me.id,
        }).select('id').single()
        if (error || !data) throw new Error(error?.message ?? 'Task not created')
        created.push({ table: 'projects', id: data.id as string, before: {} })
        b.projects.push({ id: data.id as string, title: a.title!, description: a.description ?? null, circle: a.circle!, status: 'backlog', is_chores: false, lead_user_id: me.id, created_by: me.id })
        await moveAll(a.tasks ?? [], data.id as string)
        break
      }
      case 'move_tasks': {
        if (a.to) { await moveAll(a.tasks ?? [], a.to); break }
        // Onto the main board: out of its project (v4.34.0), keeping its circle
        for (const id of a.tasks ?? []) {
          const t = T(id)
          const circle = t.circle ?? P(t.project_id)?.circle ?? null
          await upd('deliverables', id, { project_id: t.project_id, circle: t.circle }, { project_id: null, circle })
          t.project_id = null; t.circle = circle
        }
        break
      }
      case 'rename_task': { const t = T(a.tasks![0]); await upd('deliverables', t.id, { title: t.title }, { title: a.title!.slice(0, 300) }); break }
      case 'assign_task': { const t = T(a.tasks![0]); await upd('deliverables', t.id, { assignee_id: t.assignee_id }, { assignee_id: a.person ?? null }); break }
      case 'set_task_date': { const t = T(a.tasks![0]); await upd('deliverables', t.id, { due_date: t.due_date, due_time: t.due_time }, { due_date: a.due_date ?? null, due_time: a.due_date ? a.due_time ?? null : null }); break }
      case 'set_task_status': { const t = T(a.tasks![0]); await upd('deliverables', t.id, { status: t.status }, { status: a.status }); break }
      case 'confirm_drafts': {
        const ids = (a.tasks ?? []).filter(id => T(id).needs_review)
        const { error } = await admin.from('deliverables').update({ needs_review: false }).in('id', ids)
        if (error) throw new Error(error.message)
        for (const id of ids) { rows.push({ table: 'deliverables', id, before: { needs_review: true } }); T(id).needs_review = false }
        break
      }
    }
    return { rows, created, removed }
  } catch (e) {
    return { rows, created, removed, error: (e as Error).message }
  }
}

/** Puts back what a Do change changed (agent_actions.detail.rows / created) */
export async function undoRows(admin: SupabaseClient, detail: { rows?: Row[]; created?: Row[]; removed?: Row[] }) {
  // A deleted task first, so its subtasks, updates and agreements can point back to it
  for (const r of detail.removed ?? []) {
    const { error } = await admin.from(r.table).insert(r.before)
    if (error) throw new Error(error.message)
  }
  for (const r of [...(detail.rows ?? [])].reverse()) {
    const { error } = await admin.from(r.table).update(r.before).eq('id', r.id)
    if (error) throw new Error(error.message)
  }
  for (const c of detail.created ?? []) {
    // A circle is retired, never deleted (its slug stays taken)
    if (c.table === 'circles') { await admin.from('circles').update({ archived_at: new Date().toISOString() }).eq('slug', c.id); continue }
    if (c.table !== 'projects') continue
    const { count } = await admin.from('deliverables').select('id', { count: 'exact', head: true }).eq('project_id', c.id)
    if (!count) await admin.from('projects').delete().eq('id', c.id)
  }
}
