'use client'
import { useState } from 'react'
import { isJoiningOrAbove } from '@/core/lib/roles'
import { createClient } from '@/core/lib/supabase/client'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommunityValue {
  id: string
  title: string
  description: string
  sort_order: number
}

interface UserProfile {
  first_name: string | null
  last_name: string | null
  headline: string | null
  city: string | null
  country: string | null
}

interface BuddyProfile {
  id: string
  first_name: string | null
  headline: string | null
  city: string | null
}

interface Props {
  userId: string | null
  userRole: string
  existingApplication: { status: string; answers: Record<string, string>; created_at: string } | null
  userProfile: UserProfile | null
  communityValues: CommunityValue[]
  /** Join application questions from the Blueprint (Step 1.4), one per line there */
  questions: string[]
  initialSignedValueIds: string[]
  buddyProfiles: BuddyProfile[]
  isProfileComplete: boolean
  hasContribution: boolean
  hasOwnProject: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const M5 = '#15803d'
const STEPS = ['Values & best practice', 'Match with a buddy', 'Submit application']

const STATUS_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  pending:   { label: 'Under review',    color: '#f59e0b', desc: 'Your application has been received and is waiting for the team to review it.' },
  reviewing: { label: 'Reviewing',       color: '#3b82f6', desc: 'The community team is actively reviewing your application.' },
  accepted:  { label: 'Accepted!',       color: '#22c55e', desc: 'Welcome to the community! Check your email for next steps.' },
  rejected:  { label: 'Not a fit (yet)', color: '#ef4444', desc: 'This application was not accepted at this time.' },
}

// Steps on the membership roadmap (advisors are shown at the member step)
const ROLE_ORDER = ['explorer', 'joining', 'member', 'project_lead', 'circle_lead', 'admin']

const ROLE_MAP = [
  {
    role: 'explorer',
    label: 'Explorer',
    color: '#0ea5e9',
    how: 'Sign up for a free account — takes under a minute.',
    access: [
      'Browse open projects and community members',
      'Read the community blueprint and values',
      'Explore the full platform before committing',
    ],
  },
  {
    role: 'joining',
    label: 'Joining Member',
    color: '#f59e0b',
    how: 'Complete the M05 Join application: sign the community values, get matched with a buddy, and submit.',
    access: [
      'Submit collaboration proposals on open projects',
      'View the Operations board and sprint progress',
      'Appear in community network matching',
    ],
  },
  {
    role: 'member',
    label: 'Full Member',
    color: M5,
    how: 'Application accepted. Activate by completing your first agreement or launching an active project.',
    access: [
      'Make binding collaboration agreements',
      'Vote and submit proposals in Governance',
      'Earn contribution points and build your reputation',
      'Full network access — offers, seeks, and direct matching',
    ],
  },
  {
    role: 'project_lead',
    label: 'Project Lead',
    color: '#8b5cf6',
    how: 'Appointed by an admin based on sustained project contributions.',
    access: [
      'Everything a Member can do',
      'Manage the full Operations panel',
      'Create and lead community projects',
      'Review and update deliverables',
    ],
  },
  {
    role: 'circle_lead',
    label: 'Circle Lead',
    color: '#ec4899',
    how: 'Appointed by an admin to steward a key area of the community.',
    access: [
      'Everything a Project Lead can do',
      'Manage the Blueprint and community values',
      'Review and accept Join applications',
      'Manage collaboration agreements and their status',
    ],
  },
  {
    role: 'admin',
    label: 'Admin',
    color: '#ef4444',
    how: 'Appointed by existing admins. Responsible for the overall health of the community.',
    access: [
      'Full edit access to every module',
      'Activate, pause, or archive projects',
      'Manage all member roles and permissions',
      'Access all admin panels across the platform',
    ],
  },
]

// ─── Milestone badges (shown in Explorer row) ─────────────────────────────────

const EXPLORER_BADGES = [
  {
    id: 'profile',
    label: 'Profile Pioneer',
    desc: 'Fill in your profile',
    icon: '🪪',
  },
  {
    id: 'accepted',
    label: 'Community Joiner',
    desc: 'Get accepted into the community',
    icon: '🎉',
  },
  {
    id: 'contribution',
    label: 'Collaborator',
    desc: 'Contribute to a community project',
    icon: '🤝',
  },
  {
    id: 'ownProject',
    label: 'Project Lead',
    desc: 'Propose and lead your own project',
    icon: '🚀',
  },
]

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ step }: { step: number }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 14, padding: '14px 18px', marginBottom: 24, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 0 }}>
        <div style={{ position: 'absolute', top: 16, left: 16, right: 16, height: 2, background: 'var(--rule)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 16, left: 16, height: 2, width: step === 0 ? '0%' : `${(step / (STEPS.length - 1)) * 100}%`, background: M5, zIndex: 1, transition: 'width 300ms ease' }} />
        {STEPS.map((label, i) => {
          const done = i < step
          const active = i === step
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative', zIndex: 2 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'all 200ms ease',
                background: done ? M5 : active ? 'var(--surface)' : 'var(--bg-2)',
                border: done ? 'none' : active ? `2px solid ${M5}` : '1px solid var(--rule)',
                color: done ? '#fff' : active ? M5 : 'var(--ink-4)',
                boxShadow: active ? `0 0 0 4px color-mix(in srgb, ${M5} 15%, transparent)` : 'none',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'center', lineHeight: 1.3, color: active ? 'var(--ink)' : 'var(--ink-3)', fontWeight: active ? 700 : 400 }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Profile summary card ─────────────────────────────────────────────────────

function ProfileSummary({ profile }: { profile: UserProfile | null }) {
  const isComplete = !!(profile?.first_name && profile?.headline)
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || null
  const location = [profile?.city, profile?.country].filter(Boolean).join(', ') || null

  if (!isComplete) {
    return (
      <div style={{ background: 'color-mix(in srgb, #f59e0b 8%, var(--bg))', border: '1px solid color-mix(in srgb, #f59e0b 35%, var(--rule))', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>Your profile is incomplete</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>Complete your profile so members can get to know you and you appear in matching.</div>
        </div>
        <Link href="/profile/edit" style={{ background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 700, padding: '7px 16px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
          Complete profile →
        </Link>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: `color-mix(in srgb, ${M5} 12%, var(--bg))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: M5 }}>
        {(profile?.first_name?.[0] ?? '?').toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{name}</div>
        {profile?.headline && <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 1 }}>{profile.headline}</div>}
        {location && <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)', marginTop: 2 }}>{location}</div>}
      </div>
      <Link href="/profile/edit" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', padding: '6px 14px', border: '1px solid var(--rule)', borderRadius: 8, textDecoration: 'none', background: 'var(--bg-2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
        Edit profile
      </Link>
    </div>
  )
}

// ─── Step components ──────────────────────────────────────────────────────────

/** Shown on a step when the community hasn't written its values or questions yet. */
function SetupNotice({ what }: { what: string }) {
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px dashed var(--rule)', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
      No {what} yet. An admin adds them in the Blueprint, under <strong>Step 1.4 · First Agreements</strong>.{' '}
      <Link href="/blueprint?step=s1.4" style={{ color: M5, fontWeight: 600 }}>Open the Blueprint →</Link>
    </div>
  )
}


function Step1Values({ userId, values, signedIds, onToggle, onNext }: { userId: string; values: CommunityValue[]; signedIds: Set<string>; onToggle: (id: string, signed: boolean) => void; onNext: () => void }) {
  const signedCount = signedIds.size
  const total = values.length
  // With no values written yet, the step can't block anyone
  const allSigned = signedCount >= total
  const remaining = total - signedCount

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 14, padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Sign the values</h3>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: M5, background: `color-mix(in srgb, ${M5} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${M5} 30%, transparent)`, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {signedCount}/{total} signed
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 20, lineHeight: 1.6, maxWidth: '52ch' }}>
        These are the rules of life in this community. Tap each one to acknowledge and sign your commitment.
      </p>
      {total === 0 && <SetupNotice what="community values" />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {values.map(v => {
          const signed = signedIds.has(v.id)
          return (
            <button key={v.id} onClick={() => onToggle(v.id, signed)} style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto', gap: '0 12px', alignItems: 'center', border: `1px solid ${signed ? `color-mix(in srgb, ${M5} 40%, var(--rule))` : 'var(--rule)'}`, background: signed ? `color-mix(in srgb, ${M5} 6%, var(--surface))` : 'var(--surface)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 150ms, background 150ms' }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${signed ? M5 : 'var(--rule)'}`, background: signed ? M5 : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 150ms' }}>
                {signed && <svg width="11" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 4l3 3 6-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{v.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>{v.description}</div>
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: signed ? M5 : 'var(--ink-4)', whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: 2 }}>{signed ? 'Signed' : 'Tap to sign'}</span>
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none', padding: '8px 0' }}>← Dashboard</Link>
        <span style={{ flex: 1 }} />
        <button onClick={allSigned ? onNext : undefined} disabled={!allSigned} style={{ background: allSigned ? M5 : 'var(--bg-2)', color: allSigned ? '#fff' : 'var(--ink-4)', fontSize: 14, fontWeight: 600, padding: '10px 20px', borderRadius: 8, border: 'none', cursor: allSigned ? 'pointer' : 'not-allowed', transition: 'all 150ms' }}>
          {allSigned ? 'Next step →' : `Sign ${remaining} more to continue`}
        </button>
      </div>
    </div>
  )
}

function Step2Buddy({ buddies, onBack, onNext }: { buddies: BuddyProfile[]; onBack: () => void; onNext: () => void }) {
  const [requested, setRequested] = useState<Set<string>>(new Set())
  const avatarColors = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981']
  function getInitials(name: string | null) { return name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?' }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 14, padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Match with a buddy</h3>
      <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 20, lineHeight: 1.6, maxWidth: '52ch' }}>We suggest a few existing community members who might be a good fit. Request an introduction to connect.</p>
      {buddies.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic', marginBottom: 20 }}>No members available for buddy matching yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {buddies.map((b, i) => {
            const done = requested.has(b.id)
            return (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarColors[i % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{getInitials(b.first_name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{b.first_name ?? 'Community member'}</div>
                  {b.headline && <div style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.headline}</div>}
                  {b.city && <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)', marginTop: 2 }}>{b.city}</div>}
                </div>
                <button onClick={() => setRequested(prev => new Set([...prev, b.id]))} disabled={done} style={{ fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: done ? 'none' : `1px solid ${M5}`, background: done ? `color-mix(in srgb, ${M5} 10%, transparent)` : 'transparent', color: M5, cursor: done ? 'default' : 'pointer', whiteSpace: 'nowrap', transition: 'all 150ms' }}>
                  {done ? '✓ Requested' : 'Request intro'}
                </button>
              </div>
            )
          })}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '8px 0' }}>← Back</button>
        <span style={{ flex: 1 }} />
        <button onClick={onNext} style={{ background: M5, color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Next step →</button>
      </div>
    </div>
  )
}

function Step3Submit({ userId, questions, signedCount, totalValues, onBack, onSubmitted }: { userId: string; questions: string[]; signedCount: number; totalValues: number; onBack: () => void; onSubmitted: () => void }) {
  const supabase = createClient()
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''))
  const [extra, setExtra] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    // q0, q1… match the Blueprint's questions; _questions keeps their wording in case they're edited later
    const payload: Record<string, unknown> = { extra, _questions: questions }
    questions.forEach((_, i) => { payload[`q${i}`] = answers[i]?.trim() ?? '' })
    const { error: err } = await supabase.from('applications').upsert({ user_id: userId, answers: payload, status: 'pending' }, { onConflict: 'user_id' })
    if (err) { setError(err.message); setSubmitting(false); return }
    onSubmitted()
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 14, padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Submit application</h3>
      <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 20, lineHeight: 1.6 }}>Review your progress and submit your application to the community team.</p>
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 6 }}>
          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{signedCount}</span> of <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{totalValues}</span> values signed
        </div>
        {signedCount < totalValues && <div style={{ fontSize: 12, color: '#f59e0b', fontFamily: 'var(--mono)' }}>Note: you haven't signed all values yet. Go back to complete step 1.</div>}
      </div>
      {questions.length === 0 ? <SetupNotice what="application questions" /> : questions.map((q, i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>{q}</label>
          <textarea value={answers[i] ?? ''} onChange={e => setAnswers(a => a.map((x, j) => (j === i ? e.target.value : x)))} rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} />
        </div>
      ))}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Anything else you'd like the community to know?</label>
        <textarea value={extra} onChange={e => setExtra(e.target.value)} placeholder="Optional — share any context, questions, or thoughts…" rows={4} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} />
      </div>
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>{error}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '8px 0' }}>← Back</button>
        <span style={{ flex: 1 }} />
        <button onClick={handleSubmit} disabled={submitting} style={{ background: M5, color: '#fff', fontSize: 14, fontWeight: 600, padding: '11px 28px', borderRadius: 8, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, transition: 'opacity 150ms' }}>
          {submitting ? 'Submitting…' : 'Submit application'}
        </button>
      </div>
    </div>
  )
}

// ─── Role Roadmap ─────────────────────────────────────────────────────────────

interface RoadmapProps {
  currentRole: string | null
  milestones: { profile: boolean; accepted: boolean; contribution: boolean; ownProject: boolean }
  applicationStatus: string | null
  onApply?: () => void
  onReapply?: () => void
  userId: string | null
}

function RoleRoadmap({ currentRole, milestones, applicationStatus, onApply, onReapply, userId }: RoadmapProps) {
  const currentIdx = currentRole ? ROLE_ORDER.indexOf(currentRole === 'advisor' ? 'member' : currentRole) : -1

  const doneMap: Record<string, boolean> = {
    profile: milestones.profile,
    accepted: milestones.accepted,
    contribution: milestones.contribution,
    ownProject: milestones.ownProject,
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 32px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 40, maxWidth: 600 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: M5, background: `color-mix(in srgb, ${M5} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${M5} 25%, transparent)`, padding: '3px 10px', borderRadius: 999, marginBottom: 18 }}>
          Module 05 · Join
        </span>
        <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', color: 'var(--ink)', marginBottom: 14 }}>
          Community roles & your progress
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.65, margin: 0 }}>
          Every role is earned, not assigned. Here's the full path — where you are now and what opens up as you grow with the community.
        </p>
      </div>

      {/* Role cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ROLE_MAP.map((r, i) => {
          const roleIdx = ROLE_ORDER.indexOf(r.role)
          const isCurrent = r.role === currentRole
          const isPast = currentIdx > -1 && roleIdx < currentIdx
          const isFuture = currentIdx === -1 || roleIdx > currentIdx

          return (
            <div key={r.role} style={{
              display: 'grid', gridTemplateColumns: '52px 1fr', gap: '0 20px',
              background: isCurrent ? `color-mix(in srgb, ${r.color} 5%, var(--surface))` : 'var(--surface)',
              border: isCurrent ? `2px solid color-mix(in srgb, ${r.color} 40%, var(--rule))` : '1px solid var(--rule)',
              borderRadius: 14, padding: '22px',
              boxShadow: isCurrent ? `0 0 0 4px color-mix(in srgb, ${r.color} 8%, transparent)` : 'var(--shadow-sm)',
              opacity: isFuture && currentRole !== null ? 0.72 : 1,
              transition: 'opacity 150ms',
            }}>

              {/* Step dot + connector */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: isPast ? r.color : isCurrent ? `color-mix(in srgb, ${r.color} 15%, var(--bg))` : 'var(--bg-3)',
                  border: isPast ? 'none' : `2px solid color-mix(in srgb, ${r.color} ${isCurrent ? 60 : 20}%, var(--rule))`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                  color: isPast ? '#fff' : isCurrent ? r.color : 'var(--ink-4)',
                }}>
                  {isPast ? (
                    <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                      <path d="M1 5l4 4 8-8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : String(i + 1).padStart(2, '0')}
                </div>
                {i < ROLE_MAP.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 12, background: isPast ? r.color : 'var(--rule)', marginTop: 6, opacity: isPast ? 0.4 : 1 }} />
                )}
              </div>

              {/* Content */}
              <div style={{ paddingTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{r.label}</h3>
                  {isCurrent && (
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: r.color, background: `color-mix(in srgb, ${r.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${r.color} 35%, transparent)`, padding: '2px 9px', borderRadius: 999 }}>
                      Your role
                    </span>
                  )}
                  {!userId && r.role === 'explorer' && (
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: r.color, background: `color-mix(in srgb, ${r.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${r.color} 35%, transparent)`, padding: '2px 9px', borderRadius: 999 }}>
                      Start here
                    </span>
                  )}
                </div>

                <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 12px', lineHeight: 1.55, fontStyle: 'italic' }}>{r.how}</p>

                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: r.role === 'explorer' ? 16 : 0 }}>
                  {r.access.map((item, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                      <span style={{ width: 15, height: 15, borderRadius: '50%', flexShrink: 0, marginTop: 1, background: `color-mix(in srgb, ${r.color} ${isPast || isCurrent ? 12 : 6}%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                          <path d="M1 2.5l1.5 1.5 3.5-3.5" stroke={r.color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity={isFuture && currentRole !== null ? 0.5 : 1} />
                        </svg>
                      </span>
                      <span style={{ fontSize: 13, color: isFuture && currentRole !== null ? 'var(--ink-4)' : 'var(--ink-2)', lineHeight: 1.5 }}>{item}</span>
                    </li>
                  ))}
                </ul>

                {/* ── Explorer milestone badges ── */}
                {r.role === 'explorer' && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 10, fontFamily: 'var(--mono)' }}>
                      Badges you can earn
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {EXPLORER_BADGES.map(b => {
                        const done = doneMap[b.id] ?? false
                        return (
                          <div key={b.id} title={b.desc} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                            background: done
                              ? `color-mix(in srgb, ${r.color} 12%, var(--surface))`
                              : 'var(--bg-2)',
                            border: `1px solid ${done ? `color-mix(in srgb, ${r.color} 35%, var(--rule))` : 'var(--rule)'}`,
                            color: done ? r.color : 'var(--ink-4)',
                            transition: 'all 150ms',
                          }}>
                            <span style={{ fontSize: 14 }}>{b.icon}</span>
                            <span>{b.label}</span>
                            {done && (
                              <svg width="12" height="9" viewBox="0 0 12 9" fill="none" style={{ flexShrink: 0 }}>
                                <path d="M1 4.5l3 3 7-7" stroke={r.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Joining Member: application CTA or status ── */}
                {r.role === 'joining' && userId && (currentRole === 'explorer' || currentRole === 'joining') && (
                  <div style={{ marginTop: 14 }}>
                    {applicationStatus && applicationStatus !== 'rejected' ? (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: `color-mix(in srgb, ${STATUS_LABELS[applicationStatus]?.color ?? '#f59e0b'} 10%, var(--surface))`,
                        border: `1px solid color-mix(in srgb, ${STATUS_LABELS[applicationStatus]?.color ?? '#f59e0b'} 35%, var(--rule))`,
                        color: STATUS_LABELS[applicationStatus]?.color ?? '#f59e0b',
                      }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                        {STATUS_LABELS[applicationStatus]?.label ?? 'Application submitted'}
                      </div>
                    ) : applicationStatus === 'rejected' ? (
                      <button onClick={onReapply} style={{ background: r.color, color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                        Submit a new application →
                      </button>
                    ) : currentRole === 'explorer' && onApply ? (
                      <button onClick={onApply} style={{ background: r.color, color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                        Apply to join →
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Guest CTA */}
      {!userId && (
        <div style={{ marginTop: 32, background: `color-mix(in srgb, ${M5} 5%, var(--surface))`, border: `1px solid color-mix(in srgb, ${M5} 20%, var(--rule))`, borderRadius: 16, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Start your journey as an Explorer</div>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>Free to join. No obligation. When you're ready to apply, this page walks you through every step.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
            <Link href="/auth/signup" style={{ background: M5, color: '#fff', fontSize: 14, fontWeight: 700, padding: '11px 26px', borderRadius: 9, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Create free account →
            </Link>
            <Link href="/auth/login" style={{ background: 'var(--surface)', color: 'var(--ink-2)', fontSize: 14, fontWeight: 500, padding: '11px 20px', borderRadius: 9, textDecoration: 'none', border: '1px solid var(--rule)', whiteSpace: 'nowrap' }}>
              Sign in
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main client ──────────────────────────────────────────────────────────────

export default function JoinClient({
  userId, userRole, existingApplication, userProfile,
  communityValues, questions, initialSignedValueIds, buddyProfiles,
  isProfileComplete, hasContribution, hasOwnProject,
}: Props) {
  const supabase = createClient()

  const [showForm, setShowForm] = useState(false)
  const [step, setStep] = useState(0)
  const [signedIds, setSignedIds] = useState<Set<string>>(new Set(initialSignedValueIds))
  const [submitted, setSubmitted] = useState(false)
  const [reapplying, setReapplying] = useState(false)

  const isAccepted = isJoiningOrAbove(userRole)

  const milestones = {
    profile: isProfileComplete,
    accepted: isAccepted,
    contribution: hasContribution,
    ownProject: hasOwnProject,
  }

  // ── Everyone sees the roadmap unless they're in the apply form ───────────────
  if (!showForm) {
    return (
      <RoleRoadmap
        currentRole={userId ? userRole : null}
        milestones={milestones}
        applicationStatus={existingApplication?.status ?? null}
        onApply={userId && userRole === 'explorer' && !existingApplication ? () => setShowForm(true) : undefined}
        onReapply={existingApplication?.status === 'rejected' ? () => { setReapplying(true); setShowForm(true) } : undefined}
        userId={userId}
      />
    )
  }

  // ── Success state ────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '26px 32px 80px' }}>
        <div style={{ maxWidth: 560, textAlign: 'center', margin: '60px auto 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `color-mix(in srgb, ${M5} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28, color: M5 }}>✓</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: 'var(--ink)' }}>Application submitted</h1>
          <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.65, marginBottom: 32 }}>Thank you for applying. The community team will review your answers and reach out soon.</p>
          <button
            onClick={() => setShowForm(false)}
            style={{ display: 'inline-block', background: M5, color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', textDecoration: 'none' }}
          >
            View your progress →
          </button>
        </div>
      </div>
    )
  }

  // ── Multi-step application form ──────────────────────────────────────────────
  async function handleToggleValue(valueId: string, wasSigned: boolean) {
    if (!userId) return
    setSignedIds(prev => {
      const next = new Set(prev)
      if (wasSigned) next.delete(valueId); else next.add(valueId)
      return next
    })
    if (wasSigned) {
      const { error } = await supabase.from('value_signatures').delete().match({ user_id: userId, value_id: valueId })
      if (error) setSignedIds(prev => { const next = new Set(prev); next.add(valueId); return next })
    } else {
      const { error } = await supabase.from('value_signatures').insert({ user_id: userId, value_id: valueId })
      if (error) setSignedIds(prev => { const next = new Set(prev); next.delete(valueId); return next })
    }
  }

  const stepDescriptions = ['Read and sign the community values', 'Get matched with a welcoming buddy', 'Send your application for review']

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '26px 32px 80px' }}>
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--ink-4)', fontWeight: 500, cursor: 'pointer', padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 5 }}>
          ← Back to overview
        </button>
        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: M5, background: `color-mix(in srgb, ${M5} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${M5} 25%, transparent)`, padding: '3px 10px', borderRadius: 999, marginBottom: 14 }}>
          Module 05 · Join
        </span>
        <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 6 }}>
          {reapplying ? 'Reapply to the community' : 'Become a joining member'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
          Step {step + 1} of {STEPS.length} · {stepDescriptions[step]}
        </p>
      </div>

      {reapplying && (
        <div style={{ background: 'color-mix(in srgb, #f59e0b 8%, var(--bg))', border: '1px solid color-mix(in srgb, #f59e0b 35%, var(--rule))', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--ink)' }}>Reapplying</strong> — your previous application was not accepted. Complete the steps below and submit a new one.
        </div>
      )}

      <ProfileSummary profile={userProfile} />
      <Stepper step={step} />

      {step === 0 && userId && (
        <Step1Values userId={userId} values={communityValues} signedIds={signedIds} onToggle={handleToggleValue} onNext={() => setStep(1)} />
      )}
      {step === 1 && (
        <Step2Buddy buddies={buddyProfiles} onBack={() => setStep(0)} onNext={() => setStep(2)} />
      )}
      {step === 2 && userId && (
        <Step3Submit userId={userId} questions={questions} signedCount={signedIds.size} totalValues={communityValues.length} onBack={() => setStep(1)} onSubmitted={() => setSubmitted(true)} />
      )}
    </div>
  )
}
