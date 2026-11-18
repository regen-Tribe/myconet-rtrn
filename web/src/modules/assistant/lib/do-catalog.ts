/**
 * Ask / Do, general changes — server only. "The agent can do anything on MyCoNet this person may do":
 * besides the board's own changes (do-actions.ts), the agent can change any field in this catalog, and
 * add or remove people in the org chart. These are made **with the person's own session**
 * (createClient), so the database's rules (RLS, the profile guard trigger) decide exactly as they do
 * for the person's own clicks; MyCoNet adds no rights and checks nothing the database doesn't.
 * The confirm card shows each field before → after (read on the server); Undo puts the old values
 * back, again as the person. Grow the catalog to reach more of MyCoNet (events, bookings, governance).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type FieldType =
  | { t: 'text'; max: number } | { t: 'enum'; values: string[] } | { t: 'bool' } | { t: 'date' } | { t: 'time' }
  | { t: 'person' } | { t: 'circle' } | { t: 'circles' } | { t: 'project' } | { t: 'archived' }

interface TableDef {
  /** What the agent calls it, and the table */
  table: string
  label: string
  /** The row's key column */
  key: string
  /** The column that names the row on the card */
  name: string
  fields: Record<string, { label: string; type: FieldType; column?: string }>
}

const ROLES = ['explorer', 'joining', 'member', 'advisor', 'project_lead', 'circle_lead', 'admin']

export const CATALOG: Record<string, TableDef> = {
  person: {
    table: 'user_profiles', label: 'person', key: 'id', name: 'first_name',
    fields: {
      role: { label: 'role', type: { t: 'enum', values: ROLES } },
      lead_circles: { label: 'leads the circles', type: { t: 'circles' } },
      headline: { label: 'headline', type: { t: 'text', max: 200 } },
    },
  },
  circle: {
    table: 'circles', label: 'circle', key: 'slug', name: 'name',
    fields: {
      name: { label: 'name', type: { t: 'text', max: 60 } },
      emoji: { label: 'emoji', type: { t: 'text', max: 8 } },
      leads_to_assign: { label: 'leads (names, not on MyCoNet yet)', type: { t: 'text', max: 200 } },
      is_steward: { label: 'steward circle', type: { t: 'bool' } },
      archived: { label: 'retired', type: { t: 'archived' }, column: 'archived_at' },
    },
  },
  unit: {
    table: 'org_units', label: 'org-chart unit', key: 'id', name: 'name',
    fields: {
      name: { label: 'name', type: { t: 'text', max: 80 } },
      description: { label: 'description', type: { t: 'text', max: 600 } },
    },
  },
  project: {
    table: 'projects', label: 'project', key: 'id', name: 'title',
    fields: {
      title: { label: 'title', type: { t: 'text', max: 300 } },
      description: { label: 'description', type: { t: 'text', max: 2000 } },
      status: { label: 'status', type: { t: 'enum', values: ['pending', 'backlog', 'in_progress', 'review', 'done', 'paused'] } },
      circle: { label: 'circle', type: { t: 'circle' } },
      lead_user_id: { label: 'lead', type: { t: 'person' } },
      deadline: { label: 'deadline', type: { t: 'date' } },
      open_for_collaborators: { label: 'open for collaborators', type: { t: 'bool' } },
    },
  },
  task: {
    table: 'deliverables', label: 'task', key: 'id', name: 'title',
    fields: {
      title: { label: 'title', type: { t: 'text', max: 300 } },
      status: { label: 'status', type: { t: 'enum', values: ['backlog', 'in_progress', 'review', 'done'] } },
      assignee_id: { label: 'person', type: { t: 'person' } },
      due_date: { label: 'due date', type: { t: 'date' } },
      due_time: { label: 'due time', type: { t: 'time' } },
      circle: { label: 'circle', type: { t: 'circle' } },
      project_id: { label: 'project', type: { t: 'project' } },
      needs_review: { label: 'draft', type: { t: 'bool' } },
    },
  },
}

/** What the agent sees to find rows: short references per kind */
export interface Refs {
  people: { id: string; name: string; role: string; lead_circles: string[] }[]
  circles: { slug: string; name: string }[]
  units: { id: string; kind: string; circle: string; name: string }[]
  members: { unit_id: string; user_id: string; role: string }[]
  projects: { id: string; title: string }[]
  tasks: { id: string; title: string }[]
}

export async function loadRefs(admin: SupabaseClient, board: { projects: { id: string; title: string }[]; tasks: { id: string; title: string }[] }): Promise<Refs> {
  const [u, c, o, m] = await Promise.all([
    admin.from('user_profiles').select('id, first_name, last_name, username, role, lead_circles'),
    admin.from('circles').select('slug, name').is('archived_at', null).order('sort_order'),
    admin.from('org_units').select('id, kind, circle, name').order('sort_order'),
    admin.from('org_unit_members').select('unit_id, user_id, role'),
  ])
  return {
    people: (u.data ?? []).map(p => ({ id: p.id as string, name: [p.first_name, p.last_name].filter(Boolean).join(' ') || (p.username as string) || 'Member', role: (p.role as string) ?? 'explorer', lead_circles: (p.lead_circles ?? []) as string[] })),
    circles: (c.data ?? []) as Refs['circles'],
    units: (o.data ?? []) as Refs['units'],
    members: (m.data ?? []) as Refs['members'],
    projects: board.projects, tasks: board.tasks,
  }
}

/** The catalog and the people / circles / units, for the planner's prompt */
export function catalogPrompt(r: Refs): string {
  const fields = Object.entries(CATALOG).map(([k, d]) => `- ${k} (${d.label}): ${Object.entries(d.fields).map(([f, x]) => {
    const t = x.type
    const how = t.t === 'enum' ? t.values.join('|') : t.t === 'circles' ? '{"add":["C1"],"remove":["C2"]}' : t.t === 'person' ? 'U-ref or null' : t.t === 'circle' ? 'C-ref or null' : t.t === 'project' ? 'P-ref' : t.t === 'archived' ? 'true|false' : t.t
    return `${f}=${how}`
  }).join(', ')}`).join('\n')
  const unitName = (u: Refs['units'][number]) => `${u.kind === 'circle' ? 'circle' : 'team'} ${u.name}${u.kind !== 'circle' ? ` (in ${r.circles.find(c => c.slug === u.circle)?.name ?? u.circle})` : ''}`
  return `General changes (made with the person's own rights; the database refuses what they may not do):
- update {"what":"person|circle|unit|project|task","row":"U1|C1|O1|P1|T1","set":{"field":value,…}}
- add_member {"unit":"O1","person":"U1","role":"lead|member","title":"optional role title"}: put someone in a circle or team of the org chart
- remove_member {"unit":"O1","person":"U1"}
Fields you may set:
${fields}
To make someone a circle lead: update person, set role "circle_lead" (keep "admin" if they are an admin: then only add the circle) and lead_circles {"add":["C…"]}. Never lower someone's role unless asked.

People (ref · name · role · leads):
${r.people.map((p, i) => `U${i + 1} · ${p.name} · ${p.role}${p.lead_circles.length ? ` · leads ${p.lead_circles.join(', ')}` : ''}`).join('\n')}
Circles: ${r.circles.map((c, i) => `C${i + 1} ${c.slug} (${c.name})`).join(', ')}
Org chart (ref · unit · members):
${r.units.map((u, i) => `O${i + 1} · ${unitName(u)}${(() => { const ms = r.members.filter(m => m.unit_id === u.id); return ms.length ? ` · ${ms.map(m => `${r.people.find(p => p.id === m.user_id)?.name ?? '?'}${m.role === 'lead' ? ' (lead)' : ''}`).join(', ')}` : '' })()}`).join('\n')}`
}

export type GeneralAction =
  | { kind: 'update'; what: string; key: string; set: Record<string, unknown> }
  | { kind: 'add_member'; unit: string; person: string; role: 'lead' | 'member'; title: string | null }
  | { kind: 'remove_member'; unit: string; person: string }

/** The planner's general change with its references resolved and every value checked; null if it doesn't fit */
export function resolveGeneral(raw: Record<string, unknown>, r: Refs, P: (ref: unknown) => string | undefined, T: (ref: unknown) => string | undefined): GeneralAction | null {
  const U = (ref: unknown) => (typeof ref === 'string' && /^U\d+$/.test(ref) ? r.people[+ref.slice(1) - 1]?.id : undefined)
  const C = (ref: unknown) => (typeof ref === 'string' && /^C\d+$/.test(ref) ? r.circles[+ref.slice(1) - 1]?.slug : r.circles.find(c => c.slug === ref)?.slug)
  const O = (ref: unknown) => (typeof ref === 'string' && /^O\d+$/.test(ref) ? r.units[+ref.slice(1) - 1]?.id : undefined)
  if (raw.kind === 'add_member' || raw.kind === 'remove_member') {
    const unit = O(raw.unit), person = U(raw.person)
    if (!unit || !person) return null
    if (raw.kind === 'remove_member') return { kind: 'remove_member', unit, person }
    return { kind: 'add_member', unit, person, role: raw.role === 'lead' ? 'lead' : 'member', title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim().slice(0, 80) : null }
  }
  if (raw.kind !== 'update') return null
  const what = String(raw.what ?? '')
  const def = CATALOG[what]
  if (!def) return null
  const key = what === 'person' ? U(raw.row) : what === 'circle' ? C(raw.row) : what === 'unit' ? O(raw.row) : what === 'project' ? P(raw.row) : T(raw.row)
  if (!key || !raw.set || typeof raw.set !== 'object') return null
  const set: Record<string, unknown> = {}
  for (const [f, v] of Object.entries(raw.set as Record<string, unknown>)) {
    const field = def.fields[f]
    if (!field) continue
    const t = field.type
    if (t.t === 'text') { if (typeof v === 'string') set[f] = v.trim().slice(0, t.max) || null; else if (v === null) set[f] = null }
    else if (t.t === 'enum') { if (t.values.includes(String(v))) set[f] = String(v) }
    else if (t.t === 'bool' || t.t === 'archived') { if (typeof v === 'boolean') set[f] = v }
    else if (t.t === 'date') { if (v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v))) set[f] = v }
    else if (t.t === 'time') { if (v === null || (typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v))) set[f] = v === null ? null : String(v).padStart(5, '0') }
    else if (t.t === 'person') { const id = v === null ? null : U(v); if (id !== undefined) set[f] = id }
    else if (t.t === 'circle') { const s = v === null ? null : C(v); if (s !== undefined) set[f] = s }
    else if (t.t === 'project') { const id = P(v); if (id) set[f] = id }
    else if (t.t === 'circles') {
      const ops = v as { add?: unknown[]; remove?: unknown[] } | unknown[]
      const list = (xs: unknown) => (Array.isArray(xs) ? xs.map(C).filter((x): x is string => !!x) : [])
      set[f] = Array.isArray(ops) ? { replace: list(ops) } : { add: list(ops?.add), remove: list(ops?.remove) }
    }
  }
  if (what === 'person' && set.role && r.people.find(p => p.id === key)?.role === 'admin' && set.role !== 'admin') {
    // Making an admin a circle lead keeps them admin; lowering a role needs saying so plainly (it's on the card)
    if (set.role === 'circle_lead') delete set.role
  }
  return Object.keys(set).length ? { kind: 'update', what, key, set } : null
}

type Before = Record<string, unknown>

/** The row as it is, for the card and for undo */
async function current(admin: SupabaseClient, def: TableDef, key: string): Promise<Before | null> {
  const cols = [def.key, def.name, ...Object.entries(def.fields).map(([f, x]) => x.column ?? f)].filter((c, i, a) => a.indexOf(c) === i)
  if (def.table === 'user_profiles') cols.push('last_name', 'username')
  const { data } = await admin.from(def.table).select(cols.join(', ')).eq(def.key, key).maybeSingle()
  return (data as Before | null) ?? null
}

/** The database values a general update writes (lists merged, archived → a time) */
function toColumns(def: TableDef, before: Before, set: Record<string, unknown>): Before {
  const out: Before = {}
  for (const [f, v] of Object.entries(set)) {
    const field = def.fields[f]
    if (field.type.t === 'circles') {
      const cur = new Set((before[f] as string[] | null) ?? [])
      const ops = v as { add?: string[]; remove?: string[]; replace?: string[] }
      const next = ops.replace ? new Set(ops.replace) : new Set([...cur, ...(ops.add ?? [])].filter(x => !(ops.remove ?? []).includes(x)))
      out[f] = [...next]
    } else if (field.type.t === 'archived') out[field.column!] = v ? (before[field.column!] ?? new Date().toISOString()) : null
    else out[field.column ?? f] = v
  }
  return out
}

export async function describeGeneral(admin: SupabaseClient, a: GeneralAction, r: Refs): Promise<string | null> {
  const person = (id: unknown) => r.people.find(p => p.id === id)?.name ?? (id ? 'someone' : 'nobody')
  const circle = (s: unknown) => r.circles.find(c => c.slug === s)?.name ?? (s ? String(s) : 'none')
  const unitName = (id: string) => { const u = r.units.find(x => x.id === id); return u ? `${u.kind === 'circle' ? 'the' : 'the team'} ${u.name}${u.kind === 'circle' ? ' circle' : ''}` : 'a unit' }
  if (a.kind === 'add_member') return `Add ${person(a.person)} to ${unitName(a.unit)}${a.role === 'lead' ? ' as its lead' : ''}${a.title ? ` (${a.title})` : ''}`
  if (a.kind === 'remove_member') return r.members.some(m => m.unit_id === a.unit && m.user_id === a.person) ? `Take ${person(a.person)} out of ${unitName(a.unit)}` : null
  const def = CATALOG[a.what]
  const before = await current(admin, def, a.key)
  if (!before) return null
  const after = toColumns(def, before, a.set)
  const show = (f: string, v: unknown) => {
    const t = def.fields[f].type
    if (v === null || v === undefined || (Array.isArray(v) && !v.length)) return '—'
    if (t.t === 'person') return person(v)
    if (t.t === 'circle') return circle(v)
    if (t.t === 'circles') return (v as string[]).map(circle).join(', ')
    if (t.t === 'project') return r.projects.find(p => p.id === v)?.title ?? 'a project'
    if (t.t === 'archived') return v ? 'yes' : 'no'
    if (t.t === 'bool') return v ? 'yes' : 'no'
    return String(v).replace(/_/g, ' ')
  }
  const changes = Object.keys(a.set).map(f => {
    const col = def.fields[f].column ?? f
    return `${def.fields[f].label} ${show(f, before[col])} → ${show(f, after[col])}`
  }).filter((line, i) => { const f = Object.keys(a.set)[i]; const col = def.fields[f].column ?? f; return JSON.stringify(before[col] ?? null) !== JSON.stringify(after[col] ?? null) })
  if (!changes.length) return null
  const name = a.what === 'person' ? person(a.key) : String(before[def.name] ?? '')
  return `${def.label[0].toUpperCase()}${def.label.slice(1)} “${name}”: ${changes.join('; ')}`
}

export interface GeneralRow { table: string; match: Record<string, unknown>; before: Before | null; inserted?: boolean }

/** Makes a general change with the person's own session; the database decides */
export async function executeGeneral(admin: SupabaseClient, mine: SupabaseClient, a: GeneralAction): Promise<{ rows: GeneralRow[]; error?: string }> {
  if (a.kind === 'add_member') {
    const { data, error } = await mine.from('org_unit_members').insert({ unit_id: a.unit, user_id: a.person, role: a.role, title: a.title }).select('unit_id')
    if (error) return { rows: [], error: error.code === '23505' ? 'They’re already in it.' : error.message }
    if (!data?.length) return { rows: [], error: 'You can’t change that part of the org chart.' }
    return { rows: [{ table: 'org_unit_members', match: { unit_id: a.unit, user_id: a.person }, before: null, inserted: true }] }
  }
  if (a.kind === 'remove_member') {
    const { data: old } = await admin.from('org_unit_members').select('unit_id, user_id, role, title').eq('unit_id', a.unit).eq('user_id', a.person).maybeSingle()
    const { data, error } = await mine.from('org_unit_members').delete().eq('unit_id', a.unit).eq('user_id', a.person).select('unit_id')
    if (error) return { rows: [], error: error.message }
    if (!data?.length) return { rows: [], error: 'You can’t change that part of the org chart.' }
    return { rows: [{ table: 'org_unit_members', match: { unit_id: a.unit, user_id: a.person }, before: old as Before }] }
  }
  const def = CATALOG[a.what]
  const before = await current(admin, def, a.key)
  if (!before) return { rows: [], error: 'It’s gone.' }
  const changes = toColumns(def, before, a.set)
  const prev: Before = Object.fromEntries(Object.keys(changes).map(c => [c, before[c] ?? null]))
  // RLS refuses silently (no rows back), so ask for the row
  const { data, error } = await mine.from(def.table).update(changes).eq(def.key, a.key).select(def.key)
  if (error) return { rows: [], error: error.code === '42501' ? 'You’re not allowed to change that.' : error.message }
  if (!data?.length) return { rows: [], error: 'You’re not allowed to change that.' }
  return { rows: [{ table: def.table, match: { [def.key]: a.key }, before: prev }] }
}

/** Puts a general change back, again with the person's own session */
export async function undoGeneral(mine: SupabaseClient, rows: GeneralRow[]) {
  for (const r of [...rows].reverse()) {
    let q
    if (r.inserted) q = mine.from(r.table).delete()
    else if (r.table === 'org_unit_members' && r.before) { const { error } = await mine.from(r.table).insert(r.before); if (error) throw new Error(error.message); continue }
    else q = mine.from(r.table).update(r.before ?? {})
    for (const [k, v] of Object.entries(r.match)) q = q.eq(k, v as string)
    const { error } = await q
    if (error) throw new Error(error.message)
  }
}
