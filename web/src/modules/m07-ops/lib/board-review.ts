/**
 * The project manager — server only, service role. When new tasks come in for a circle (a meeting's
 * pipeline asks: requestBoardReview), the agent reads that circle's whole board, like a project
 * manager, in one AI call:
 *   - duplicates: the same piece of work twice
 *   - tasks that belong to an existing project of the circle
 *   - groups of tasks that make a project nobody has made yet
 *   - tasks without a person, and who in the community could take them
 *   - a short status of the circle's board
 * The safe things it does itself, each logged in agent_actions with what's needed to undo it:
 * merging duplicates that are both its own drafts, and filing a Chores task or a draft into a project
 * when it's very sure. Everything else becomes a suggestion (agent_suggestions) for the circle's
 * leads. The status goes to the circle's own folder in the second brain (<folder>/board.md), next to
 * its README (circle-space.ts), which this keeps up to date too.
 * One circle per request: a Worker may make only 50 outside calls per request.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { deleteFile, listPaths, saveNote, secondBrainOn } from '@/modules/m18-meetings/lib/second-brain'
import { updateCircleSpace, type CircleRow } from './circle-space'
import { matchPerson, displayName, type PersonProfile } from '@/modules/m18-meetings/lib/people'

const MODEL = 'MiniMax-M3.1-Flash'
const ACTOR = 'project-manager'
const MAX_TASKS = 120
const MAX_AUTO_MERGES = 6

export interface ReviewResult {
  ok: boolean
  merged: number
  moved: number
  suggested: number
  note: string | null
  errors: string[]
}

/** A circle's board changed (new tasks from a meeting): review it on the next sweep */
export async function requestBoardReview(admin: SupabaseClient, circles: string[]) {
  const list = [...new Set(circles.filter(Boolean))]
  if (!list.length) return
  await admin.from('board_reviews').upsert(list.map(circle => ({ circle, requested_at: new Date().toISOString(), attempts: 0 })), { onConflict: 'circle' })
}

interface Task {
  id: string; title: string; project_id: string | null; assignee_id: string | null; due_date: string | null
  /** Someone not on MyCoNet yet (a typed name) */
  assignee_name?: string | null
  priority?: string | null
  status: string; needs_review: boolean; source: string | null; source_meeting_id: string | null
  notes?: string | null
}
interface Project { id: string; title: string; description: string | null; is_chores: boolean; status: string }

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim().slice(0, max) : null

function prompt(circleName: string, community: string, projects: Project[], tasks: Task[], people: string[], nameOf: (id: string | null) => string | null, dismissed: string[]) {
  const pIdx = new Map(projects.map((p, i) => [p.id, `P${i + 1}`]))
  const projLines = projects.filter(p => !p.is_chores)
    .map(p => `${pIdx.get(p.id)} · ${p.title}${p.description ? ` — ${p.description.replace(/\s+/g, ' ').slice(0, 160)}` : ''}`).join('\n') || '(none)'
  const taskLines = tasks.map((t, i) => {
    const p = projects.find(x => x.id === t.project_id)
    const where = p && !p.is_chores ? pIdx.get(p.id) : 'board'
    const who = nameOf(t.assignee_id) ?? (t.assignee_name ? `${t.assignee_name} (not on MyCoNet yet)` : null)
    return `T${i + 1} · [${where}] ${t.title}${who ? ` · ${who}` : ' · nobody'}${t.due_date ? ` · due ${t.due_date}` : ''}${t.priority && t.priority !== 'none' ? ` · ${t.priority} priority` : ''} · ${t.status}${t.needs_review ? ' · draft' : ''}`
  }).join('\n')
  return `You are the project manager of the ${circleName} circle of ${community}. Review the circle's board and help it stay organised. Be conservative: only propose what a careful, experienced project manager would.

Find:
1. "duplicates": two tasks that are the same piece of work. Keep the clearer one (the one with a person or a date, or confirmed over draft).
2. "moves": a task on the board ("[board]") that clearly belongs to one of the circle's projects.
3. "new_projects": three or more open tasks that together are one larger piece of work no project covers yet: a short project title, a one-sentence description, and its tasks.
4. "assign": a task with nobody on it, when one of the people below is the obvious person (it's their area or they talked about it). Use the exact name. A task with a name "(not on MyCoNet yet)": suggest a person below only when they are clearly that same person (they've since joined).
5. "status": the circle's board in 3–6 short markdown bullets: what's moving, what's next, what's stuck or late, what needs a person. Name tasks and projects by their titles here, never by T1/P1.

For each item say "sure": true only when you have no doubt. Don't repeat what was already turned down: ${dismissed.length ? dismissed.join(' · ') : '(nothing)'}.

Return JSON only:
{"duplicates":[{"keep":"T1","drop":"T2","sure":true,"reason":"…"}],"moves":[{"task":"T3","project":"P1","sure":true,"reason":"…"}],"new_projects":[{"title":"…","description":"…","tasks":["T4","T5","T6"],"reason":"…"}],"assign":[{"task":"T7","person":"…","reason":"…"}],"status":"- …\\n- …"}

People: ${people.slice(0, 150).join(', ') || '(none)'}

Projects of the circle:
${projLines}

Open tasks (id · [where] title · who · due · status):
${taskLines}`
}

export async function reviewCircle(admin: SupabaseClient, circle: string, opts: { timeoutMs: number }): Promise<ReviewResult> {
  const errors: string[] = []
  const log = (rows: object[]) => rows.length ? admin.from('agent_actions').insert(rows).then(({ error }) => { if (error) errors.push(`log: ${error.message}`) }) : Promise.resolve()
  const [circleRes, projRes, taskRes, peopleRes, sugRes] = await Promise.all([
    admin.from('circles').select('slug, name, emoji, archived_at, brain_folder, leads_to_assign').eq('slug', circle).maybeSingle(),
    admin.from('projects').select('id, title, description, is_chores, status').eq('circle', circle).in('status', ['pending', 'backlog', 'in_progress', 'review']),
    admin.from('deliverables').select('id, title, project_id, assignee_id, assignee_name, priority, due_date, status, needs_review, source, source_meeting_id, notes')
      .eq('circle', circle).neq('status', 'done').order('created_at').limit(MAX_TASKS),
    admin.from('user_profiles').select('id, first_name, last_name, username, role, lead_circles'),
    admin.from('agent_suggestions').select('kind, payload, status, decided_note').eq('circle', circle).in('status', ['dismissed']).gte('decided_at', new Date(Date.now() - 60 * 86400_000).toISOString()),
  ])
  if (!circleRes.data) return { ok: false, merged: 0, moved: 0, suggested: 0, note: null, errors: ['no such circle'] }
  const circleName = circleRes.data.name as string
  const projects = (projRes.data ?? []) as Project[]
  const tasks = (taskRes.data ?? []) as Task[]
  // Shared accounts ("Protopia admin") aren't people who take on work
  const everyone = (peopleRes.data ?? []) as PersonProfile[]
  const people = everyone.filter(p => !/admin/i.test(`${p.username ?? ''} ${displayName(p)}`))
  const nameOf = (id: string | null) => { const p = id ? everyone.find(x => x.id === id) : null; return p ? displayName(p) : null }
  const circleRow = circleRes.data as CircleRow
  // Its space in the second brain: README (index) + board.md, written after every review
  const writeSpace = async (status: string | null, left: Task[], suggestions: { kind: string; payload: object; reason: string | null }[]) => {
    if (!secondBrainOn()) return null
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      const [paths, unitsRes] = await Promise.all([
        listPaths(),
        // The circle's place in the org chart and its teams, with their people
        admin.from('org_units').select('id, kind, name, description, members:org_unit_members(user_id)').eq('circle', circle).order('sort_order'),
      ])
      const units = (unitsRes.data ?? []) as { id: string; kind: string; name: string; description: string | null; members: { user_id: string }[] }[]
      const unit = { data: units.find(u => u.kind === 'circle') ?? null }
      const nameById = (id: string) => { const p = everyone.find(x => x.id === id); return p ? displayName(p) : null }
      const names = (u: (typeof units)[number]) => u.members.map(m => nameById(m.user_id)).filter((n): n is string => !!n)
      const leads = everyone.filter(p => ((p as PersonProfile & { lead_circles?: string[] }).lead_circles ?? []).includes(circle)).map(displayName)
      const { folder } = await updateCircleSpace(admin, circleRow, {
        purpose: (unit.data?.description as string | null) ?? null, leads, paths,
        members: unit.data ? names(unit.data) : [],
        teams: units.filter(u => u.kind === 'team').map(u => ({ name: u.name, people: names(u) })),
        projects: projects.filter(p => !p.is_chores).map(p => ({ title: p.title, open: left.filter(t => t.project_id === p.id).length, url: `${appUrl}/ops/${p.id}` })),
      })
      const saved = await saveNote(`${folder}/board.md`, buildBoardNote({ circle, circleName, status, projects, tasks: left, nameOf, suggestions }), `Board status: ${circleName}`)
      // Board notes used to live together in knowledge.boardFolder: the agent removes its old copy
      const old = `${(process.env.KNOWLEDGE_BOARD_FOLDER || 'operations/board').replace(/^\/+|\/+$/g, '')}/${circleName.replace(/[\\/:*?"<>|#^[\]&]+/g, ' ').replace(/\s+/g, ' ').trim()}.md`
      if (paths.has(old) && old !== `${folder}/board.md`) await deleteFile(old, `Board status moved to ${folder}/board.md`)
      return saved.url
    } catch (e) {
      errors.push(`second brain: ${(e as Error).message}`)
      return null
    }
  }
  // What leads turned down, and what they asked for instead (v4.36.0)
  const dismissed = (sugRes.data ?? []).map(s => `${s.kind}: ${(s.payload as { title?: string; label?: string }).title ?? (s.payload as { label?: string }).label ?? ''}${s.decided_note ? ` (the lead wanted instead: "${String(s.decided_note).slice(0, 200)}")` : ''}`).slice(0, 30)
  // No open tasks (a new circle): nothing for the AI, but the circle still gets its space
  if (!tasks.length || circleRow.archived_at) {
    const note = await writeSpace(circleRow.archived_at ? '- This circle is retired.' : '- No open tasks yet.', tasks, [])
    await admin.from('board_reviews').update({ reviewed_at: new Date().toISOString(), attempts: 0, last_error: errors.length ? errors.join(' · ').slice(0, 500) : null }).eq('circle', circle)
    return { ok: true, merged: 0, moved: 0, suggested: 0, note, errors }
  }

  // ── The AI reads the board ──
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) return { ok: false, merged: 0, moved: 0, suggested: 0, note: null, errors: ['MINIMAX_API_KEY not set'] }
  const community = process.env.NEXT_PUBLIC_COMMUNITY_NAME || 'the community'
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs)
  let raw: Record<string, unknown>
  try {
    const res = await fetch('https://api.minimax.io/v1/chat/completions', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, reasoning_effort: 'low', max_completion_tokens: 6000, messages: [{ role: 'user', content: prompt(circleName, community, projects, tasks, people.map(displayName), nameOf, dismissed) }] }),
    })
    if (!res.ok) throw new Error(`AI ${res.status}`)
    const data = await res.json() as { choices?: { message?: { content?: string } }[] }
    const c = (data.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '')
    raw = JSON.parse(c.slice(c.indexOf('{'), c.lastIndexOf('}') + 1))
  } catch (e) {
    const msg = (e as Error).name === 'AbortError' ? 'AI took too long' : (e as Error).message
    await admin.from('board_reviews').update({ last_error: msg }).eq('circle', circle)
    return { ok: false, merged: 0, moved: 0, suggested: 0, note: null, errors: [msg] }
  } finally {
    clearTimeout(timer)
  }

  const T = (ref: unknown) => (typeof ref === 'string' && /^T\d+$/.test(ref) ? tasks[+ref.slice(1) - 1] ?? null : null)
  const P = (ref: unknown) => (typeof ref === 'string' && /^P\d+$/.test(ref) ? projects[+ref.slice(1) - 1] ?? null : null)
  // On the board with no project (v4.34.0; before that, in the circle's chores project)
  const isChores = (t: Task) => !t.project_id || !!projects.find(p => p.id === t.project_id)?.is_chores
  const agentDraft = (t: Task) => t.needs_review && t.source === 'meeting'
  const gone = new Set<string>()
  const dropped = new Set<string>()
  const movedTo = new Map<string, string>()
  const suggestions: { kind: string; payload: object; reason: string | null }[] = []

  // ── Duplicates: both the agent's own drafts → merge now; otherwise a suggestion ──
  let merged = 0
  const mergeLog: object[] = []
  for (const d of Array.isArray(raw.duplicates) ? raw.duplicates as Record<string, unknown>[] : []) {
    const keep = T(d.keep), drop = T(d.drop)
    if (!keep || !drop || keep.id === drop.id || gone.has(keep.id) || gone.has(drop.id)) continue
    const reason = str(d.reason, 240)
    if (d.sure === true && agentDraft(keep) && agentDraft(drop) && merged < MAX_AUTO_MERGES) {
      const r = await mergeTasks(admin, keep, drop)
      if (r.error) { errors.push(`merge: ${r.error}`); continue }
      gone.add(drop.id); dropped.add(drop.id); merged++
      mergeLog.push({ actor: ACTOR, action: 'pm_merge', target_table: 'deliverables', target_id: keep.id, meeting_id: drop.source_meeting_id, detail: { circle, reason, kept: keep.title, dropped: r.dropped, links: r.links, filled: r.filled } })
    } else {
      suggestions.push({ kind: 'merge', payload: { keep: keep.id, drop: drop.id, label: `${keep.title} ⟵ ${drop.title}` }, reason })
    }
  }

  // ── Into a project: a board task or a draft, when very sure → now; otherwise a suggestion ──
  let moved = 0
  const moveLog: object[] = []
  const movesByProject = new Map<string, Task[]>()
  for (const m of Array.isArray(raw.moves) ? raw.moves as Record<string, unknown>[] : []) {
    const t = T(m.task), p = P(m.project)
    if (!t || !p || p.is_chores || gone.has(t.id) || t.project_id === p.id) continue
    const reason = str(m.reason, 240)
    if (m.sure === true && reason && (isChores(t) || agentDraft(t))) {
      movesByProject.set(p.id, [...(movesByProject.get(p.id) ?? []), t])
      moveLog.push({ actor: ACTOR, action: 'pm_move', target_table: 'deliverables', target_id: t.id, meeting_id: t.source_meeting_id, detail: { circle, reason, title: t.title, from: t.project_id, to: p.id, project: p.title } })
    } else {
      suggestions.push({ kind: 'move', payload: { task: t.id, project: p.id, label: `${t.title} → ${p.title}` }, reason })
    }
  }
  for (const [pid, list] of movesByProject) {
    const { error } = await admin.from('deliverables').update({ project_id: pid }).in('id', list.map(t => t.id))
    if (error) errors.push(`move: ${error.message}`)
    else { moved += list.length; for (const t of list) { gone.add(t.id); movedTo.set(t.id, pid) } }
  }

  // ── New projects and people: suggestions for the leads ──
  for (const n of Array.isArray(raw.new_projects) ? raw.new_projects as Record<string, unknown>[] : []) {
    const title = str(n.title, 120)
    const ids = (Array.isArray(n.tasks) ? n.tasks : []).map(T).filter((t): t is Task => !!t && !gone.has(t.id)).map(t => t.id)
    if (title && ids.length >= 2) suggestions.push({ kind: 'new_project', payload: { title, description: str(n.description, 400), tasks: [...new Set(ids)] }, reason: str(n.reason, 240) })
  }
  for (const a of Array.isArray(raw.assign) ? raw.assign as Record<string, unknown>[] : []) {
    const t = T(a.task)
    const person = matchPerson(str(a.person, 80), people)
    if (t && person && !t.assignee_id && !gone.has(t.id)) suggestions.push({ kind: 'assign', payload: { task: t.id, person_id: person.id, person: person.name, label: `${t.title} → ${person.name}` }, reason: str(a.reason, 240) })
  }

  // A review replaces the circle's open suggestions: what's still right is suggested again
  await admin.from('agent_suggestions').update({ status: 'stale' }).eq('circle', circle).eq('status', 'open')
  if (suggestions.length) {
    const { error } = await admin.from('agent_suggestions').insert(suggestions.map(s => ({ ...s, circle })))
    if (error) errors.push(`suggestions: ${error.message}`)
  }
  await log([...mergeLog, ...moveLog])

  // ── The circle's space in the second brain: README + board status ──
  // The AI's T1/P1 references mean nothing to a reader: names instead
  const status = str(raw.status, 2000)
    ? String(raw.status).trim().slice(0, 2000).replace(/\b([TP])(\d+)\b/g, (m, k, n) => (k === 'T' ? tasks[+n - 1] : projects[+n - 1]) ? `“${(k === 'T' ? tasks[+n - 1] : projects[+n - 1]).title}”` : m)
    : null
  // The board as it is now: without merged-away tasks, moved ones in their project
  const note = await writeSpace(status, tasks.filter(t => !dropped.has(t.id)).map(t => (movedTo.has(t.id) ? { ...t, project_id: movedTo.get(t.id)! } : t)), suggestions)

  await admin.from('board_reviews').update({ reviewed_at: new Date().toISOString(), attempts: 0, last_error: errors.length ? errors.join(' · ').slice(0, 500) : null }).eq('circle', circle)
  return { ok: true, merged, moved, suggested: suggestions.length, note, errors }
}

/**
 * Merge drop into keep: keep takes drop's person / date when it has none, drop's meeting links point
 * to keep (so a re-run doesn't add it again), then drop is deleted. Returns what's needed to undo.
 */
export async function mergeTasks(admin: SupabaseClient, keep: { id: string; assignee_id: string | null; assignee_name?: string | null; due_date: string | null }, drop: { id: string }) {
  const { data: full } = await admin.from('deliverables').select('*').eq('id', drop.id).maybeSingle()
  if (!full) return { error: 'task already gone' }
  const fill: Record<string, unknown> = {}
  if (!keep.assignee_id && full.assignee_id) fill.assignee_id = full.assignee_id
  else if (!keep.assignee_id && !keep.assignee_name && full.assignee_name) fill.assignee_name = full.assignee_name
  if (!keep.due_date && full.due_date) { fill.due_date = full.due_date; fill.due_time = full.due_time }
  if (Object.keys(fill).length) await admin.from('deliverables').update(fill).eq('id', keep.id)
  const { data: links } = await admin.from('meeting_action_links').update({ deliverable_id: keep.id }).eq('deliverable_id', drop.id).select('meeting_id, item_key')
  const { error } = await admin.from('deliverables').delete().eq('id', drop.id)
  if (error) return { error: error.message }
  return { dropped: full, links: links ?? [], filled: fill }
}

function buildBoardNote(n: {
  circle: string; circleName: string; status: string | null; projects: Project[]; tasks: Task[]
  nameOf: (id: string | null) => string | null
  suggestions: { kind: string; payload: object; reason: string | null }[]
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const line = (t: Task) => {
    const who = n.nameOf(t.assignee_id) ?? (t.assignee_name ? `${t.assignee_name} (not on MyCoNet yet)` : null)
    return `- ${t.needs_review ? '(draft) ' : ''}${t.title}${who ? ` · **${who}**` : ' · _nobody yet_'}${t.due_date ? ` · ${t.due_date}` : ''}${t.priority && t.priority !== 'none' ? ` · ${t.priority} priority` : ''} · ${t.status.replace('_', ' ')} → [open](${appUrl}${t.project_id ? `/ops/${t.project_id}` : '/ops'}?task=${t.id})${t.notes?.trim() ? `\n  - _${t.notes.trim().replace(/\s+/g, ' ').slice(0, 300)}_` : ''}`
  }
  const out = [
    '---',
    `title: ${JSON.stringify(`${n.circleName} board`)}`,
    `circle: ${n.circle}`,
    'visibility: members',
    'source: myconet-board',
    `board: ${appUrl}/ops?circle=${n.circle}`,
    `updated: ${new Date().toISOString().slice(0, 10)}`,
    '---',
    '',
    `# ${n.circleName} board`,
    '',
    `*The circle's open work, kept up to date by the MyCoNet project manager after each meeting. [Open the board](${appUrl}/ops?circle=${n.circle}).*`,
    '',
    '## Status', '', n.status || '_No status yet._', '',
  ]
  const byProject = new Map<string, Task[]>()
  for (const t of n.tasks) if (t.project_id) byProject.set(t.project_id, [...(byProject.get(t.project_id) ?? []), t])
  for (const p of n.projects.filter(p => !p.is_chores)) {
    const list = byProject.get(p.id) ?? []
    out.push(`## ${p.title}`, '', ...(p.description ? [`_${p.description.replace(/\s+/g, ' ').trim()}_`, ''] : []), ...(list.length ? list.map(line) : ['_No open tasks._']), '')
  }
  const board = n.tasks.filter(t => n.projects.find(p => p.id === t.project_id)?.is_chores || !n.projects.some(p => p.id === t.project_id))
  if (board.length) out.push('## On the board (no project)', '', ...board.map(line), '')
  if (n.suggestions.length) {
    out.push('## Suggested to the leads', '')
    for (const s of n.suggestions) {
      const p = s.payload as { label?: string; title?: string }
      out.push(`- ${{ merge: 'Merge', move: 'Move', new_project: 'New project', assign: 'Assign' }[s.kind] ?? s.kind}: ${p.label ?? p.title ?? ''}${s.reason ? ` (${s.reason})` : ''}`)
    }
    out.push('')
  }
  return out.join('\n')
}
