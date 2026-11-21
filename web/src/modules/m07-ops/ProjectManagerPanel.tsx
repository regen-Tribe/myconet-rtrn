'use client'

import { InlineIcon } from '@/core/components/v4'
import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useCircles } from '@/core/components/CirclesProvider'
import type { AgentSuggestion, PmAction, SuggestionSource } from './types'
import { instructAgent } from '@/core/lib/agent-context'
import Link from 'next/link'

const KIND: Record<string, string> = { merge: 'Same task twice', move: 'Belongs in a task', new_project: 'Start a task', assign: 'Who could take it' }
const DONE: Record<string, string> = { pm_merge: 'Merged duplicates', pm_move: 'Filed into a task', pm_assign: 'Assigned' }

// Arriving from a circle page's "Project manager" button (/operations?circle=…#pm) opens the panel
const onHash = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb) }
const atPm = () => window.location.hash === '#pm'

type Payload = { label?: string; title?: string; description?: string; tasks?: string[]; keep?: string; drop?: string; task?: string; project?: string; person?: string }
const q = (t: string | undefined) => (t ? <strong style={{ fontWeight: 600 }}>{t}</strong> : 'a task')
/** A task's name that opens its card (v4.79.0), when the board has it */
type Opener = ((id: string) => void) | undefined
const linkBtn: React.CSSProperties = { font: 'inherit', fontWeight: 600, color: 'var(--ink)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', textDecoration: 'underline', textDecorationColor: 'var(--rule)', textUnderlineOffset: 3 }
const taskName = (open: Opener, id: string | undefined, t: string | undefined) =>
  t && id && open ? <button type="button" onClick={() => open(id)} style={linkBtn} title="Open the task">{t}</button> : q(t)

/**
 * What accepting does, in plain words (v4.38.4: Oscar found "A ⟵ B" and "A → B" unclear), and the button that says it.
 * The labels the agent wrote ("A → B") are only the fallback for a task or project that's no longer here.
 */
function explain(s: AgentSuggestion, title: (id?: string) => string | undefined, projectTitle: (id?: string) => string | undefined, open?: Opener): { what: React.ReactNode; button: string } {
  const p = s.payload as Payload
  const [left, right] = (p.label ?? '').split(/ [⟵→] /)
  if (s.kind === 'merge') return {
    what: <>These look like the same piece of work. Keep {taskName(open, p.keep, title(p.keep) ?? left)} and fold {taskName(open, p.drop, title(p.drop) ?? right)} into it: its person, date and meeting link carry over, and it leaves the board.</>,
    button: 'Merge them',
  }
  if (s.kind === 'move') return {
    what: <>Move the task {taskName(open, p.task, title(p.task) ?? left)} into the project {q(projectTitle(p.project) ?? right)}.</>,
    button: 'Move it',
  }
  if (s.kind === 'assign') return {
    what: <>Give the task {taskName(open, p.task, title(p.task) ?? left)} to {q(p.person ?? right)}.</>,
    button: `Give it to ${(p.person ?? right ?? 'them').split(' ')[0]}`,
  }
  const tasks = (p.tasks ?? []).map(id => ({ id, t: title(id) })).filter((x): x is { id: string; t: string } => !!x.t)
  return {
    what: <>Start a new task {q(p.title)}{p.description ? <> ({p.description})</> : null} and move {tasks.length === 1 ? 'this one' : `these ${tasks.length}`} into it as subtasks: {tasks.map((x, i) => <span key={x.id}>{i ? ' · ' : ''}{open ? <button type="button" onClick={() => open(x.id)} style={{ ...linkBtn, fontWeight: 400 }} title="Open the task">{x.t}</button> : x.t}</span>)}.</>,
    button: 'Create the task',
  }
}

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : null)
const STATUS: Record<string, string> = { backlog: 'To do', in_progress: 'In progress', review: 'In review', done: 'Done' }

/**
 * "Where this comes from" (v4.77.0): each task the suggestion is about, with the meeting it was drafted from (its
 * date, who said it, what was said, who was there), or who added it by hand; and when the project manager reviewed.
 */
function Sources({ s, tag, open }: { s: AgentSuggestion; tag: (c: string) => React.ReactNode; open?: Opener }) {
  const list = s.sources ?? []
  const small: React.CSSProperties = { fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }
  const one = (x: SuggestionSource) => {
    const facts = [x.draft ? 'Draft' : STATUS[x.status] ?? x.status, x.project ? `in ${x.project}` : 'on the board', x.person ?? 'nobody on it', x.due_date ? `due ${day(x.due_date)}` : null, x.priority ? `${x.priority} priority` : null].filter(Boolean)
    return (
      <div key={x.task_id} style={{ padding: '8px 0', borderTop: '1px solid var(--rule)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{x.title}</strong>
          {open
            ? <button type="button" onClick={() => open(x.task_id)} style={{ ...small, color: 'var(--m7)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Open task →</button>
            : <Link href={`/operations?task=${x.task_id}`} style={{ ...small, color: 'var(--m7)', textDecoration: 'none' }}>Open task →</Link>}
        </div>
        <div style={small}>{facts.join(' · ')}</div>
        {x.meeting ? (
          <div style={{ marginTop: 6, paddingLeft: 10, borderLeft: '2px solid var(--rule)' }}>
            <div style={{ ...small, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span>From the meeting</span>
              {x.meeting.title
                ? <Link href={`/meetings/${x.meeting.id}`} style={{ fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}>{x.meeting.title} →</Link>
                : <span style={{ fontStyle: 'italic' }}>(a meeting you can’t open)</span>}
              {x.meeting.date && <span>· {day(x.meeting.date)}</span>}
              {x.meeting.circle && tag(x.meeting.circle)}
            </div>
            {x.said && <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.5 }}>“{x.said}”{x.said_by && <span style={{ color: 'var(--ink-3)' }}> · {x.said_by}</span>}</div>}
            {x.meeting.attendees.length > 0 && <div style={{ ...small, marginTop: 2 }}>There: {x.meeting.attendees.join(', ')}</div>}
          </div>
        ) : (
          <div style={{ ...small, marginTop: 4 }}>Added by hand{x.added_by ? ` by ${x.added_by}` : ''}{x.added_at ? ` on ${day(x.added_at)}` : ''}, not from a meeting.</div>
        )}
        {x.notes && <div style={{ ...small, marginTop: 4 }}><span style={{ fontWeight: 600 }}>Notes:</span> {x.notes}</div>}
      </div>
    )
  }
  return (
    <div style={{ marginTop: 8, background: 'var(--bg, var(--surface))', border: '1px solid var(--rule)', borderRadius: 8, padding: '4px 12px 8px' }}>
      {list.length ? list.map(one) : <div style={{ ...small, padding: '8px 0' }}>The tasks it’s about are no longer on the board.</div>}
      <div style={{ ...small, borderTop: '1px solid var(--rule)', paddingTop: 6, fontSize: 11.5 }}>
        The project manager read the circle’s whole board{s.created_at ? ` on ${day(s.created_at)}` : ''}: its open tasks, projects and people, and what leads turned down before.
      </div>
    </div>
  )
}

const btn = (primary = false): React.CSSProperties => ({
  fontSize: 12, fontWeight: 600, borderRadius: 8, padding: '5px 11px', cursor: 'pointer', whiteSpace: 'nowrap',
  color: primary ? '#fff' : 'var(--ink-2)', background: primary ? 'var(--m7)' : 'var(--surface)',
  border: primary ? 'none' : '1px solid var(--rule)',
})

/**
 * The project manager on the board: what the agent suggests for each circle (leads accept or dismiss)
 * and what it did itself in the last two weeks (leads can undo). Everyone sees it; only a circle's
 * leads and admins decide. Filtered by the board's circle filter. Starts collapsed (v4.33.1), except when the
 * page was opened at #pm.
 */
export function ProjectManagerPanel({ suggestions, actions, taskTitles, circle, canDecide, projects = [], teams = [], onOpenTask }: {
  suggestions: AgentSuggestion[]; actions: PmAction[]; taskTitles: Record<string, string>
  /** The board's circle filter: one circle, several, or null / [] for all */
  circle: string | string[] | null; canDecide: (circle: string) => boolean

  /** Where a suggestion can be put instead (v4.38.3): open projects, and the circles' teams */
  projects?: { id: string; title: string; circle: string | null }[]
  teams?: { id: string; name: string; circle: string }[]
  /** Opens a task's card on the board (v4.79.0); without it, task names are plain */
  onOpenTask?: (id: string) => void
}) {
  const circles = useCircles()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  // "Put it in…": a suggestion's other place, per suggestion. '' = as suggested; 'c:<circle>' / 't:<team>' = a new
  // project there; 'p:<project>' = into that existing project (its tasks move in)
  const [where, setWhere] = useState<Record<string, string>>({})
  // Accepted here: they stay, marked accepted and linked to where they went, until the page is reloaded (v4.36.1)
  const [accepted, setAccepted] = useState<{ s: AgentSuggestion; href: string | null }[]>([])
  // "Tell the agent…" on a suggestion: what the lead wants instead (v4.36.0)
  // "Where this comes from", open per suggestion (v4.77.0)
  const [showing, setShowing] = useState<string | null>(null)
  const [telling, setTelling] = useState<string | null>(null)
  const [told, setTold] = useState('')
  function tell(s: AgentSuggestion) {
    if (!told.trim()) return
    instructAgent(told.trim(), { suggestion_id: s.id })
    setTelling(null); setTold('')
    setMsg(null)
  }
  // null until the person toggles it: collapsed, unless the page was opened at #pm
  const [toggled, setToggled] = useState<boolean | null>(null)
  const linkedHere = useSyncExternalStore(onHash, atPm, () => false)
  const open = toggled ?? linkedHere
  const acceptedIds = new Set(accepted.map(a => a.s.id))
  const inFilter = (c: string | null) => !circle || circle.length === 0 || (Array.isArray(circle) ? !!c && circle.includes(c) : c === circle)
  const sugs = suggestions.filter(s => inFilter(s.circle) && !acceptedIds.has(s.id))
  const acceptedShown = accepted.filter(a => inFilter(a.s.circle))
  const done = actions.filter(a => inFilter(a.circle))
  if (!sugs.length && !done.length && !acceptedShown.length) return null

  const overrides = (v: string | undefined) => {
    if (!v) return {}
    if (v.startsWith('c:')) return { circle: v.slice(2) }
    if (v.startsWith('t:')) { const t = teams.find(x => x.id === v.slice(2)); return t ? { circle: t.circle, team_id: t.id } : {} }
    if (v.startsWith('p:')) return { project_id: v.slice(2) }
    return {}
  }

  async function post(url: string, action: string, key: string, accepting?: AgentSuggestion) {
    setBusy(key); setMsg(null)
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...(accepting ? overrides(where[accepting.id]) : {}) }) })
    const data = await res.json().catch(() => ({})) as { error?: string; result?: { project_id?: string | null; task_id?: string | null } }
    setBusy(null)
    if (!res.ok) { setMsg(data.error ?? 'That didn’t work.'); return }
    if (accepting) {
      // Where it went: the project, else the task (opened on the board when it has no project)
      const r = data.result ?? {}
      const href = r.project_id ? `/operations/${r.project_id}${r.task_id ? `?task=${r.task_id}` : ''}` : r.task_id ? `/operations?task=${r.task_id}` : null
      setAccepted(prev => [...prev, { s: accepting, href }])
    }
    router.refresh()
  }

  const tag = (c: string) => {
    const meta = circles.has(c) ? circles.meta(c) : null
    return meta ? <span style={{ fontSize: 10, fontWeight: 600, color: meta.color, background: `${meta.color}15`, padding: '1px 7px', borderRadius: 20 }}>{meta.emoji} {meta.label}</span> : null
  }

  return (
    <div id="pm" style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: '3px solid var(--m7)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}><InlineIcon name="compass" />Project manager</span>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{sugs.length} suggestion{sugs.length === 1 ? '' : 's'}{acceptedShown.length ? ` · ${acceptedShown.length} accepted` : ''}{done.length ? ` · ${done.length} change${done.length === 1 ? '' : 's'} made` : ''}</span>
        <button onClick={() => setToggled(!open)} style={{ ...btn(), marginLeft: 'auto', padding: '3px 10px' }}>{open ? 'Hide' : 'Show'}</button>
      </div>
      {open && (
        <>
          {msg && <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 8 }}>{msg}</div>}
          {sugs.map(s => {
            const p = s.payload as { label?: string; title?: string; description?: string; tasks?: string[] }
            const mayDecide = canDecide(s.circle)
            const plain = explain(s, id => (id ? taskTitles[id] : undefined), id => projects.find(x => x.id === id)?.title, onOpenTask)
            return (
              <div key={s.id} style={{ borderTop: '1px solid var(--rule)', padding: '10px 0 2px', marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{KIND[s.kind] ?? s.kind}</span>
                  {tag(s.circle)}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5 }}>{plain.what}</div>
                {s.reason && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}><span style={{ fontWeight: 600 }}>Why:</span> {s.reason}</div>}
                <button onClick={() => setShowing(showing === s.id ? null : s.id)} aria-expanded={showing === s.id}
                  style={{ fontSize: 12, fontWeight: 600, color: 'var(--m7)', background: 'none', border: 'none', padding: 0, marginTop: 6, cursor: 'pointer' }}>
                  {showing === s.id ? 'Hide where this comes from' : 'Where this comes from'}
                </button>
                {showing === s.id && <Sources s={s} tag={tag} open={onOpenTask} />}
                {mayDecide && (s.kind === 'new_project' || s.kind === 'move') && (() => {
                  const v = where[s.id] ?? ''
                  const n = s.kind === 'new_project' ? (p.tasks ?? []).length : 1
                  const into = v.startsWith('p:') ? projects.find(x => x.id === v.slice(2)) : null
                  return (
                    <div style={{ marginTop: 8 }}>
                      <select
                        value={v} onChange={e => setWhere(prev => ({ ...prev, [s.id]: e.target.value }))} aria-label="Put it in"
                        style={{ fontSize: 12.5, padding: '5px 8px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink-2)', maxWidth: '100%' }}
                      >
                        <option value="">{s.kind === 'new_project' ? 'Put it in: as suggested' : 'Into: the suggested task'}</option>
                        {s.kind === 'new_project' && (
                          <optgroup label="A new task in…">
                            {circles.slugs.map(c => [
                              <option key={c} value={`c:${c}`}>{circles.meta(c).emoji} {circles.meta(c).label}</option>,
                              ...teams.filter(t => t.circle === c).map(t => <option key={t.id} value={`t:${t.id}`}>{'    '}{circles.meta(c).label} › {t.name}</option>),
                            ])}
                          </optgroup>
                        )}
                        <optgroup label={s.kind === 'new_project' ? 'Or add them to a task' : 'Another task'}>
                          {projects.map(x => <option key={x.id} value={`p:${x.id}`}>{x.title}{x.circle && circles.has(x.circle) ? ` · ${circles.meta(x.circle).label}` : ''}</option>)}
                        </optgroup>
                      </select>
                      {into && (
                        <div style={{ fontSize: 12, color: '#92400e', background: '#fef3c7', borderRadius: 8, padding: '6px 10px', marginTop: 6 }}>
                          {s.kind === 'new_project'
                            ? <>No new task: {n === 1 ? 'this one moves' : `these ${n} move`} into <strong>{into.title}</strong>{into.circle && into.circle !== s.circle && circles.has(into.circle) ? <> (and to {circles.meta(into.circle).label})</> : null}.</>
                            : <>It moves into <strong>{into.title}</strong> instead.</>}
                        </div>
                      )}
                    </div>
                  )
                })()}
                {mayDecide && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <button disabled={!!busy} onClick={() => post(`/api/ops/suggestions/${s.id}`, 'accept', s.id, s)} style={btn(true)}>
                      {busy === s.id ? '…' : where[s.id]?.startsWith('p:') ? 'Move them in' : plain.button}
                    </button>
                    <button disabled={!!busy} onClick={() => post(`/api/ops/suggestions/${s.id}`, 'dismiss', s.id)} style={btn()}>Dismiss</button>
                    <button disabled={!!busy} onClick={() => { setTelling(telling === s.id ? null : s.id); setTold('') }} style={btn()}><InlineIcon name="spark" />Tell the assistant…</button>
                  </div>
                )}
                {mayDecide && telling === s.id && (
                  <form onSubmit={e => { e.preventDefault(); tell(s) }} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input autoFocus value={told} onChange={e => setTold(e.target.value)} maxLength={2000}
                      placeholder="What should happen instead? e.g. add these to the Incubator cacao task"
                      style={{ flex: 1, minWidth: 0, fontSize: 13, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit' }} />
                    <button type="submit" disabled={!told.trim()} style={btn(true)}>Send</button>
                  </form>
                )}
              </div>
            )
          })}
          {acceptedShown.map(({ s, href }) => {
            const p = s.payload as { label?: string; title?: string }
            return (
              <div key={s.id} style={{ borderTop: '1px solid var(--rule)', padding: '10px 0 2px', marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}><InlineIcon name="check" />Accepted</span>
                <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{s.kind === 'new_project' ? p.title : p.label}</span>
                {tag(s.circle)}
                {href && <Link href={href} style={{ ...btn(true), marginLeft: 'auto', textDecoration: 'none' }}>Open {href.startsWith('/operations/') ? 'task' : 'it'} →</Link>}
              </div>
            )
          })}
          {done.length > 0 && (
            <div style={{ borderTop: '1px solid var(--rule)', marginTop: 10, paddingTop: 8 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>Done by the assistant (last 2 weeks)</div>
              {done.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-2)', padding: '3px 0', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--ink-3)' }}>{a.action.startsWith('do_') ? 'Asked for' : DONE[a.action] ?? a.action}:</span>
                  <span>{a.label}</span>
                  {tag(a.circle)}
                  {a.reason && <span style={{ color: 'var(--ink-4)' }}>· {a.reason}</span>}
                  {canDecide(a.circle) && (
                    <button disabled={!!busy} onClick={() => post(`/api/ops/agent-actions/${a.id}`, 'undo', a.id)} style={{ ...btn(), padding: '2px 9px', marginLeft: 'auto' }}>{busy === a.id ? '…' : 'Undo'}</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
