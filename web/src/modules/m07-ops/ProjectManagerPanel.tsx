'use client'

import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useCircles } from '@/core/components/CirclesProvider'
import type { AgentSuggestion, PmAction } from './types'
import { instructAgent } from '@/core/lib/agent-context'
import Link from 'next/link'

const KIND: Record<string, string> = { merge: 'Merge duplicates', move: 'Into a project', new_project: 'New project', assign: 'Who could take it' }
const DONE: Record<string, string> = { pm_merge: 'Merged duplicates', pm_move: 'Filed into a project', pm_assign: 'Assigned' }

// Arriving from a circle page's "🧭 Project manager" button (/ops?circle=…#pm) opens the panel
const onHash = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb) }
const atPm = () => window.location.hash === '#pm'

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
export function ProjectManagerPanel({ suggestions, actions, taskTitles, circle, canDecide, projects = [], teams = [] }: {
  suggestions: AgentSuggestion[]; actions: PmAction[]; taskTitles: Record<string, string>
  circle: string | null; canDecide: (circle: string) => boolean

  /** Where a suggestion can be put instead (v4.38.3): open projects, and the circles' teams */
  projects?: { id: string; title: string; circle: string | null }[]
  teams?: { id: string; name: string; circle: string }[]
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
  const sugs = suggestions.filter(s => (!circle || s.circle === circle) && !acceptedIds.has(s.id))
  const acceptedShown = accepted.filter(a => !circle || a.s.circle === circle)
  const done = actions.filter(a => !circle || a.circle === circle)
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
      const href = r.project_id ? `/ops/${r.project_id}${r.task_id ? `?task=${r.task_id}` : ''}` : r.task_id ? `/ops?task=${r.task_id}` : null
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
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>🧭 Project manager</span>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{sugs.length} suggestion{sugs.length === 1 ? '' : 's'}{acceptedShown.length ? ` · ${acceptedShown.length} accepted` : ''}{done.length ? ` · ${done.length} change${done.length === 1 ? '' : 's'} made` : ''}</span>
        <button onClick={() => setToggled(!open)} style={{ ...btn(), marginLeft: 'auto', padding: '3px 10px' }}>{open ? 'Hide' : 'Show'}</button>
      </div>
      {open && (
        <>
          {msg && <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 8 }}>{msg}</div>}
          {sugs.map(s => {
            const p = s.payload as { label?: string; title?: string; description?: string; tasks?: string[] }
            const mayDecide = canDecide(s.circle)
            return (
              <div key={s.id} style={{ borderTop: '1px solid var(--rule)', padding: '10px 0 2px', marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{KIND[s.kind] ?? s.kind}</span>
                  {tag(s.circle)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.4 }}>{s.kind === 'new_project' ? p.title : p.label}</div>
                {s.kind === 'new_project' && (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', margin: '3px 0' }}>
                    {p.description && <div>{p.description}</div>}
                    <div>{(p.tasks ?? []).map(id => taskTitles[id]).filter(Boolean).join(' · ')}</div>
                  </div>
                )}
                {s.reason && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{s.reason}</div>}
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
                        <option value="">{s.kind === 'new_project' ? 'Put it in: as suggested' : 'Into: the suggested project'}</option>
                        {s.kind === 'new_project' && (
                          <optgroup label="A new project in…">
                            {circles.slugs.map(c => [
                              <option key={c} value={`c:${c}`}>{circles.meta(c).emoji} {circles.meta(c).label}</option>,
                              ...teams.filter(t => t.circle === c).map(t => <option key={t.id} value={`t:${t.id}`}>{'    '}{circles.meta(c).label} › {t.name}</option>),
                            ])}
                          </optgroup>
                        )}
                        <optgroup label={s.kind === 'new_project' ? 'Or add the tasks to a project' : 'Another project'}>
                          {projects.map(x => <option key={x.id} value={`p:${x.id}`}>{x.title}{x.circle && circles.has(x.circle) ? ` · ${circles.meta(x.circle).label}` : ''}</option>)}
                        </optgroup>
                      </select>
                      {into && (
                        <div style={{ fontSize: 12, color: '#92400e', background: '#fef3c7', borderRadius: 8, padding: '6px 10px', marginTop: 6 }}>
                          {s.kind === 'new_project'
                            ? <>No new project: {n === 1 ? 'this task moves' : `these ${n} tasks move`} into <strong>{into.title}</strong>{into.circle && into.circle !== s.circle && circles.has(into.circle) ? <> (and to {circles.meta(into.circle).label})</> : null}.</>
                            : <>The task moves into <strong>{into.title}</strong> instead.</>}
                        </div>
                      )}
                    </div>
                  )
                })()}
                {mayDecide && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <button disabled={!!busy} onClick={() => post(`/api/ops/suggestions/${s.id}`, 'accept', s.id, s)} style={btn(true)}>
                      {busy === s.id ? '…' : where[s.id]?.startsWith('p:') ? 'Move them in' : 'Accept'}
                    </button>
                    <button disabled={!!busy} onClick={() => post(`/api/ops/suggestions/${s.id}`, 'dismiss', s.id)} style={btn()}>Dismiss</button>
                    <button disabled={!!busy} onClick={() => { setTelling(telling === s.id ? null : s.id); setTold('') }} style={btn()}>✦ Tell the agent…</button>
                  </div>
                )}
                {mayDecide && telling === s.id && (
                  <form onSubmit={e => { e.preventDefault(); tell(s) }} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input autoFocus value={told} onChange={e => setTold(e.target.value)} maxLength={2000}
                      placeholder="What should happen instead? e.g. add these to the Incubator cacao project"
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
                <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>✓ Accepted</span>
                <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{s.kind === 'new_project' ? p.title : p.label}</span>
                {tag(s.circle)}
                {href && <Link href={href} style={{ ...btn(true), marginLeft: 'auto', textDecoration: 'none' }}>Open {href.startsWith('/ops/') ? 'project' : 'task'} →</Link>}
              </div>
            )
          })}
          {done.length > 0 && (
            <div style={{ borderTop: '1px solid var(--rule)', marginTop: 10, paddingTop: 8 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>Done by the agent (last 2 weeks)</div>
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
