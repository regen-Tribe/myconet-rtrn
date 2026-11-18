'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCircles } from '@/core/components/CirclesProvider'
import type { AgentSuggestion, PmAction } from './types'

const KIND: Record<string, string> = { merge: 'Merge duplicates', move: 'Into a project', new_project: 'New project', assign: 'Who could take it' }
const DONE: Record<string, string> = { pm_merge: 'Merged duplicates', pm_move: 'Filed into a project', pm_assign: 'Assigned' }

const btn = (primary = false): React.CSSProperties => ({
  fontSize: 12, fontWeight: 600, borderRadius: 8, padding: '5px 11px', cursor: 'pointer', whiteSpace: 'nowrap',
  color: primary ? '#fff' : 'var(--ink-2)', background: primary ? 'var(--m7)' : 'var(--surface)',
  border: primary ? 'none' : '1px solid var(--rule)',
})

/**
 * The project manager on the board: what the agent suggests for each circle (leads accept or dismiss)
 * and what it did itself in the last two weeks (leads can undo). Everyone sees it; only a circle's
 * leads and admins decide. Filtered by the board's circle filter.
 */
export function ProjectManagerPanel({ suggestions, actions, taskTitles, circle, canDecide }: {
  suggestions: AgentSuggestion[]; actions: PmAction[]; taskTitles: Record<string, string>
  circle: string | null; canDecide: (circle: string) => boolean
}) {
  const circles = useCircles()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [open, setOpen] = useState(true)
  const sugs = suggestions.filter(s => !circle || s.circle === circle)
  const done = actions.filter(a => !circle || a.circle === circle)
  if (!sugs.length && !done.length) return null

  async function post(url: string, action: string, key: string) {
    setBusy(key); setMsg(null)
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    const data = await res.json().catch(() => ({})) as { error?: string }
    setBusy(null)
    if (!res.ok) setMsg(data.error ?? 'That didn’t work.')
    else router.refresh()
  }

  const tag = (c: string) => {
    const meta = circles.has(c) ? circles.meta(c) : null
    return meta ? <span style={{ fontSize: 10, fontWeight: 600, color: meta.color, background: `${meta.color}15`, padding: '1px 7px', borderRadius: 20 }}>{meta.emoji} {meta.label}</span> : null
  }

  return (
    <div id="pm" style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: '3px solid var(--m7)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>🧭 Project manager</span>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{sugs.length} suggestion{sugs.length === 1 ? '' : 's'}{done.length ? ` · ${done.length} change${done.length === 1 ? '' : 's'} made` : ''}</span>
        <button onClick={() => setOpen(o => !o)} style={{ ...btn(), marginLeft: 'auto', padding: '3px 10px' }}>{open ? 'Hide' : 'Show'}</button>
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
                {mayDecide && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button disabled={!!busy} onClick={() => post(`/api/ops/suggestions/${s.id}`, 'accept', s.id)} style={btn(true)}>{busy === s.id ? '…' : 'Accept'}</button>
                    <button disabled={!!busy} onClick={() => post(`/api/ops/suggestions/${s.id}`, 'dismiss', s.id)} style={btn()}>Dismiss</button>
                  </div>
                )}
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
