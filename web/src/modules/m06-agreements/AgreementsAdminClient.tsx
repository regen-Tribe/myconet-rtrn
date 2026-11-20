'use client'
import { useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import Link from 'next/link'
import { modLabel } from '@/core/lib/module-label'

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: '#f59e0b' },
  accepted:  { label: 'Accepted',  color: '#22c55e' },
  active:    { label: 'Active',    color: '#3b82f6' },
  rejected:  { label: 'Declined',  color: '#ef4444' },
  completed: { label: 'Completed', color: '#94a3b8' },
}

const NEXT_ACTIONS: Record<string, { label: string; next: string; bg: string }[]> = {
  pending:  [
    { label: '✓ Accept',      next: 'accepted',  bg: '#22c55e' },
    { label: 'Decline',       next: 'rejected',  bg: '#ef4444' },
  ],
  accepted: [
    { label: 'Mark active',   next: 'active',    bg: '#3b82f6' },
    { label: 'Decline',       next: 'rejected',  bg: '#ef4444' },
  ],
  active:   [
    { label: 'Mark complete', next: 'completed', bg: '#94a3b8' },
  ],
  rejected:  [],
  completed: [],
}

interface Agreement {
  id: string
  user_id: string
  project_id: string
  work_description: string
  expected_reward: string
  status: string
  admin_notes: string | null
  created_at: string
  first_name: string | null
  username: string | null
  project_title: string | null
}

interface Props {
  agreements: Agreement[]
}

export default function AgreementsAdminClient({ agreements: initial }: Props) {
  const supabase = createClient()
  const [agreements, setAgreements] = useState(initial)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(initial.map(a => [a.id, a.admin_notes ?? '']))
  )
  const [filter, setFilter] = useState<string>('pending')

  const counts: Record<string, number> = {
    all: agreements.length,
    pending: agreements.filter(a => a.status === 'pending').length,
    accepted: agreements.filter(a => a.status === 'accepted').length,
    active: agreements.filter(a => a.status === 'active').length,
    completed: agreements.filter(a => a.status === 'completed').length,
    rejected: agreements.filter(a => a.status === 'rejected').length,
  }

  const displayed = filter === 'all' ? agreements : agreements.filter(a => a.status === filter)

  async function takeAction(agreementId: string, next: string) {
    setLoading(agreementId)
    await supabase
      .from('collaboration_agreements')
      .update({ status: next, admin_notes: notes[agreementId] ?? null, updated_at: new Date().toISOString() })
      .eq('id', agreementId)
    setAgreements(prev => prev.map(a => a.id === agreementId ? { ...a, status: next } : a))
    setLoading(null)
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 20px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1d4ed8', background: '#1d4ed815', padding: '3px 10px', borderRadius: 20, marginBottom: 14 }}>
          {modLabel('06', 'Agreements — Admin Review')}
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 32, color: 'var(--ink)', marginBottom: 6 }}>
          Agreements waiting for you
        </h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>
          Review, accept, and progress collaboration agreements across all projects.
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {(['pending', 'accepted', 'active', 'completed', 'rejected', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 20,
            border: '1px solid var(--rule)', cursor: 'pointer', transition: 'all 120ms',
            background: filter === f ? 'var(--ink)' : 'var(--surface)',
            color: filter === f ? 'var(--bg)' : 'var(--ink-3)',
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f] ?? 0})
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-4)', fontSize: 14 }}>No {filter === 'all' ? '' : filter} proposals.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayed.map(a => {
            const meta = STATUS_META[a.status] ?? STATUS_META.pending
            const actions = NEXT_ACTIONS[a.status] ?? []
            const isOpen = expanded === a.id
            const date = new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            const name = a.first_name ?? a.username ?? 'Member'

            return (
              <div key={a.id} style={{
                background: 'var(--surface)', border: '1px solid var(--rule)',
                borderLeft: `4px solid ${meta.color}`, borderRadius: 'var(--radius)',
                overflow: 'hidden',
              }}>
                {/* Row header — click to expand */}
                <button onClick={() => setExpanded(isOpen ? null : a.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, padding: '14px 18px', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${meta.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>
                        {name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{name}</span>
                        {a.project_title && (
                          <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>→ {a.project_title}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 1 }}>Submitted {date}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: meta.color, background: `${meta.color}15`, padding: '3px 9px', borderRadius: 20 }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--ink-4)', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>▾</span>
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--rule)', padding: '18px 20px' }}>

                    {/* Proposal content */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>They will do</div>
                        <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{a.work_description}</p>
                      </div>
                      <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>They expect</div>
                        <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{a.expected_reward}</p>
                      </div>
                    </div>

                    {/* Project link */}
                    {a.project_title && (
                      <div style={{ marginBottom: 16 }}>
                        <Link href={`/operations/${a.project_id}`} style={{ fontSize: 12, color: 'var(--ink-4)', textDecoration: 'none' }}>
                          View project in Operations →
                        </Link>
                      </div>
                    )}

                    {/* Admin notes */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-4)', display: 'block', marginBottom: 6 }}>
                        Admin notes (optional)
                      </label>
                      <textarea
                        value={notes[a.id] ?? ''}
                        onChange={e => setNotes(n => ({ ...n, [a.id]: e.target.value }))}
                        rows={2}
                        placeholder="Internal notes about this proposal…"
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '8px 12px',
                          borderRadius: 'var(--radius)', border: '1px solid var(--rule)',
                          background: 'var(--surface)', color: 'var(--ink)', fontSize: 13,
                          resize: 'vertical', fontFamily: 'inherit', outline: 'none',
                        }}
                      />
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {actions.map(action => (
                        <button
                          key={action.next}
                          disabled={loading === a.id}
                          onClick={() => takeAction(a.id, action.next)}
                          style={{
                            background: action.next === 'rejected' ? 'var(--surface)' : action.bg,
                            color: action.next === 'rejected' ? action.bg : '#fff',
                            border: action.next === 'rejected' ? `1px solid ${action.bg}` : 'none',
                            fontSize: 13, fontWeight: 600, padding: '8px 18px',
                            borderRadius: 'var(--radius)', cursor: loading === a.id ? 'not-allowed' : 'pointer',
                            opacity: loading === a.id ? 0.6 : 1,
                          }}
                        >
                          {loading === a.id ? 'Saving…' : action.label}
                        </button>
                      ))}
                      {actions.length === 0 && (
                        <span style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>
                          No further actions for {meta.label.toLowerCase()} proposals.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
