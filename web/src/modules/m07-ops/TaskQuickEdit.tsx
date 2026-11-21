'use client'

import { useState } from 'react'
import { useCircles } from '@/core/components/CirclesProvider'
import { createClient } from '@/core/lib/supabase/client'
import { PRIORITIES } from './Priority'
import type { TaskPerson, TaskProjectOption, TaskTeamOption } from './TaskModal'
import { EDITABLE_SELECT, placeChange, type EditableTask, type TaskChange } from './lib/task-edit'

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
export function TaskQuickEdit({ task, people, projectOptions, teams, onSaved }: {
  task: EditableTask
  people: TaskPerson[]; projectOptions: TaskProjectOption[]; teams: TaskTeamOption[]
  onSaved?: (t: EditableTask) => void
}) {
  const circles = useCircles()
  const [t, setT] = useState<EditableTask>(task)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

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
  const options = projectOptions.filter(p => !t.circle || !p.circle || p.circle === t.circle || p.id === t.project_id)
  const person = t.assignee_id ?? (t.assignee_name ? NAME_TAG : '')

  return (
    <div style={{ marginTop: 8, opacity: busy ? 0.6 : 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
        <label style={field}><span style={label}>Circle</span>
          <select value={t.circle ?? ''} onChange={e => place('circle', e.target.value)} disabled={busy} style={pick}>
            <option value="">No circle</option>
            {circles.slugs.map(c => <option key={c} value={c}>{circles.meta(c).emoji} {circles.meta(c).label}</option>)}
          </select>
        </label>
        <label style={field}><span style={label}>Subcircle</span>
          <select value={t.team_id ?? ''} onChange={e => place('team_id', e.target.value)} disabled={busy || (!circleTeams.length && !t.team_id)} style={pick}>
            <option value="">{circleTeams.length ? 'The whole circle' : 'No subcircles'}</option>
            {circleTeams.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label style={field}><span style={label}>Part of</span>
          <select value={t.project_id ?? ''} onChange={e => place('project_id', e.target.value)} disabled={busy} style={pick}>
            <option value="">A task of its own</option>
            {options.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            {t.project_id && !options.some(p => p.id === t.project_id) && <option value={t.project_id}>Its task</option>}
          </select>
        </label>
        <label style={field}><span style={label}>Person</span>
          <select value={person} onChange={e => change(e.target.value === NAME_TAG ? {} : { assignee_id: e.target.value || null, assignee_name: null })} disabled={busy} style={pick}>
            <option value="">Nobody yet</option>
            {t.assignee_name && <option value={NAME_TAG}>{t.assignee_name} (not on MyCoNet yet)</option>}
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label style={field}><span style={label}>Priority</span>
          <select value={t.priority ?? 'none'} onChange={e => change({ priority: e.target.value })} disabled={busy} style={pick}>
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.value === 'none' ? 'None' : p.value === 'medium' ? 'Medium' : p.label}</option>)}
          </select>
        </label>
        <label style={field}><span style={label}>Due</span>
          <input type="date" value={t.due_date ?? ''} onChange={e => change({ due_date: e.target.value || null, ...(e.target.value ? {} : { due_time: null }) })} disabled={busy} style={pick} />
        </label>
        <label style={field}><span style={label}>Status</span>
          <select value={t.status} onChange={e => change({ status: e.target.value })} disabled={busy} style={pick}>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      </div>
      {(confirmed || error) && (
        <div style={{ fontSize: 11.5, marginTop: 6, color: error ? '#b91c1c' : '#15803d', fontWeight: error ? 400 : 600 }}>
          {error || '✓ Saved and confirmed: it’s no longer a draft.'}
        </div>
      )}
    </div>
  )
}
