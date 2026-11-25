'use client'
import { Chip, InlineIcon } from '@/core/components/v4'
import { useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { modLabel } from '@/core/lib/module-label'
import Link from 'next/link'
import { valueList } from '@/core/lib/skills-interests'
import type { ApplicantProfile } from './applications-server'

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',    color: '#f59e0b' },
  reviewing: { label: 'Reviewing',  color: '#3b82f6' },
  accepted:  { label: 'Accepted',   color: '#22c55e' },
  rejected:  { label: 'Declined',   color: '#ef4444' },
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
  profile?: ApplicantProfile | null
}

/** What the applicant told us in About you (#90): with no Blueprint questions this is the whole application (#93) */
function ApplicantSummary({ p, username }: { p: ApplicantProfile; username: string | null }) {
  const values = valueList(p.values)
  const rows: [string, string][] = ([
    ['What best describes them', p.describes.join(', ')],
    ['Based in', p.place ?? ''],
    ['Good at', p.skills.join(', ')],
    ['Curious about', p.interests.join(', ')],
    ['Values', values ? values.join(', ') : (p.values ?? '')],
    ['Offers', p.offers.join(', ')],
    ['Would like to receive', p.requests.join(' · ')],
  ] as [string, string][]).filter(([, v]) => v.trim())
  const label = { fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 2 } as const
  const text = { fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55, whiteSpace: 'pre-wrap' } as const
  return (
    <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {p.avatar_url && <img src={p.avatar_url} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          {p.headline && <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{p.headline}</div>}
          {username && <Link href={`/u/${username}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', textDecoration: 'underline' }}>Open their profile →</Link>}
        </div>
      </div>
      {p.about && <div><div style={label}>What they’re up to</div><div style={text}>{p.about}</div></div>}
      {rows.length > 0 && (
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {rows.map(([k, v]) => <div key={k}><div style={label}>{k}</div><div style={text}>{v}</div></div>)}
        </div>
      )}
      {!p.headline && !p.about && rows.length === 0 && <div style={{ ...text, fontStyle: 'italic' }}>They skipped About you.</div>}
    </div>
  )
}

interface Props {
  applications: Application[]
  questions: string[]
  canDecide: boolean
  /** Admin › Applications (v4 menu) has its own name; the Join page keeps the old one */
  standalone?: boolean
}

export default function JoinAdminClient({ applications: initial, questions, canDecide, standalone = false }: Props) {
  const supabase = createClient()
  const [apps, setApps] = useState(initial)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<{ id: string; message: string } | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(initial.map(a => [a.id, a.admin_notes ?? '']))
  )
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewing' | 'accepted' | 'rejected'>('pending')

  async function updateApplication(appId: string, userId: string, action: 'accept' | 'reject' | 'review') {
    if (!canDecide) return
    setLoading(appId)
    setSaveError(null)
    const newStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'reviewing'

    const { data: updated, error: appErr } = await supabase
      .from('applications')
      .update({ status: newStatus, admin_notes: notes[appId] ?? null, updated_at: new Date().toISOString() })
      .eq('id', appId)
      .select('id')

    if (appErr || !updated?.length) {
      setSaveError({ id: appId, message: 'The database did not change this application.' })
      setLoading(null)
      return
    }

    if (action === 'accept') {
      const { data: promoted, error: roleErr } = await supabase
        .from('user_profiles')
        .update({ role: 'joining' })
        .eq('id', userId)
        .select('id')
      if (roleErr || !promoted?.length) {
        setApps(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a))
        setSaveError({ id: appId, message: 'The application was accepted. The role was not changed to joining.' })
        setLoading(null)
        return
      }
    }

    setApps(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a))
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
          {standalone ? 'Admin' : modLabel('05', 'Join — Admin Review')}
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 32, color: 'var(--ink)', marginBottom: 6 }}>
          {standalone ? 'Applications' : 'Join applications'}
        </h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>
          Review, accept, or decline membership applications.
        </p>
      </div>

      {/* Filter chips: the chosen one is black (decision #31), the count beside it */}
      <div className="v4-chiprow" style={{ marginBottom: 24 }}>
        {(['pending', 'reviewing', 'accepted', 'rejected', 'all'] as const).map(f => (
          <Chip key={f} on={filter === f} onClick={() => setFilter(f)} count={counts[f]}>
            {f === 'rejected' ? 'Declined' : f.charAt(0).toUpperCase() + f.slice(1)}
          </Chip>
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
                    {app.profile && <ApplicantSummary p={app.profile} username={app.username} />}
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

                    {saveError?.id === app.id && (
                      <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 12px' }}>{saveError.message}</p>
                    )}

                    {canDecide ? (
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
                          {loading === app.id ? 'Saving…' : <><InlineIcon name="check" />Accept</>}
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
                      {app.status === 'accepted' && saveError?.id !== app.id && (
                        <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600, padding: '8px 0' }}>
                          <InlineIcon name="check" />Accepted — user role set to joining
                        </span>
                      )}
                    </div>
                    ) : (
                      <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0 }}>
                        Only an admin can accept, decline, or mark an application reviewing.
                      </p>
                    )}
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
