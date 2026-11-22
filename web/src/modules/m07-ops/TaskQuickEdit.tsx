'use client'

import { useState } from 'react'
import { useCircles } from '@/core/components/CirclesProvider'
import { createClient } from '@/core/lib/supabase/client'
import { PRIORITIES } from './Priority'
import type { TaskPerson, TaskProjectOption, TaskTeamOption } from './TaskModal'
import { EDITABLE_SELECT, partOfChoices, placeChange, type EditableTask, type TaskChange } from './lib/task-edit'

const STATUSES: { value: string; label: string }[] = [
  { value: 'backlog', label: 'To do' }, { value: 'in_progress', label: 'In progress' },
  { value: 'review', label: 'Review' }, { value: 'done', label: 'Done' },
]
const NAME_TAG = '__name__'

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }
const label: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-4)' }
const pick: React.CSSProperties = {
  fontSize: 12.5, padding: '5px 7px', borderRadius: 7, border: '1px solid var(--rule)', background: 'var(--surface)',
  color: 'var(--ink-2)', fontFamily: 'inherit', width: '100%', minWidth: 0,
}

/**
 * A task's fields, changed right where it's reviewed (v4.105.0: Oscar, "edit all the fields like circle, sub circle,
 * person assigned to, priority, etc so we can edit it right away and move it along"): in the project manager panel
 * and in a meeting's action items. Circle, Subcircle, Part of, Person, Priority, Due and Status, each saved as it
 * changes. Saving confirms a draft. The database checks who may (RLS), so ask only those who may edit the task.
 */
export function TaskQuickEdit({ task, people, projectOptions, teams, onSaved, ask = true }: {
  task: EditableTask
  people: TaskPerson[]; projectOptions: TaskProjectOption[]; teams: TaskTeamOption[]
  onSaved?: (t: EditableTask) => void
  /** "What should the assistant do?" under the fields (v4.107.0) */
  ask?: boolean
}) {
  const circles = useCircles()
  const [t, setT] = useState<EditableTask>(task)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  // The assistant, right here (v4.107.0: Oscar, "once the user asks for the changes, it should load into the screen right
  // there after the agent changes it so they can confirm - I don't like that the chat goes to the pop up"): it plans and
  // makes the change (Ask/Do's own routes, as this person), the fields reload with what changed marked, and the person
  // keeps it or undoes it
  const [said, setSaid] = useState('')
  const [asking, setAsking] = useState(false)
  const [outcome, setOutcome] = useState<{ reply: string; done: { summary: string; ok: boolean; error?: string; undo?: string }[] } | null>(null)
  const [changed, setChanged] = useState<Set<string>>(() => new Set())

  async function reload(): Promise<EditableTask | null> {
    const { data } = await createClient().from('deliverables').select(EDITABLE_SELECT).eq('id', t.id).maybeSingle()
    return data ? { ...t, ...(data as Partial<EditableTask>) } : null
  }
  async function askAssistant() {
    const instruction = said.trim()
    if (!instruction) return
    setAsking(true); setError(''); setOutcome(null); setChanged(new Set())
    try {
      const context = { path: `${window.location.pathname}${window.location.search}`, task_id: t.id, ...(t.project_id ? { project_id: t.project_id } : {}) }
      const planRes = await fetch('/api/agent/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instruction: `About the task “${t.title}”: ${instruction}`, context }) })
      const plan = await planRes.json().catch(() => ({})) as { reply?: string; error?: string; changes?: { action: unknown; summary: string; blocked?: string | null }[] }
      if (!planRes.ok) throw new Error(plan.error ?? 'The assistant couldn’t do that.')
      const doable = (plan.changes ?? []).filter(c => !c.blocked)
      const refused = (plan.changes ?? []).filter(c => c.blocked).map(c => ({ summary: c.summary, ok: false, error: c.blocked ?? undefined }))
      let done: { summary: string; ok: boolean; error?: string; undo?: string }[] = []
      if (doable.length) {
        const doRes = await fetch('/api/agent/do', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actions: doable.map(c => c.action), instruction }) })
        const d = await doRes.json().catch(() => ({})) as { results?: typeof done; error?: string }
        if (!doRes.ok) throw new Error(d.error ?? 'The change didn’t go through.')
        done = d.results ?? []
      }
      const before = t
      const next = done.some(r => r.ok) ? await reload() : null
      if (next) {
        const keys = ['circle', 'team_id', 'project_id', 'assignee_id', 'assignee_name', 'priority', 'due_date', 'status'] as const
        setChanged(new Set(keys.filter(k => (before[k] ?? null) !== (next[k] ?? null))))
        if (before.needs_review && !next.needs_review) setConfirmed(true)
        setT(next); onSaved?.(next)
      }
      setOutcome({ reply: plan.reply ?? '', done: [...done, ...refused] })
      setSaid('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAsking(false)
    }
  }
  async function undoAll() {
    if (!outcome) return
    setAsking(true); setError('')
    for (const r of [...outcome.done].reverse()) {
      if (!r.ok || !r.undo) continue
      const res = await fetch(`/api/ops/agent-actions/${r.undo}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'undo' }) })
      if (!res.ok) { const d = await res.json().catch(() => ({})) as { error?: string }; setError(d.error ?? 'Couldn’t undo that.'); break }
    }
    const next = await reload()
    if (next) { setT(next); onSaved?.(next) }
    setOutcome(null); setChanged(new Set()); setConfirmed(false); setAsking(false)
  }
  const mark = (k: string): React.CSSProperties => (changed.has(k) ? { borderColor: 'var(--m7)', boxShadow: '0 0 0 2px color-mix(in srgb, var(--m7) 22%, transparent)' } : {})

  async function change(changes: TaskChange) {
    setBusy(true); setError('')
    // RLS rejects silently (0 rows, no error), so ask for the row back
    const { data, error: e } = await createClient().from('deliverables').update({ ...changes, needs_review: false }).eq('id', t.id).select(EDITABLE_SELECT)
    setBusy(false)
    if (e || !data?.length) { setError(e?.message ?? 'The database didn’t allow this change for your account.'); return }
    if (t.needs_review) setConfirmed(true)
    const next = { ...t, ...(data[0] as Partial<EditableTask>) }
    setT(next); onSaved?.(next)
  }
  const place = (f: 'circle' | 'team_id' | 'project_id', v: string) => change(placeChange(t, f, v, projectOptions, teams))

  const circleTeams = teams.filter(x => x.circle === t.circle)
  const options = partOfChoices(t, projectOptions)
  const person = t.assignee_id ?? (t.assignee_name ? NAME_TAG : '')

  return (
    <div style={{ marginTop: 8, opacity: busy ? 0.6 : 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
        <label style={field}><span style={label}>Circle</span>
          <select value={t.circle ?? ''} onChange={e => place('circle', e.target.value)} disabled={asking || busy} style={{ ...pick, ...mark('circle') }}>
            <option value="">No circle</option>
            {circles.slugs.map(c => <option key={c} value={c}>{circles.meta(c).emoji} {circles.meta(c).label}</option>)}
          </select>
        </label>
        <label style={field}><span style={label}>Subcircle</span>
          <select value={t.team_id ?? ''} onChange={e => place('team_id', e.target.value)} disabled={asking || busy || (!circleTeams.length && !t.team_id)} style={{ ...pick, ...mark('team_id') }}>
            <option value="">{circleTeams.length ? 'The whole circle' : 'No subcircles'}</option>
            {circleTeams.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label style={field}><span style={label}>Part of</span>
          <select value={t.project_id ?? ''} onChange={e => place('project_id', e.target.value)} disabled={asking || busy} style={{ ...pick, ...mark('project_id') }}>
            <option value="">A task of its own</option>
            {options.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            {t.project_id && !options.some(p => p.id === t.project_id) && <option value={t.project_id}>Its task</option>}
          </select>
        </label>
        <label style={field}><span style={label}>Person</span>
          <select value={person} onChange={e => change(e.target.value === NAME_TAG ? {} : { assignee_id: e.target.value || null, assignee_name: null })} disabled={asking || busy} style={{ ...pick, ...mark('assignee_id'), ...mark('assignee_name') }}>
            <option value="">Nobody yet</option>
            {t.assignee_name && <option value={NAME_TAG}>{t.assignee_name} (not on MyCoNet yet)</option>}
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label style={field}><span style={label}>Priority</span>
          <select value={t.priority ?? 'none'} onChange={e => change({ priority: e.target.value })} disabled={asking || busy} style={{ ...pick, ...mark('priority') }}>
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.value === 'none' ? 'None' : p.value === 'medium' ? 'Medium' : p.label}</option>)}
          </select>
        </label>
        <label style={field}><span style={label}>Due</span>
          <input type="date" value={t.due_date ?? ''} onChange={e => change({ due_date: e.target.value || null, ...(e.target.value ? {} : { due_time: null }) })} disabled={asking || busy} style={{ ...pick, ...mark('due_date') }} />
        </label>
        <label style={field}><span style={label}>Status</span>
          <select value={t.status} onChange={e => change({ status: e.target.value })} disabled={asking || busy} style={{ ...pick, ...mark('status') }}>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>
      {ask && (
        <form onSubmit={e => { e.preventDefault(); askAssistant() }} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input value={said} onChange={e => setSaid(e.target.value)} maxLength={2000} disabled={asking}
            placeholder="✦ What should the assistant do? e.g. give it to Ana, high priority, due Friday"
            aria-label="What should the assistant do with this task?"
            style={{ ...pick, flex: 1, fontSize: 13, padding: '7px 10px' }} />
          <button type="submit" disabled={asking || !said.trim()}
            style={{ fontSize: 12.5, fontWeight: 600, borderRadius: 8, padding: '6px 12px', border: 'none', color: '#fff', background: 'var(--m7)', cursor: asking ? 'wait' : 'pointer', whiteSpace: 'nowrap', opacity: !said.trim() && !asking ? 0.5 : 1 }}>
            {asking ? 'Working…' : 'Do it'}
          </button>
        </form>
      )}
      {outcome && (
        <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.5, background: 'color-mix(in srgb, var(--m7) 6%, var(--surface))', border: '1px solid color-mix(in srgb, var(--m7) 25%, var(--rule))', borderRadius: 8, padding: '8px 10px' }}>
          {outcome.done.length ? outcome.done.map((r, i) => (
            <div key={i} style={{ color: r.ok ? 'var(--ink-2)' : '#b91c1c' }}>{r.ok ? '✓' : '✕'} {r.summary}{r.error ? ` (${r.error})` : ''}</div>
          )) : <div style={{ color: 'var(--ink-2)' }}>{outcome.reply || 'The assistant didn’t find anything to change.'}</div>}
          {outcome.done.some(r => r.ok) && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>The changed fields are marked above.</span>
              <button type="button" onClick={() => { setOutcome(null); setChanged(new Set()) }} disabled={asking}
                style={{ fontSize: 12, fontWeight: 600, borderRadius: 8, padding: '4px 11px', border: 'none', color: '#fff', background: 'var(--m7)', cursor: 'pointer' }}>Keep</button>
              <button type="button" onClick={undoAll} disabled={asking}
                style={{ fontSize: 12, fontWeight: 600, borderRadius: 8, padding: '4px 11px', border: '1px solid var(--rule)', color: 'var(--ink-2)', background: 'var(--surface)', cursor: 'pointer' }}>{asking ? '…' : 'Undo'}</button>
            </div>
          )}
        </div>
      )}
      {(confirmed || error) && (
        <div style={{ fontSize: 11.5, marginTop: 6, color: error ? '#b91c1c' : '#15803d', fontWeight: error ? 400 : 600 }}>
          {error || '✓ Saved and confirmed: it’s no longer a draft.'}
        </div>
      )}
    </div>
  )
}
