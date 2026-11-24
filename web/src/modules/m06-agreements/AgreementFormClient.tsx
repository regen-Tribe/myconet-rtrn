'use client'
import { Icon } from '@/core/components/v4'
import { useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import Link from 'next/link'
import { modLabel } from '@/core/lib/module-label'

const STATUS_STYLE: Record<string, { label: string; color: string; desc: string }> = {
  pending:   { label: 'Pending review', color: '#f59e0b', desc: 'Your offer is waiting for the task lead to review it.' },
  accepted:  { label: 'Accepted',       color: '#22c55e', desc: 'Your collaboration agreement was accepted!' },
  active:    { label: 'Active',         color: '#3b82f6', desc: 'Your collaboration is underway.' },
  rejected:  { label: 'Not accepted',   color: '#ef4444', desc: 'This proposal was not accepted at this time.' },
  completed: { label: 'Completed',      color: '#94a3b8', desc: 'This collaboration has been completed.' },
}

interface Project { id: string; title: string; description: string | null }

export default function AgreementFormClient({ project, userId, existing }: {
  project: Project
  userId: string
  existing: { id: string; work_description: string; expected_reward: string; status: string } | null
}) {
  const supabase = createClient()
  const [workDesc, setWorkDesc] = useState(existing?.work_description ?? '')
  const [reward, setReward] = useState(existing?.expected_reward ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 14px', borderRadius: 'var(--radius)',
    border: '1px solid var(--rule)', background: 'var(--surface)',
    color: 'var(--ink)', fontSize: 14, outline: 'none', fontFamily: 'inherit',
    lineHeight: 1.6, resize: 'vertical',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: err } = await supabase.from('collaboration_agreements').upsert({
      project_id: project.id,
      user_id: userId,
      work_description: workDesc.trim(),
      expected_reward: reward.trim(),
      status: 'pending',
    }, { onConflict: 'project_id,user_id' })
    if (err) { setError(err.message); setSubmitting(false); return }
    setSubmitted(true)
    setSubmitting(false)
  }

  // Already submitted — show status
  if (existing && !submitted) {
    const s = STATUS_STYLE[existing.status] ?? STATUS_STYLE.pending
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 20px 80px' }}>
        <Link href="/agreements" style={{ fontSize: 13, color: 'var(--ink-4)', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 28 }}>
          ← Agreements
        </Link>
        <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--rv-neutral, #1d4ed8)', background: 'var(--rv-neutral-bg, #1d4ed815)', padding: '3px 10px', borderRadius: 20, marginBottom: 16 }}>
          {modLabel('06', 'Agreements')}
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 26, color: 'var(--ink)', marginBottom: 4 }}>
          {project.title}
        </h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 28 }}>Your collaboration proposal</p>

        <div style={{ background: 'var(--surface)', border: `2px solid ${s.color}30`, borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
            <span style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--ink)' }}>{s.label}</span>
          </div>
          <p style={{ color: 'var(--ink-2)', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>What I'll do</div>
            <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{existing.work_description}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>What I expect</div>
            <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{existing.expected_reward}</div>
          </div>
        </div>

        <Link href="/agreements" style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500, textDecoration: 'none' }}>← Back to agreements</Link>
      </div>
    )
  }

  // Success
  if (submitted) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ marginBottom: 16, color: 'var(--rv-good, #235C3B)' }}><Icon name="check-circle" size={48} /></div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 26, marginBottom: 12 }}>Proposal submitted</h1>
        <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.65, marginBottom: 32 }}>
          The task lead will review your offer for <strong>{project.title}</strong> and get back to you.
        </p>
        <Link href="/agreements" style={{ display: 'inline-block', background: 'var(--rv-primary, #1d4ed8)', color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 24px', borderRadius: 'var(--radius)', textDecoration: 'none' }}>
          Back to agreements
        </Link>
      </div>
    )
  }

  // Proposal form
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 20px 80px' }}>
      <Link href="/agreements" style={{ fontSize: 13, color: 'var(--ink-4)', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 28 }}>
        ← Agreements
      </Link>

      <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--rv-neutral, #1d4ed8)', background: 'var(--rv-neutral-bg, #1d4ed815)', padding: '3px 10px', borderRadius: 20, marginBottom: 16 }}>
        {modLabel('06', 'Agreements')}
      </div>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 26, color: 'var(--ink)', marginBottom: 4 }}>
        Collaborate on: {project.title}
      </h1>
      {project.description && (
        <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.65, marginBottom: 28 }}>{project.description}</p>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
            What will you do on this project? *
          </label>
          <textarea
            value={workDesc}
            onChange={e => setWorkDesc(e.target.value)}
            placeholder="Describe specifically what you'll contribute — tasks, time commitment, skills you'll apply…"
            rows={5}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
            What do you expect in return? *
          </label>
          <textarea
            value={reward}
            onChange={e => setReward(e.target.value)}
            placeholder="e.g. 2 nights lodging per work week · $300/month · skill exchange · community contribution credits…"
            rows={4}
            required
            style={inputStyle}
          />
          <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6 }}>
            Be specific — this becomes the basis of the agreement the team accepts or negotiates.
          </p>
        </div>

        {error && (
          <div style={{ background: 'var(--rv-bad-bg, #fef2f2)', border: '1px solid var(--rv-bad-line, #fecaca)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--rv-bad, #dc2626)', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            type="submit"
            disabled={submitting || !workDesc.trim() || !reward.trim()}
            style={{
              background: 'var(--rv-primary, #1d4ed8)', color: '#fff', fontSize: 14, fontWeight: 600,
              padding: '11px 28px', borderRadius: 'var(--radius)', border: 'none',
              cursor: submitting || !workDesc.trim() || !reward.trim() ? 'not-allowed' : 'pointer',
              opacity: submitting || !workDesc.trim() || !reward.trim() ? 0.65 : 1,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit proposal'}
          </button>
          <Link href="/agreements" style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500, textDecoration: 'none' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
