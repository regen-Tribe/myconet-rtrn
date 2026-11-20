'use client'

import { DraftSwipe } from './DraftSwipe'
import Link from 'next/link'
import { fmtTaskWhen, isTaskOverdue } from '@/core/lib/tasks'
import type { Deliverable, ProjectSummary } from './types'
import { NameTag } from './NameTag'
import { PriorityBadge } from './Priority'
import { taskHref } from './TaskModal'

const STATUS_PILL: Record<string, { label: string; color: string; bg: string }> = {
  backlog:     { label: 'To do',       color: 'var(--ink-4)', bg: 'var(--bg-3)' },
  in_progress: { label: 'In progress', color: 'var(--m7)',    bg: '#4338ca18' },
  review:      { label: 'Review',      color: '#f59e0b',      bg: '#f59e0b18' },
  done:        { label: 'Done',        color: 'var(--m5)',    bg: '#15803d18' },
}

export function DeliverablesTab({ deliverables: all, projects, draftsOnly = false, onDraftsOnly, canDecide, onDecided, onOpen }: {
  deliverables: Deliverable[]
  projects: ProjectSummary[]
  /** Only drafts (e.g. from meetings) waiting for a lead */
  draftsOnly?: boolean
  onDraftsOnly?: (on: boolean) => void
  /** May this person approve or decline a draft from its pill (a lead of its circle or project, or an admin) */
  canDecide?: (d: Deliverable) => boolean
  onDecided?: () => void
  /** Opens a task with no project in its pop-up, here on the board */
  onOpen?: (d: Deliverable) => void
}) {
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.title]))
  const draftCount = all.filter(d => d.needs_review).length
  const deliverables = draftsOnly ? all.filter(d => d.needs_review) : all
  const draftsToggle = onDraftsOnly && (draftCount > 0 || draftsOnly) && (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', marginBottom: 10 }}>
      <input type="checkbox" checked={draftsOnly} onChange={e => onDraftsOnly(e.target.checked)} />
      Only drafts to confirm ({draftCount}) · slide a Draft pill right to approve, left to decline
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
        {draftsOnly ? 'No drafts to confirm.' : 'No tasks yet.'}
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
            <th style={thStyle}>Task</th>
            <th style={thStyle}>Project</th>
            <th style={thStyle}>Assignee</th>
            <th style={thStyle}>Due</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {deliverables.map(d => {
            const pill = STATUS_PILL[d.status] ?? STATUS_PILL.backlog
            const isOverdue = isTaskOverdue(d.due_date, d.due_time, d.status)
            return (
              <tr key={d.id}>
                <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--ink)' }}>
                  {d.needs_review && <DraftSwipe taskId={d.id} canDecide={!!canDecide?.(d)} onApproved={onDecided} onDeclined={onDecided} />}
                  <PriorityBadge priority={d.priority} />{d.priority && d.priority !== 'none' ? ' ' : ''}
                  {d.project_id || !onOpen
                    ? <Link href={taskHref(d)} style={{ color: 'inherit', textDecoration: 'none' }}>{d.title}</Link>
                    : <button type="button" onClick={() => onOpen(d)} style={{ all: 'unset', cursor: 'pointer' }}>{d.title}</button>}
                </td>
                <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  {(d.project_id && projectMap[d.project_id]) || 'No project'}
                </td>
                <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  {d.assignee_username ?? (d.assignee_name ? <NameTag name={d.assignee_name} /> : '—')}
                </td>
                <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap', color: isOverdue ? '#ef4444' : 'inherit', fontWeight: isOverdue ? 700 : 'inherit' }}>
                  {fmtTaskWhen(d.due_date, d.due_time)}{isOverdue ? ' ⚠' : ''}
                </td>
                <td style={tdStyle}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase', color: pill.color, background: pill.bg,
                    padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap',
                  }}>
                    {pill.label}
                  </span>
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
