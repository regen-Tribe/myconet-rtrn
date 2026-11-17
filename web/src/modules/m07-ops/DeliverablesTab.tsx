'use client'

import Link from 'next/link'
import { fmtTaskWhen, isTaskOverdue } from '@/core/lib/tasks'
import type { Deliverable, ProjectSummary } from './types'

const STATUS_PILL: Record<string, { label: string; color: string; bg: string }> = {
  backlog:     { label: 'Backlog',     color: 'var(--ink-4)', bg: 'var(--bg-3)' },
  in_progress: { label: 'In progress', color: 'var(--m7)',    bg: '#4338ca18' },
  review:      { label: 'Review',      color: '#f59e0b',      bg: '#f59e0b18' },
  done:        { label: 'Done',        color: 'var(--m5)',    bg: '#15803d18' },
}

export function DeliverablesTab({ deliverables: all, projects, draftsOnly = false, onDraftsOnly }: {
  deliverables: Deliverable[]
  projects: ProjectSummary[]
  /** Only drafts (e.g. from meetings) waiting for a lead */
  draftsOnly?: boolean
  onDraftsOnly?: (on: boolean) => void
}) {
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.title]))
  const draftCount = all.filter(d => d.needs_review).length
  const deliverables = draftsOnly ? all.filter(d => d.needs_review) : all
  const draftsToggle = onDraftsOnly && (draftCount > 0 || draftsOnly) && (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', marginBottom: 10 }}>
      <input type="checkbox" checked={draftsOnly} onChange={e => onDraftsOnly(e.target.checked)} />
      Only drafts to confirm ({draftCount}) · open one and save it to confirm
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
        {draftsOnly ? 'No drafts to confirm.' : 'No deliverables yet.'}
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
            <th style={thStyle}>Deliverable</th>
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
                  {d.needs_review && <span title="A draft waiting for a lead to confirm" style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#b45309', background: '#fef3c7', borderRadius: 4, padding: '1px 5px', marginRight: 6 }}>Draft</span>}
                  <Link href={`/ops/${d.project_id}?task=${d.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{d.title}</Link>
                </td>
                <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  {projectMap[d.project_id] ?? '—'}
                </td>
                <td style={{ ...tdStyle, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  {d.assignee_username ?? '—'}
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
