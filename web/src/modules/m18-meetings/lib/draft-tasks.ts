/**
 * The agent's part of the meeting pipeline — server only. One AI call reads what Fireflies sent
 * (action items, summary, transcript) against the community's circles and board, and decides:
 *   - is this a community meeting at all? (the Fireflies account may also record other calls)
 *   - its main circle, or none for a community-wide meeting (a morning sync touches every circle)
 *   - the tasks: one per agreed piece of work, each with its own circle, person, date/time said,
 *     tagged with that circle on the main board (its Chores), or in an open project of that circle only
 *     when the agent is very sure it's part of that project's work (v4.24.3).
 *   - its name: the title people gave, made to say what the meeting was about (the date goes in front)
 * It skips what's already on the board and adds what was clearly agreed but missed by Fireflies.
 * Without the AI the action items go on as they are, but only when a person already set the circle.
 */
import type { ActionItem } from '../types'

const MODEL = 'MiniMax-M3.1-Flash'
const MAX_TRANSCRIPT = 40_000
const MAX_TASKS = 30

export interface DraftInput {
  /** title: what people (or Fireflies) called it, before the agent named it */
  meeting: { title: string; date: string; summary: string | null; transcript: string | null; action_items: ActionItem[]; attendees: string[] }
  /** Set when a person chose the circle (upload or meeting page); the agent then keeps it */
  fixedCircle: string | null
  circles: { slug: string; name: string; description: string | null }[]
  /** Open projects (not Chores), with their circle */
  projects: { id: string; title: string; description: string | null; circle: string | null }[]
  /** Open tasks already on the board */
  openTasks: { title: string; circle: string | null; project_title: string | null }[]
  /** Members' names, so the AI keeps their spellings */
  people: string[]
  community: string
  timeZone: string
}

export interface DraftTask {
  title: string
  circle: string
  /** The person as named in the meeting; matched to a member later */
  person: string | null
  /** An open project of the task's circle when the agent is very sure; null = the main board (Chores) */
  project_id: string | null
  /** Why it belongs to that project (logged); null on the main board */
  project_reason: string | null
  due_date: string | null
  due_time: string | null
  /** Fireflies' action item it came from, if any */
  item_index: number | null
  /** What was said, kept with the task */
  source_text: string
}

export interface DraftResult {
  /** False: not this community's meeting, or not sure; nothing goes on the board */
  isCommunity: boolean
  /** The meeting's main circle; null = community-wide */
  circle: string | null
  reason: string | null
  /** The meeting's name from its content (no date); null without the AI */
  title: string | null
  tasks: DraftTask[]
  by: 'ai' | 'action-items' | 'none'
  note?: string
}

/** "2026-11-17" and "Tuesday" for a moment, in the community's time zone */
export function localDay(iso: string, timeZone: string): { date: string; weekday: string } {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(d)
  return { date, weekday }
}

/** "17.11.2026" for the community's YYYY-MM-DD */
export const dottedDate = (ymd: string) => ymd.split('-').reverse().join('.')

/** "17.11.2026 Kitchen lead handover": the date, then the agent's name for it */
export const meetingName = (ymd: string, title: string) => `${dottedDate(ymd)} ${title.replace(/^\s*\d{1,2}[./ -]\d{1,2}[./ -]\d{4}\s*[-–·:]?\s*/, '').trim()}`

// Fireflies' headings that aren't people ("Unassigned", "Kitchen Circle")
const NOT_A_PERSON = /^(unassigned|no one|nobody|everyone|everybody|all|team|the team|group|tbd|n\/a|.+ circle)$/i

const clean = (s: string, max: number) => s.replace(/\s+/g, ' ').replace(/[.;]+$/, '').trim().slice(0, max)

/** Fireflies' action items as tasks, as they are, in a circle a person chose */
export function fallbackDrafts(items: ActionItem[], circle: string): DraftTask[] {
  return items.slice(0, MAX_TASKS).map((it, i) => ({
    title: clean(it.text, 120), circle, person: it.speaker && !NOT_A_PERSON.test(it.speaker.trim()) ? it.speaker : null, project_id: null, project_reason: null, due_date: null, due_time: null,
    item_index: i, source_text: it.text,
  })).filter(t => t.title)
}

function prompt(input: DraftInput): string {
  const { date, weekday } = localDay(input.meeting.date, input.timeZone)
  const circleName = (slug: string | null) => input.circles.find(c => c.slug === slug)?.name ?? slug ?? 'no circle'
  const circles = input.circles.map(c => `- ${c.slug} · ${c.name}${c.description ? ` — ${c.description.replace(/\s+/g, ' ').slice(0, 200)}` : ''}`).join('\n')
  const projects = input.projects.map(p => `- ${p.id} · [${p.circle ?? 'none'}] ${p.title}${p.description ? ` — ${p.description.replace(/\s+/g, ' ').slice(0, 140)}` : ''}`).join('\n') || '(none)'
  const open = input.openTasks.slice(0, 150).map(t => `- [${t.circle ?? 'none'}] ${t.title}${t.project_title ? ` (${t.project_title})` : ''}`).join('\n') || '(none)'
  const items = input.meeting.action_items.map((it, i) => `${i}. ${it.speaker ? `[${it.speaker}] ` : ''}${it.text}`).join('\n') || '(none)'
  const transcript = (input.meeting.transcript ?? '').slice(0, MAX_TRANSCRIPT)
  return `You are the agent of ${input.community}, a community organised in circles. A meeting recording was transcribed by Fireflies. Make sense of it and turn it into tasks for the community's task board.

The meeting was on ${weekday} ${date} (time zone ${input.timeZone}).

1. ${input.fixedCircle ? `A person confirmed this is a meeting of ${input.community}: set "community": true.` : `Decide whether this is a meeting of ${input.community} (its people, its land, its projects, its circles). The same Fireflies account may record other calls (personal, client, other organisations): for those, or when you're not sure, set "community": false and return no tasks.`}
2. ${input.fixedCircle ? `A person set this meeting's circle: ${input.fixedCircle} (${circleName(input.fixedCircle)}). Keep it as the main circle.` : 'Choose the meeting\'s main circle: the circle most of the discussion and work belongs to, even if a task or two belong to other circles. Use null only when it is community-wide: a general sync, community circle or logistics meeting with reports from several circles.'}
3. Make one task per concrete thing someone agreed to do. Start from the action items, and use the summary and transcript for who does it, by when, and anything clearly agreed that the action items missed. Skip anything already in "Open tasks on the board". Leave out vague intentions, discussion points and decisions that need no work.
4. Give each task the circle whose work it is (it can differ from the meeting's circle). By default it goes on the community's main board tagged with that circle (project_id null). Put it in one of the open projects below only when you are very sure it is part of that project's work: the meeting names the project, or the work is unmistakably a piece of it, and the project is in the same circle. Then say why in project_reason. If in any doubt, leave project_id null.

5. Name the meeting: start from its title ("${input.meeting.title}") when that says something, and use the content to make it say what the meeting was about: the circle or group and the main topics, under 70 characters, no date (it is added in front), no quotes. A title that is only a time or a date ("Nov 12, 10:36 AM") says nothing: name it from the content alone.

Return JSON only:
{"community":true|false,"title":"the meeting's name","circle":"a circle slug or null","reason":"one short sentence: why this circle, or why it isn't a community meeting","tasks":[{"title":"short imperative, under 90 characters, no person's name","circle":"a circle slug","person":"the person's name as said, or null","project_id":"an open project's id, only when very sure, else null","project_reason":"why it is part of that project, or null","due_date":"YYYY-MM-DD or null","due_time":"HH:MM 24h or null","item":the action item number it comes from, or null,"source":"the action item's words, or a short quote from the transcript"}]}

Dates only when the meeting says one; work relative ones ("by Friday", "next week", "tomorrow") out from ${weekday} ${date}. "Next week" with no day means the Monday after. At most ${MAX_TASKS} tasks.
${input.people.length ? `\nMembers' names (use these spellings when one matches): ${input.people.slice(0, 200).join(', ')}` : ''}

Circles:
${circles}

Open projects (id · [circle] title):
${projects}

Open tasks on the board:
${open}

Meeting title: ${input.meeting.title}
${input.meeting.attendees.length ? `Who was there: ${input.meeting.attendees.join(', ')}\n` : ''}
Action items (Fireflies):
${items}

Summary (Fireflies):
${input.meeting.summary ?? '(none)'}

Transcript${transcript.length === MAX_TRANSCRIPT ? ' (start)' : ''}:
${transcript || '(none)'}`
}

const hhmm = (v: unknown): string | null => {
  const m = typeof v === 'string' ? v.trim().match(/^(\d{1,2}):(\d{2})$/) : null
  return m && +m[1] < 24 && +m[2] < 60 ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}
const ymd = (v: unknown): string | null =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) && !Number.isNaN(Date.parse(v.trim())) ? v.trim() : null
const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? clean(v, max) : null)

export function parseDrafts(content: string, input: DraftInput): Omit<DraftResult, 'by' | 'note'> | null {
  const c = content.replace(/<think>[\s\S]*?<\/think>/g, '')
  const start = c.indexOf('{'), end = c.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  let raw: Record<string, unknown>
  try { raw = JSON.parse(c.slice(start, end + 1)) } catch { return null }
  if (typeof raw.community !== 'boolean' || !Array.isArray(raw.tasks)) return null
  const slugs = new Set(input.circles.map(c => c.slug))
  const projectCircle = new Map(input.projects.map(p => [p.id, p.circle]))
  const circle = input.fixedCircle ?? (typeof raw.circle === 'string' && slugs.has(raw.circle) ? raw.circle : null)
  const reason = str(raw.reason, 300)
  const title = str(raw.title, 90)?.replace(/^["“']|["”']$/g, '') || null
  // A person who chose the circle has already decided it's a community meeting
  if (!raw.community && !input.fixedCircle) return { isCommunity: false, circle: null, reason, title, tasks: [] }
  // Fireflies groups some items under a circle ("Kitchen Circle"): that's no person
  const circleNames = new Set(input.circles.flatMap(c => [c.slug, c.name]).flatMap(n => { const k = n.toLowerCase().trim(); return [k, `${k} circle`, k.replace(/ circle$/, '')] }))
  const personOf = (v: string | null) => (v && !circleNames.has(v.toLowerCase().trim()) && !NOT_A_PERSON.test(v.trim()) ? v : null)

  const items = input.meeting.action_items
  const tasks: DraftTask[] = []
  for (const t of (raw.tasks as Record<string, unknown>[]).slice(0, MAX_TASKS)) {
    const taskTitle = str(t?.title, 120)
    // Each task needs a circle (its own, else the meeting's) to land on the board
    const taskCircle = typeof t?.circle === 'string' && slugs.has(t.circle) ? t.circle : circle
    if (!taskTitle || !taskCircle) continue
    const idx = typeof t.item === 'number' && Number.isInteger(t.item) && items[t.item] ? t.item : null
    const date = ymd(t.due_date)
    // A project only with a reason and in the task's own circle; anything else goes on the main board
    const projectReason = str(t.project_reason, 200)
    const pid = typeof t.project_id === 'string' && projectReason && projectCircle.get(t.project_id) === taskCircle ? t.project_id : null
    tasks.push({
      title: taskTitle, circle: taskCircle,
      person: personOf(str(t.person, 80) ?? (idx !== null ? items[idx].speaker : null)),
      project_id: pid, project_reason: pid ? projectReason : null, due_date: date, due_time: date ? hhmm(t.due_time) : null,
      item_index: idx, source_text: str(t.source, 400) ?? (idx !== null ? items[idx].text : taskTitle),
    })
  }
  return { isCommunity: true, circle, reason, title, tasks }
}

/** The agent's reading of the meeting; without the AI, the action items in the circle a person chose */
export async function draftTasks(input: DraftInput, opts: { timeoutMs: number }): Promise<DraftResult> {
  const fallback = (note: string): DraftResult => input.fixedCircle
    ? { isCommunity: true, circle: input.fixedCircle, reason: null, title: null, tasks: fallbackDrafts(input.meeting.action_items, input.fixedCircle), by: 'action-items', note }
    // No circle and no AI: a lead has to look at it
    : { isCommunity: false, circle: null, reason: `The assistant couldn’t read this meeting yet (${note}). It tries again by itself, up to 3 times; a lead can also choose its circle to continue.`, title: null, tasks: [], by: 'none', note }
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) return fallback('MINIMAX_API_KEY not set')
  if (!input.meeting.action_items.length && !input.meeting.summary && !input.meeting.transcript) {
    return { isCommunity: !!input.fixedCircle, circle: input.fixedCircle, reason: 'The meeting has no notes.', title: null, tasks: [], by: 'none' }
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs)
  try {
    const res = await fetch('https://api.minimax.io/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, reasoning_effort: 'low', max_completion_tokens: 8000, messages: [{ role: 'user', content: prompt(input) }] }),
    })
    if (!res.ok) return fallback(`AI ${res.status}`)
    const data = await res.json().catch(() => ({})) as { choices?: { message?: { content?: string } }[] }
    const parsed = parseDrafts(data.choices?.[0]?.message?.content ?? '', input)
    return parsed ? { ...parsed, by: 'ai' } : fallback('AI answer unreadable')
  } catch (e) {
    return fallback((e as Error).name === 'AbortError' ? 'AI took too long' : `AI: ${(e as Error).message}`)
  } finally {
    clearTimeout(timer)
  }
}
