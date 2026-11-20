/**
 * Ask / Do: the agent reads a person's instruction against the board and proposes changes — server
 * only. One AI call; the board goes in with short references (P1, T1) and comes back as DoActions with
 * real ids. Nothing is changed here: the person confirms on the card, then /api/agent/do makes it.
 */
import { localDay } from '@/modules/m18-meetings/lib/draft-tasks'
import { type Board, type DoAction, type DoKind, TASK_STATUSES } from './do-actions'
import { catalogPrompt, resolveGeneral, type GeneralAction, type Refs } from './do-catalog'
import { eventsPrompt, resolveEvent, type EventAction, type EventRef } from './do-events'

const MODEL = 'MiniMax-M3.1-Flash'
const MAX_ACTIONS = 8
const KINDS: DoKind[] = ['create_circle', 'merge_projects', 'rename_project', 'create_project', 'move_tasks', 'rename_task', 'assign_task', 'set_task_date', 'set_task_status', 'confirm_drafts']

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

function prompt(instruction: string, history: { role: string; content: string }[], b: Board, refs: Refs, events: EventRef[], meName: string, community: string, context = '', brain = '') {
  const open = b.tasks.filter(t => t.status !== 'done')
  const pRef = new Map(b.projects.map((p, i) => [p.id, `P${i + 1}`]))
  const person = (id: string | null) => b.people.find(p => p.id === id)?.name ?? null
  const projects = b.projects.filter(p => !p.is_chores).map(p =>
    `${pRef.get(p.id)} · [${p.circle ?? 'none'}] ${p.title} · ${p.status} · ${b.tasks.filter(t => t.project_id === p.id && t.status !== 'done').length} open tasks${person(p.lead_user_id) ? ` · lead ${person(p.lead_user_id)}` : ''}`).join('\n') || '(none)'
  const tasks = open.map(t => {
    const p = b.projects.find(x => x.id === t.project_id)
    return `T${b.tasks.indexOf(t) + 1} · [${t.circle ?? p?.circle ?? 'none'}] ${t.title} · ${p && !p.is_chores ? pRef.get(p.id) : 'board'} · ${person(t.assignee_id) ?? 'nobody'}${t.due_date ? ` · due ${t.due_date}` : ''} · ${t.status}${t.needs_review ? ' · draft' : ''}`
  }).join('\n')
  const { date, weekday } = localDay(new Date().toISOString(), process.env.COMMUNITY_TIME_ZONE || 'UTC')
  return `You are the MyCoNet agent of ${community}. ${meName} is signed in and asks you to change something in MyCoNet. You may do anything they may do themselves: turn the request into changes from the lists below (the board's own changes first when one fits, else a general change). People use loose names ("the 4 elements project" can mean "Elemental Community Ceremony"): match by meaning. If the request is unclear, could mean several things, or isn't possible with these changes, make no changes and ask one short question in "reply". Never invent projects, tasks or people. Today is ${weekday} ${date}.

Words (the community's lexicon, 20 Nov): a P-row is a **task** (it can have subtasks), a T-row is a **subtask** of its P, or a task of its own when it has no P, and a circle's team is a **subcircle**. Say task, subtask and subcircle in everything you write back; never project or team.

Changes you can make:
- create_circle {"name":"…","purpose":"one line: what this circle looks after","emoji":"one emoji, or null"}: a new circle of the community, only when asked to create one; if what it looks after isn't clear from the request, ask instead
- merge_projects {"project":"P2","into":"P1","title":"the merged project's new name, or null to keep P1's"}: P2's tasks move into P1, P2 is set aside
- rename_project {"project":"P1","title":"…"}
- create_project {"title":"…","description":"one sentence","circle":"a circle slug","tasks":["T1",…]}
- move_tasks {"tasks":["T1",…],"to":"P1, or null for the main board"}
- rename_task {"task":"T1","title":"…"}
- assign_task {"task":"T1","person":"a name from People, or null for nobody"}
- set_task_date {"task":"T1","due_date":"YYYY-MM-DD or null","due_time":"HH:MM or null"}
- set_task_status {"task":"T1","status":"backlog|in_progress|review|done"}
- confirm_drafts {"tasks":["T1",…]}

${catalogPrompt(refs)}

${eventsPrompt(events)}

Return JSON only: {"reply":"one or two friendly sentences: what you'll do, or your question","actions":[{"kind":"…",…}]}

Circles: ${b.circles.map(c => `${c.slug} (${c.name})`).join(', ')}
People: ${b.people.map(p => p.name).slice(0, 200).join(', ')}

Projects (ref · [circle] title · status · open tasks · lead):
${projects}

Open tasks (ref · [circle] title · project or board · who · due · status):
${tasks || '(none)'}
${history.length ? `\nThe conversation so far:\n${history.slice(-6).map(m => `${m.role === 'user' ? meName : 'Agent'}: ${m.content.slice(0, 500)}`).join('\n')}\n` : ''}
${context ? `\nWhat ${meName} is looking at right now ("this", "here" and "these" mean what's here):\n${context}\n` : ''}
${brain ? `\nFrom the community's second brain (notes ${meName} may read; use them to understand the request, e.g. "the tasks from last week's kitchen meeting" — they change nothing by themselves, and the board above is what's true now):\n${brain}\n` : ''}
${meName}'s request: ${instruction}`
}

export async function planChanges(instruction: string, history: { role: string; content: string }[], b: Board, refs: Refs, events: EventRef[], meName: string, context = '', brain = ''): Promise<{ reply: string; actions: (DoAction | GeneralAction | EventAction)[] }> {
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) throw new Error('The agent isn’t set up (MINIMAX_API_KEY).')
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 60_000)
  let raw: { reply?: unknown; actions?: unknown }
  try {
    const res = await fetch('https://api.minimax.io/v1/chat/completions', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, reasoning_effort: 'low', max_completion_tokens: 4000, messages: [{ role: 'user', content: prompt(instruction, history, b, refs, events, meName, process.env.NEXT_PUBLIC_COMMUNITY_NAME || 'the community', context, brain) }] }),
    })
    if (!res.ok) throw new Error(`The agent is busy (AI ${res.status}). Try again in a moment.`)
    const data = await res.json() as { choices?: { message?: { content?: string } }[] }
    const c = (data.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '')
    raw = JSON.parse(c.slice(c.indexOf('{'), c.lastIndexOf('}') + 1))
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('The agent took too long. Try a shorter request.')
    if (e instanceof SyntaxError) throw new Error('The agent’s answer didn’t make sense. Try saying it another way.')
    throw e
  } finally {
    clearTimeout(timer)
  }

  const P = (ref: unknown) => (typeof ref === 'string' && /^P\d+$/.test(ref) ? b.projects[+ref.slice(1) - 1]?.id : undefined)
  const T = (ref: unknown) => (typeof ref === 'string' && /^T\d+$/.test(ref) ? b.tasks[+ref.slice(1) - 1]?.id : undefined)
  const s = (v: unknown, max = 300) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)
  const who = (name: unknown): string | null | undefined => {
    if (name === null) return null
    const n = typeof name === 'string' ? norm(name) : ''
    if (!n) return undefined
    const full = b.people.filter(p => norm(p.name) === n)
    if (full.length === 1) return full[0].id
    const first = b.people.filter(p => norm(p.name).split(' ')[0] === n.split(' ')[0])
    return first.length === 1 ? first[0].id : undefined
  }
  const actions: (DoAction | GeneralAction | EventAction)[] = []
  for (const r of (Array.isArray(raw.actions) ? raw.actions : []).slice(0, MAX_ACTIONS) as Record<string, unknown>[]) {
    if (r.kind === 'change_event') {
      const e = resolveEvent(r, events)
      if (e) actions.push(e)
      continue
    }
    if (r.kind === 'update' || r.kind === 'add_member' || r.kind === 'remove_member') {
      const g = resolveGeneral(r, refs, P, T)
      if (g) actions.push(g)
      continue
    }
    const kind = r.kind as DoKind
    if (!KINDS.includes(kind)) continue
    const tasks = [...(Array.isArray(r.tasks) ? r.tasks : []), r.task].map(T).filter((x): x is string => !!x)
    const a: DoAction = { kind, tasks }
    if (kind === 'create_circle') {
      a.title = s(r.name, 60); a.description = s(r.purpose, 300) ?? null
      const e = s(r.emoji, 8); if (e && !/[a-z0-9]/i.test(e)) a.emoji = e
      if (!a.title || !a.description) continue
    }
    if (kind === 'merge_projects') { a.project = P(r.project); a.into = P(r.into); a.title = s(r.title) }
    if (kind === 'rename_project') { a.project = P(r.project); a.title = s(r.title) }
    if (kind === 'create_project') { a.title = s(r.title); a.description = s(r.description, 400) ?? null; a.circle = s(r.circle, 80) }
    if (kind === 'move_tasks') a.to = r.to === null || r.to === 'board' ? null : P(r.to)
    if (kind === 'rename_task') a.title = s(r.title)
    if (kind === 'assign_task') { const id = who(r.person); if (id === undefined) continue; a.person = id }
    if (kind === 'set_task_date') {
      a.due_date = typeof r.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.due_date) ? r.due_date : null
      a.due_time = typeof r.due_time === 'string' && /^\d{1,2}:\d{2}$/.test(r.due_time) ? r.due_time.padStart(5, '0') : null
    }
    if (kind === 'set_task_status') { if (!TASK_STATUSES.includes(String(r.status))) continue; a.status = String(r.status) }
    if (kind === 'move_tasks' && r.to && !a.to) continue
    actions.push(a)
  }
  return { reply: s(raw.reply, 600) ?? (actions.length ? 'Here’s what I’d change:' : 'I’m not sure what to change. Can you say it another way?'), actions }
}
