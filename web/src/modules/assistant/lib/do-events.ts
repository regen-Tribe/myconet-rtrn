/**
 * Ask / Do, calendar events (v4.65.0) — server only. Oscar: "we want the agent to be able to change events on
 * the calendar - update time, date, notes in it". The same rules as the person's own clicks on the Calendar:
 *   - its time (date, start, end, all day): `event_set_times`, which joining members and up may call, as anyone
 *     can move an event on the Calendar; an event from the linked Google calendar moves there too
 *   - title, description, place, online link: an update as the person (RLS: its host, an admin, or a lead of
 *     its circle); not for events from the Google calendar, which Google would overwrite on the next sync
 *   - the description of an event from the Google calendar is its notes: `event_set_notes` (full members)
 * Then its Google copy is brought in step (m14-events/lib/google-push.ts), as the Calendar does. Times are the
 * community's time zone (COMMUNITY_TIME_ZONE). Undo puts the old values back, again as the person.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { isFullMember } from '@/core/lib/roles'
import { canEditEvent } from '@/modules/m14-events/lib/permissions'
import { pushEventToGoogle } from '@/modules/m14-events/lib/google-push'
import type { Me } from './do-actions'

const TZ = () => process.env.COMMUNITY_TIME_ZONE || 'UTC'
const DAY = 86_400_000

/* ─── Time zone: the community's wall clock ↔ UTC ─────────────────── */

function parts(ms: number, tz: string) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' })
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map(x => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, weekday: p.weekday as string }
}

/** How far the zone's clock is ahead of UTC at this moment, in ms */
function offset(ms: number, tz: string) {
  const p = parts(ms, tz)
  const [y, m, d] = p.date.split('-').map(Number), [h, mi] = p.time.split(':').map(Number)
  return Date.UTC(y, m - 1, d, h, mi) - (ms - (ms % 60_000))
}

/** "2026-11-21" + "18:00" on the community's clock → an ISO time */
function toUtc(date: string, time: string, tz: string): string {
  const [y, m, d] = date.split('-').map(Number), [h, mi] = time.split(':').map(Number)
  const wall = Date.UTC(y, m - 1, d, h, mi)
  let t = wall - offset(wall, tz)
  const o2 = offset(t, tz)
  if (o2 !== wall - t) t = wall - o2 // across a clock change
  return new Date(t).toISOString()
}

const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10)

/** "Fri 2026-11-21 18:00–20:00", "Sat 2026-11-22 all day" */
function when(e: { starts_at: string; ends_at: string | null; all_day: boolean }, tz = TZ()) {
  const s = parts(Date.parse(e.starts_at), tz)
  const en = e.ends_at ? parts(Date.parse(e.ends_at), tz) : null
  if (e.all_day) return `${s.weekday} ${s.date} all day${en && en.date !== s.date ? ` to ${en.weekday} ${en.date}` : ''}`
  return `${s.weekday} ${s.date} ${s.time}${en ? `–${en.date !== s.date ? `${en.weekday} ${en.date} ` : ''}${en.time}` : ''}`
}

/* ─── What the planner sees ───────────────────────────────────────── */

export interface EventRef { id: string; title: string; starts_at: string; ends_at: string | null; all_day: boolean; kind: string; circle: string | null; feed: boolean }

const REF_COLS = 'id, title, starts_at, ends_at, all_day, kind, circle, feed_id'
const toRef = (e: Record<string, unknown>): EventRef => ({
  id: e.id as string, title: e.title as string, starts_at: e.starts_at as string, ends_at: (e.ends_at as string | null) ?? null,
  all_day: !!e.all_day, kind: e.kind as string, circle: (e.circle as string | null) ?? null, feed: !!e.feed_id,
})

/**
 * The events a request can mean: a week back to two months ahead, daily ones only for the next week (there
 * are hundreds), and the one open on screen wherever it is. Board tasks on the calendar are changed as tasks.
 */
export async function loadEventRefs(admin: SupabaseClient, openId?: string | null): Promise<EventRef[]> {
  const now = Date.now()
  const { data } = await admin.from('events').select(REF_COLS).neq('kind', 'task')
    .gte('starts_at', new Date(now - 7 * DAY).toISOString()).lte('starts_at', new Date(now + 60 * DAY).toISOString())
    .order('starts_at').limit(500)
  const list = (data ?? []).map(toRef).filter(e => e.kind !== 'daily' || Date.parse(e.starts_at) < now + 7 * DAY)
  if (openId && !list.some(e => e.id === openId)) {
    const { data: one } = await admin.from('events').select(REF_COLS).eq('id', openId).maybeSingle()
    if (one) list.push(toRef(one))
  }
  return list.slice(0, 250)
}

export function eventsPrompt(events: EventRef[]): string {
  return `Calendar events (made with the person's own rights; times are ${TZ()} time):
- change_event {"event":"E1","set":{"title":"…","date":"YYYY-MM-DD","start":"HH:MM","end":"HH:MM or null","all_day":true|false,"description":"…","location":"…","link":"https://… or null"}}: only the fields to change. A new date keeps its times; a new start keeps its length unless an end is given. "description" is the event's notes. Events marked "from Google" take only date, start, end, all_day and description.
Events (ref · when · title · calendar · circle):
${events.map((e, i) => `E${i + 1} · ${when(e)} · ${e.title} · ${e.kind}${e.circle ? ` · [${e.circle}]` : ''}${e.feed ? ' · from Google' : ''}`).join('\n') || '(none)'}`
}

/** "Has event E3 open" when the Calendar shows one (/calendar?event=…) */
export function eventContext(path: string | undefined, events: EventRef[]): string {
  if (!path) return ''
  const url = new URL(path, 'https://x')
  const id = url.pathname === '/calendar' ? url.searchParams.get('event') : null
  const i = id ? events.findIndex(e => e.id === id) : -1
  return i < 0 ? '' : `Has event E${i + 1} "${events[i].title}" (${when(events[i])}) open`
}

/* ─── The change ──────────────────────────────────────────────────── */

export interface EventSet { title?: string; description?: string | null; location?: string | null; link?: string | null; date?: string; start?: string; end?: string | null; all_day?: boolean }
export interface EventAction { kind: 'change_event'; event: string; set: EventSet }

const TIME_KEYS = ['date', 'start', 'end', 'all_day'] as const
const FIELD_KEYS = ['title', 'description', 'location', 'link'] as const
const COLUMN: Record<(typeof FIELD_KEYS)[number], string> = { title: 'title', description: 'description', location: 'location', link: 'online_url' }

/** The planner's change_event with its reference resolved and every value checked; null if it doesn't fit */
export function resolveEvent(raw: Record<string, unknown>, events: EventRef[]): EventAction | null {
  const ref = raw.event
  const e = typeof ref === 'string' && /^E\d+$/.test(ref) ? events[+ref.slice(1) - 1] : undefined
  return e ? checkEvent({ kind: 'change_event', event: e.id, set: raw.set }) : null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A change_event checked value by value (the planner's, or one sent back from the card); null if it doesn't fit */
export function checkEvent(raw: { kind?: unknown; event?: unknown; set?: unknown }): EventAction | null {
  if (raw.kind !== 'change_event' || typeof raw.event !== 'string' || !UUID.test(raw.event) || !raw.set || typeof raw.set !== 'object') return null
  const v = raw.set as Record<string, unknown>
  const set: EventSet = {}
  const text = (x: unknown, max: number) => (typeof x === 'string' ? x.trim().slice(0, max) || null : x === null ? null : undefined)
  const t = text(v.title, 300); if (t) set.title = t
  for (const [k, max] of [['description', 5000], ['location', 300]] as const) { const x = text(v[k], max); if (x !== undefined) set[k] = x }
  if (v.link === null || (typeof v.link === 'string' && /^https?:\/\/\S+$/i.test(v.link.trim()))) set.link = v.link === null ? null : (v.link as string).trim().slice(0, 1000)
  if (typeof v.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.date)) set.date = v.date
  if (typeof v.start === 'string' && /^\d{1,2}:\d{2}$/.test(v.start)) set.start = v.start.padStart(5, '0')
  if (v.end === null || (typeof v.end === 'string' && /^\d{1,2}:\d{2}$/.test(v.end))) set.end = v.end === null ? null : (v.end as string).padStart(5, '0')
  if (typeof v.all_day === 'boolean') set.all_day = v.all_day
  return Object.keys(set).length ? { kind: 'change_event', event: raw.event, set } : null
}

interface Row { id: string; title: string; description: string | null; location: string | null; online_url: string | null; notes: string | null; starts_at: string; ends_at: string | null; all_day: boolean; created_by: string; circle: string | null; feed_id: string | null }
const ROW_COLS = 'id, title, description, location, online_url, notes, starts_at, ends_at, all_day, created_by, circle, feed_id'

async function row(admin: SupabaseClient, id: string): Promise<Row | null> {
  const { data } = await admin.from('events').select(ROW_COLS).eq('id', id).maybeSingle()
  return (data as Row | null) ?? null
}

/** The new start, end and all-day from the change, or null when the time doesn't change */
function newTimes(r: Row, s: EventSet): { starts_at: string; ends_at: string | null; all_day: boolean } | { error: string } | null {
  if (!TIME_KEYS.some(k => k in s)) return null
  const tz = TZ()
  const cur = parts(Date.parse(r.starts_at), tz)
  const date = s.date ?? cur.date
  const allDay = s.all_day ?? r.all_day
  const length = r.ends_at ? Date.parse(r.ends_at) - Date.parse(r.starts_at) : null
  if (allDay) {
    // As the Calendar's form stores them: the first day at 00:00, the last at 23:59
    const days = r.all_day && r.ends_at ? Math.round((Date.parse(`${parts(Date.parse(r.ends_at), tz).date}T00:00:00Z`) - Date.parse(`${cur.date}T00:00:00Z`)) / DAY) : null
    return { starts_at: toUtc(date, '00:00', tz), ends_at: days ? toUtc(addDays(date, days), '23:59', tz) : null, all_day: true }
  }
  if (r.all_day && !s.start) return { error: 'Say what time it starts.' }
  const starts = toUtc(date, s.start ?? cur.time, tz)
  let ends: string | null
  if ('end' in s) {
    if (s.end === null) ends = null
    else {
      ends = toUtc(date, s.end!, tz)
      if (Date.parse(ends) <= Date.parse(starts)) ends = toUtc(addDays(date, 1), s.end!, tz) // past midnight
    }
  } else ends = length !== null && !r.all_day ? new Date(Date.parse(starts) + length).toISOString() : null
  return { starts_at: starts, ends_at: ends, all_day: false }
}

/** Why this person can't make the change, or null (the card says it before they confirm) */
export async function eventBlocked(admin: SupabaseClient, a: EventAction, me: Me): Promise<string | null> {
  const r = await row(admin, a.event)
  if (!r) return 'That event is gone.'
  const fields = FIELD_KEYS.filter(k => k in a.set)
  if (r.feed_id) {
    if (fields.some(k => k !== 'description')) return 'This event comes from the linked Google calendar: change its title, place and link there. Its time and description can change here.'
    if ('description' in a.set && !isFullMember(me.role)) return 'Only full members can add descriptions to events from the Google calendar.'
  } else if (fields.length && !canEditEvent(r, me.id, me.role, me.leadCircles)) return 'Only its host, an admin, or a lead of its circle can change this event’s details.'
  const t = newTimes(r, a.set)
  return t && 'error' in t ? t.error : null
}

export async function describeEvent(admin: SupabaseClient, a: EventAction): Promise<string | null> {
  const r = await row(admin, a.event)
  if (!r) return null
  const lines: string[] = []
  const t = newTimes(r, a.set)
  if (t && !('error' in t)) { const from = when(r), to = when(t); if (from !== to) lines.push(`time ${from} → ${to}`) }
  const show = (x: string | null | undefined) => (x ? `“${x.length > 60 ? `${x.slice(0, 60)}…` : x}”` : '—')
  for (const k of FIELD_KEYS) {
    if (!(k in a.set)) continue
    const before = k === 'description' && r.feed_id ? r.notes : (r[COLUMN[k] as keyof Row] as string | null)
    const after = a.set[k] ?? null
    if ((before ?? null) !== after) lines.push(`${k === 'link' ? 'online link' : k === 'location' ? 'place' : k} ${show(before)} → ${show(after)}`)
  }
  return lines.length ? `Event “${r.title}”: ${lines.join('; ')}` : null
}

/** What undo needs: the old values of what changed */
export interface EventUndo { id: string; times?: { starts_at: string; ends_at: string | null; all_day: boolean }; fields?: Record<string, string | null>; notes?: string | null }

/** Makes the change with the person's own session; the database decides. Then Google follows. */
export async function executeEvent(admin: SupabaseClient, mine: SupabaseClient, a: EventAction, me: Me, origin: string): Promise<{ undo: EventUndo | null; error?: string; google?: string }> {
  const r = await row(admin, a.event)
  if (!r) return { undo: null, error: 'It’s gone.' }
  const undo: EventUndo = { id: r.id }
  let error: string | undefined
  const t = newTimes(r, a.set)
  if (t && 'error' in t) return { undo: null, error: t.error }
  if (t) {
    const { error: e } = await mine.rpc('event_set_times', { p_event_id: r.id, p_starts_at: t.starts_at, p_ends_at: t.ends_at, p_all_day: t.all_day })
    if (e) return { undo: null, error: e.code === '42501' ? 'You can’t change this event’s time.' : e.message }
    undo.times = { starts_at: r.starts_at, ends_at: r.ends_at, all_day: r.all_day }
  }
  if (r.feed_id && 'description' in a.set) {
    const { error: e } = await mine.rpc('event_set_notes', { p_event_id: r.id, p_notes: a.set.description ?? '' })
    if (e) error = e.code === '42501' ? 'Only full members can add descriptions.' : e.message
    else undo.notes = r.notes
  }
  const cols = Object.fromEntries(FIELD_KEYS.filter(k => k in a.set && !r.feed_id).map(k => [COLUMN[k], a.set[k] ?? null]))
  if (Object.keys(cols).length) {
    // RLS refuses silently (no rows back), so ask for the row
    const { data, error: e } = await mine.from('events').update(cols).eq('id', r.id).select('id')
    if (e || !data?.length) error = e && e.code !== '42501' ? e.message : 'Only its host, an admin, or a lead of its circle can change its details.'
    else undo.fields = Object.fromEntries(Object.keys(cols).map(c => [c, r[c as keyof Row] as string | null]))
  }
  const changed = !!(undo.times || undo.fields || 'notes' in undo)
  const google = changed && (undo.times || undo.fields) ? await pushEventToGoogle(mine, me.id, r.id, undo.fields ? 'saved' : 'times', origin) : null
  return { undo: changed ? undo : null, ...(error ? { error } : {}), ...(google?.ok && google.googleError ? { google: `Google Calendar wasn’t updated: ${google.googleError}` } : {}) }
}

/** Puts an event change back, again as the person, and brings Google in step */
export async function undoEvent(mine: SupabaseClient, userId: string, u: EventUndo, origin: string) {
  if (u.fields) {
    const { data, error } = await mine.from('events').update(u.fields).eq('id', u.id).select('id')
    if (error || !data?.length) throw new Error(error?.message ?? 'You can’t change this event’s details.')
  }
  if ('notes' in u) {
    const { error } = await mine.rpc('event_set_notes', { p_event_id: u.id, p_notes: u.notes ?? '' })
    if (error) throw new Error(error.message)
  }
  if (u.times) {
    const { error } = await mine.rpc('event_set_times', { p_event_id: u.id, p_starts_at: u.times.starts_at, p_ends_at: u.times.ends_at, p_all_day: u.times.all_day })
    if (error) throw new Error(error.message)
  }
  if (u.times || u.fields) await pushEventToGoogle(mine, userId, u.id, u.fields ? 'saved' : 'times', origin)
}
