'use client'

import { useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { useCircles } from '@/core/components/CirclesProvider'
import type { Deliverable, ProjectSummary } from './types'
import '@/modules/m18-meetings/meetings-v4.css'

/**
 * Ideas for later (v4.114.0: Oscar, from the To decide list): tasks set aside with Later. They're off the board and
 * out of the project manager's review until someone with the right to change the task brings one back.
 */
export function IdeasForLater({ ideas, projects, canEdit, onBack }: {
  ideas: Deliverable[]; projects: ProjectSummary[]
  canEdit: (d: Deliverable) => boolean
  onBack: () => void
}) {
  const circles = useCircles()
  const [back, setBack] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const projectTitle = (id: string | null) => projects.find(p => p.id === id)?.title

  async function bringBack(d: Deliverable) {
    setBusy(d.id); setError('')
    const { data, error: e } = await createClient().from('deliverables').update({ later_at: null }).eq('id', d.id).select('id')
    setBusy(null)
    if (e || !data?.length) { setError(e?.message ?? 'The database didn’t allow this change for your account.'); return }
    setBack(prev => new Set(prev).add(d.id))
  }

  return (
    <div>
      <div className="v4-sec"><h2>Ideas for later · {ideas.length}</h2><span className="v4-hint">Set aside from To decide. Bring one back to put it on the board.</span></div>
      {error && <p className="dl4-err">{error}</p>}
      <div className="v4-list">
        {ideas.map(d => (
          <div key={d.id} className="v4-row">
            <span className="v4-row__main">
              <b>{d.title}</b>
              <small>{[d.circle && circles.has(d.circle) ? `${circles.meta(d.circle).emoji} ${circles.meta(d.circle).label}` : null, d.project_id ? `in ${projectTitle(d.project_id) ?? 'a task'}` : null, d.source_item && d.source_item !== d.title ? `“${d.source_item.slice(0, 100)}”` : null].filter(Boolean).join(' · ')}</small>
            </span>
            <span className="v4-row__trail">
              {back.has(d.id) ? (
                <button type="button" className="dl4-btn" onClick={onBack}>✓ On the board · refresh</button>
              ) : canEdit(d) ? (
                <button type="button" className="dl4-btn dl4-btn--primary" disabled={busy === d.id} onClick={() => bringBack(d)}>{busy === d.id ? '…' : 'Bring back'}</button>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
