'use client'

import { useState } from 'react'
import { InlineIcon } from '@/core/components/v4'
import { useCircles } from '@/core/components/CirclesProvider'
import { createClient } from '@/core/lib/supabase/client'
import { instructAgent } from '@/core/lib/agent-context'
import { DraftSwipe } from './DraftSwipe'
import Link from 'next/link'
import { fmtTaskWhen, isTaskOverdue } from '@/core/lib/tasks'
import type { Deliverable, ProjectSummary } from './types'
import { NameTag } from './NameTag'
import { PriorityBadge } from './Priority'
import { taskHref, type TaskProjectOption, type TaskTeamOption } from './TaskModal'
import { partOfChoices, placeChange } from './lib/task-edit'

const STATUS_PILL: Record<string, { label: string; color: string; bg: string }> = {
  later:       { label: 'Later',       color: 'var(--ink-3)', bg: 'transparent' },
  pending:     { label: 'Idea',        color: 'var(--ink-3)', bg: 'var(--bg-2)' },
  backlog:     { label: 'To do',       color: 'var(--ink-4)', bg: 'var(--bg-3)' },
  in_progress: { label: 'In progress', color: 'var(--m7)',    bg: '#4338ca18' },
  review:      { label: 'Review',      color: '#f59e0b',      bg: '#f59e0b18' },
  done:        { label: 'Done',        color: 'var(--m5)',    bg: '#15803d18' },
}

const pick: React.CSSProperties = {
  fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--rule)', background: 'var(--surface)',
  color: 'var(--ink-2)', maxWidth: 170, fontFamily: 'inherit',
}

export function DeliverablesTab({ deliverables: all, projects, draftsOnly = false, onDraftsOnly, canDecide, onOpen, projectOptions = [], teams = [] }: {
  deliverables: Deliverable[]
  projects: ProjectSummary[]
  /** Only drafts (e.g. from meetings) waiting for a lead */
  draftsOnly?: boolean
  onDraftsOnly?: (on: boolean) => void
  /** May this person approve or decline a draft from its pill (a lead of its circle or project, or an admin) */
  canDecide?: (d: Deliverable) => boolean
  /** Opens a task with no project in its pop-up, here on the board */
  onOpen?: (d: Deliverable) => void
  /** Where a task can go (v4.84.0): open tasks, and the circles' subcircles */
  projectOptions?: TaskProjectOption[]
  teams?: TaskTeamOption[]
}) {
  const circles = useCircles()
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.title]))
  // What was changed here, shown until the page is reloaded (v4.84.0): a confirmed draft stays in "Only drafts"
  // with its new status, circle and task, instead of leaving the list
  const [patch, setPatch] = useState<Record<string, Partial<Deliverable>>>({})
  const [kept, setKept] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<{ id: string; msg: string } | null>(null)
  const [telling, setTelling] = useState<string | null>(null)
  const [told, setTold] = useState('')
  const keep = (id: string) => setKept(prev => new Set(prev).add(id))
  // Swiped here (v4.130.0): the pill stays with Approved / Declined and Undo until the page is reloaded
  const [swiped, setSwiped] = useState<Set<string>>(() => new Set())
  const swipe = (id: string) => setSwiped(prev => new Set(prev).add(id))
  const rows = all.map(d => ({ ...d, ...patch[d.id] }))
  const draftCount = rows.filter(d => d.needs_review).length
  const deliverables = draftsOnly ? rows.filter(d => d.needs_review || kept.has(d.id)) : rows

  /** Changing a task confirms it: it's no longer a draft (v4.84.0) */
  async function change(d: Deliverable, changes: Partial<Deliverable>) {
    setBusy(d.id); setError(null)
    // RLS rejects silently (0 rows, no error), so ask for the row back; the database may adjust circle and subcircle
    const { data, error: e } = await createClient().from('deliverables').update({ ...changes, needs_review: false }).eq('id', d.id).select('status, circle, team_id, project_id, needs_review')
    setBusy(null)
    if (e || !data?.length) { setError({ id: d.id, msg: e?.message ?? 'The database didn’t allow this change for your account.' }); return }
    keep(d.id)
    setPatch(prev => ({ ...prev, [d.id]: { ...prev[d.id], ...data[0] } }))
  }
  // The same rules as the task pop-up (lib/task-edit.ts), shared with the project manager and the meetings page
  const pickCircle = (d: Deliverable, c: string) => change(d, placeChange(d, 'circle', c, projectOptions, teams))
  const pickTeam = (d: Deliverable, id: string) => change(d, placeChange(d, 'team_id', id, projectOptions, teams))
  const pickProject = (d: Deliverable, id: string) => change(d, placeChange(d, 'project_id', id, projectOptions, teams))
  function tell(d: Deliverable) {
    if (!told.trim()) return
    instructAgent(told.trim(), { task_id: d.id, ...(d.project_id ? { project_id: d.project_id } : {}) })
    keep(d.id)
    setTelling(null); setTold('')
  }
  const draftsToggle = onDraftsOnly && (draftCount > 0 || draftsOnly) && (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', marginBottom: 10 }}>
      <input type="checkbox" checked={draftsOnly} onChange={e => onDraftsOnly(e.target.checked)} />
      Only drafts to confirm ({draftCount}) · slide a Draft pill right to approve, left to decline · changing a draft confirms it
    </label>
  )

  const thStyle: React.CSSProperties = {
    fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)',
    padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--rule)',
    whiteSpace: 'nowrap',
  }

  const tdStyle: React.CSSProperties = {
    fontSize: 13, color: 'var(--ink-2)',
    padding: '10px 12px',
    borderBottom: '1px solid color-mix(in srgb, var(--rule) 50%, transparent)',
  }

  if (deliverables.length === 0) {
    return (
      <>{draftsToggle}<div style={{
        background: 'var(--bg-2)', border: '1px solid var(--rule)',
        borderRadius: 10, padding: '40px 24px', textAlign: 'center',
        color: 'var(--ink-4)', fontSize: 13,
      }}>
        {draftsOnly ? 'No drafts to confirm.' : 'Nothing to do yet.'}
      </div></>
    )
  }

  return (
    <>
    {draftsToggle}
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={thStyle}>Subtask or task</th>
            <th style={thStyle}>Circle</th>
            <th style={thStyle}>Subcircle</th>
            <th style={thStyle}>Part of</th>
            <th style={thStyle}>Assignee</th>
            <th style={thStyle}>Due</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {deliverables.map(d => {
            const pill = STATUS_PILL[d.status] ?? STATUS_PILL.backlog
            const isOverdue = isTaskOverdue(d.due_date, d.due_time, d.status)
            const edit = !!canDecide?.(d)
            const circleName = (c: string | null | undefined) => (c && circles.has(c) ? `${circles.meta(c).emoji} ${circles.meta(c).label}` : 'No circle')
            const circleTeams = teams.filter(t => t.circle === d.circle)
            const options = partOfChoices(d, projectOptions)
            const mono: React.CSSProperties = { ...tdStyle, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }
            return (
              <tr key={d.id} style={{ opacity: busy === d.id ? 0.6 : 1 }}>
                <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--ink)' }}>
                  {(d.needs_review || swiped.has(d.id)) && <DraftSwipe keepLabel taskId={d.id} canDecide={edit} onApproved={() => { keep(d.id); swipe(d.id); setPatch(prev => ({ ...prev, [d.id]: { ...prev[d.id], needs_review: false } })) }} onDeclined={() => { keep(d.id); swipe(d.id) }} onUndone={() => setPatch(prev => ({ ...prev, [d.id]: { ...prev[d.id], needs_review: true } }))} />}
                  {!d.needs_review && kept.has(d.id) && !swiped.has(d.id) && <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d', marginRight: 6 }}>✓ Confirmed</span>}
                  <PriorityBadge priority={d.priority} />{d.priority && d.priority !== 'none' ? ' ' : ''}
                  {d.project_id || !onOpen
                    ? <Link href={taskHref(d)} style={{ color: 'inherit', textDecoration: 'none' }}>{d.title}</Link>
                    : <button type="button" onClick={() => onOpen(d)} style={{ all: 'unset', cursor: 'pointer' }}>{d.title}</button>}
                  {edit && (
                    <button type="button" onClick={() => { setTelling(telling === d.id ? null : d.id); setTold('') }} title="Tell the assistant what to do with it"
                      style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: 'var(--m7)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>✦ Tell the assistant</button>
                  )}
                  {telling === d.id && (
                    <form onSubmit={e => { e.preventDefault(); tell(d) }} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <input autoFocus value={told} onChange={e => setTold(e.target.value)} maxLength={2000}
                        placeholder="e.g. give it to Ana, due Friday, in the Kitchen circle"
                        style={{ flex: 1, minWidth: 180, fontSize: 12.5, padding: '6px 9px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit' }} />
                      <button type="submit" disabled={!told.trim()} style={{ fontSize: 12, fontWeight: 600, borderRadius: 8, padding: '5px 11px', border: 'none', color: '#fff', background: 'var(--m7)', cursor: 'pointer' }}>Send</button>
                    </form>
                  )}
                  {error?.id === d.id && <div style={{ fontSize: 11.5, color: '#b91c1c', marginTop: 4, fontWeight: 400 }}>{error.msg}</div>}
                </td>
                <td style={mono}>
                  {edit ? (
                    <select value={d.circle ?? ''} onChange={e => pickCircle(d, e.target.value)} disabled={busy === d.id} aria-label="Circle" style={pick}>
                      <option value="">No circle</option>
                      {circles.slugs.map(c => <option key={c} value={c}>{circleName(c)}</option>)}
                    </select>
                  ) : circleName(d.circle)}
                </td>
                <td style={mono}>
                  {edit ? (
                    <select value={d.team_id ?? ''} onChange={e => pickTeam(d, e.target.value)} disabled={busy === d.id || (!circleTeams.length && !d.team_id)} aria-label="Subcircle" style={pick}>
                      <option value="">{circleTeams.length ? 'The whole circle' : 'No subcircles'}</option>
                      {circleTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  ) : teams.find(t => t.id === d.team_id)?.name ?? 'The whole circle'}
                </td>
                <td style={mono}>
                  {edit ? (
                    <select value={d.project_id ?? ''} onChange={e => pickProject(d, e.target.value)} disabled={busy === d.id} aria-label="Part of" style={pick}>
                      <option value="">A task of its own</option>
                      {options.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                      {d.project_id && !options.some(p => p.id === d.project_id) && <option value={d.project_id}>{projectMap[d.project_id] ?? 'Its task'}</option>}
                    </select>
                  ) : (d.project_id && projectMap[d.project_id]) || 'A task of its own'}
                </td>
                <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  {d.assignee_username ?? (d.assignee_name ? <NameTag name={d.assignee_name} /> : '—')}
                </td>
                <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap', color: isOverdue ? '#ef4444' : 'inherit', fontWeight: isOverdue ? 700 : 'inherit' }}>
                  {fmtTaskWhen(d.due_date, d.due_time)}{isOverdue && <> <InlineIcon name="alert" label="Late" /></>}
                </td>
                <td style={tdStyle}>
                  {edit ? (
                    <select value={d.status} onChange={e => change(d, { status: e.target.value })} disabled={busy === d.id} aria-label="Status"
                      style={{ ...pick, fontSize: 11, fontWeight: 700, color: pill.color, background: pill.bg, borderColor: 'transparent', borderRadius: 20 }}>
                      {Object.entries(STATUS_PILL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  ) : <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: pill.color, background: pill.bg,
                    padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap',
                  }}>
                    {pill.label}
                  </span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    </>
  )
}
