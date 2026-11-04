'use client'
import { useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',    color: '#f59e0b' },
  reviewing: { label: 'Reviewing',  color: '#3b82f6' },
  accepted:  { label: 'Accepted',   color: '#22c55e' },
  rejected:  { label: 'Rejected',   color: '#ef4444' },
}

interface Application {
  id: string
  user_id: string
  status: string
  answers: Record<string, string | string[]>
  admin_notes: string | null
  created_at: string
  first_name: string | null
  username: string | null
}

interface Props {
  applications: Application[]
  questions: string[]
}

export default function JoinAdminClient({ applications: initial, questions }: Props) {
  const supabase = createClient()
  const [apps, setApps] = useState(initial)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(initial.map(a => [a.id, a.admin_notes ?? '']))
  )
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewing' | 'accepted' | 'rejected'>('pending')

  async function updateApplication(appId: string, userId: string, action: 'accept' | 'reject' | 'review') {
    setLoading(appId)
    const newStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'reviewing'
    const newRole = action === 'accept' ? 'joining' : null

    const { error: appErr } = await supabase
      .from('applications')
      .update({ status: newStatus, admin_notes: notes[appId] ?? null, updated_at: new Date().toISOString() })
      .eq('id', appId)

    if (!appErr && newRole) {
      await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId)
    }

    if (!appErr) {
      setApps(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a))
    }
    setLoading(null)
  }

  const displayApps = filter === 'all' ? apps : apps.filter(a => a.status === filter)
  const counts = {
    all: apps.length,
    pending: apps.filter(a => a.status === 'pending').length,
    reviewing: apps.filter(a => a.status === 'reviewing').length,
    accepted: apps.filter(a => a.status === 'accepted').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 20px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '3px 10px', borderRadius: 20, marginBottom: 14 }}>
          M05 · Join — Admin Review
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 32, color: 'var(--ink)', marginBottom: 6 }}>
          Join applications
        </h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>
          Review, accept, or decline membership applications.
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {(['pending', 'reviewing', 'accepted', 'rejected', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 20,
            border: '1px solid var(--rule)', cursor: 'pointer', transition: 'all 120ms',
            background: filter === f ? 'var(--ink)' : 'var(--surface)',
            color: filter === f ? 'var(--bg)' : 'var(--ink-3)',
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {displayApps.length === 0 ? (
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-4)', fontSize: 14 }}>No {filter === 'all' ? '' : filter} applications.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayApps.map(app => {
            const meta = STATUS_META[app.status] ?? STATUS_META.pending
            const isOpen = expanded === app.id
            const submittedDate = new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

            return (
              <div key={app.id} style={{
                background: 'var(--surface)', border: '1px solid var(--rule)',
                borderLeft: `4px solid ${meta.color}`, borderRadius: 'var(--radius)',
                overflow: 'hidden',
              }}>
                {/* Row header */}
                <button onClick={() => setExpanded(isOpen ? null : app.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, padding: '14px 18px', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${meta.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>
                        {(app.first_name ?? '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {app.first_name ?? 'Unknown'}{app.username ? ` · @${app.username}` : ''}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 1 }}>Submitted {submittedDate}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: meta.color, background: `${meta.color}15`, padding: '3px 9px', borderRadius: 20 }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--ink-4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>▾</span>
                  </div>
                </button>

                {/* Expanded answers + actions */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--rule)', padding: '18px 20px' }}>
                    {/* Answers */}
                    <div style={{ marginBottom: 20 }}>
                      {/* The wording the applicant saw, if saved; otherwise today's questions */}
                      {((Array.isArray(app.answers._questions) ? app.answers._questions : questions) as string[]).map((q, i) => (
                        <div key={i} style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4 }}>{q}</div>
                          <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, background: 'var(--bg-2)', borderRadius: 'var(--radius)', padding: '8px 12px', whiteSpace: 'pre-wrap' }}>
                            {app.answers[`q${i}`] || <span style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>No answer</span>}
                          </div>
                        </div>
                      ))}
                      {app.answers.extra && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 4 }}>Anything else</div>
                          <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, background: 'var(--bg-2)', borderRadius: 'var(--radius)', padding: '8px 12px', whiteSpace: 'pre-wrap' }}>{app.answers.extra}</div>
                        </div>
                      )}
                    </div>

                    {/* Admin notes */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-4)', display: 'block', marginBottom: 6 }}>
                        Admin notes (optional)
                      </label>
                      <textarea
                        value={notes[app.id] ?? ''}
                        onChange={e => setNotes(n => ({ ...n, [app.id]: e.target.value }))}
                        rows={2}
                        placeholder="Internal notes about this applicant…"
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
                      {app.status !== 'accepted' && (
                        <button
                          disabled={loading === app.id}
                          onClick={() => updateApplication(app.id, app.user_id, 'accept')}
                          style={{
                            background: '#22c55e', color: '#fff', border: 'none',
                            fontSize: 13, fontWeight: 600, padding: '8px 18px',
                            borderRadius: 'var(--radius)', cursor: 'pointer', opacity: loading === app.id ? 0.6 : 1,
                          }}
                        >
                          {loading === app.id ? 'Saving…' : '✓ Accept'}
                        </button>
                      )}
                      {app.status !== 'reviewing' && app.status !== 'accepted' && (
                        <button
                          disabled={loading === app.id}
                          onClick={() => updateApplication(app.id, app.user_id, 'review')}
                          style={{
                            background: '#3b82f6', color: '#fff', border: 'none',
                            fontSize: 13, fontWeight: 600, padding: '8px 18px',
                            borderRadius: 'var(--radius)', cursor: 'pointer', opacity: loading === app.id ? 0.6 : 1,
                          }}
                        >
                          Mark reviewing
                        </button>
                      )}
                      {app.status !== 'rejected' && app.status !== 'accepted' && (
                        <button
                          disabled={loading === app.id}
                          onClick={() => updateApplication(app.id, app.user_id, 'reject')}
                          style={{
                            background: 'var(--surface)', color: '#ef4444', border: '1px solid #ef4444',
                            fontSize: 13, fontWeight: 600, padding: '8px 18px',
                            borderRadius: 'var(--radius)', cursor: 'pointer', opacity: loading === app.id ? 0.6 : 1,
                          }}
                        >
                          Decline
                        </button>
                      )}
                      {app.status === 'accepted' && (
                        <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600, padding: '8px 0' }}>
                          ✓ Accepted — user role set to joining
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
