'use client'
import { useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { formatDeadline } from '@/core/lib/format'
import NewProjectModal from './NewProjectModal'
import { FormField, FocusInput, FocusTextarea } from './AgreementFormFields'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string
  title: string
  description: string | null
  status: string
  open_for_collaborators: boolean
  needs: string[] | null
  deadline: string | null
  lead_user_id: string | null
  created_by: string | null
  lead_name: string | null
  lead_initial: string
  lead_color: string
}

interface Agreement {
  id: string
  project_id: string
  work_description: string
  expected_reward: string
  status: string
  created_at: string
}

interface Props {
  projects: Project[]
  myAgreements: Agreement[]
  userRole: string
  userId: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  dashed,
  onClick,
}: {
  label: string
  active?: boolean
  dashed?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        padding: '5px 13px',
        borderRadius: 20,
        border: dashed
          ? '1.5px dashed var(--rule)'
          : active
          ? '1px solid transparent'
          : '1px solid var(--rule)',
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--bg)' : 'var(--ink-3)',
        cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
        transition: 'all 120ms',
      }}
    >
      {label}
    </button>
  )
}

function ProjectCard({
  project,
  selected,
  onClick,
}: {
  project: Project
  selected: boolean
  onClick: () => void
}) {
  const needs = project.needs ?? []
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'var(--surface)',
        border: `1px solid ${selected ? 'var(--m6)' : 'var(--rule)'}`,
        borderRadius: 10,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'border-color 120ms, box-shadow 120ms',
        boxShadow: selected
          ? '0 0 0 3px color-mix(in srgb, var(--m6) 12%, transparent)'
          : 'var(--shadow-sm)',
        display: 'block',
      }}
    >
      {/* Top row: avatar + name + status pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: project.lead_color,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
            {project.lead_initial}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2, marginBottom: 1 }}>
            {project.title}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.02em' }}>
            by {project.lead_name ?? 'Unknown'} · deadline {formatDeadline(project.deadline)}
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            color: '#15803d',
            background: '#15803d12',
            padding: '2px 8px',
            borderRadius: 20,
            flexShrink: 0,
            whiteSpace: 'nowrap' as const,
          }}
        >
          ● OPEN
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <p style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5, margin: '0 0 8px', paddingLeft: 37 }}>
          {project.description}
        </p>
      )}

      {/* Needs chips */}
      {needs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5, paddingLeft: 37, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--ink-4)', marginRight: 2 }}>
            NEEDS
          </span>
          {needs.map((tag, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'color-mix(in srgb, var(--m6) 80%, var(--ink))',
                background: 'color-mix(in srgb, var(--m6) 9%, var(--surface))',
                border: '1px solid color-mix(in srgb, var(--m6) 18%, transparent)',
                padding: '2px 8px',
                borderRadius: 12,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}


// ─── Main component ───────────────────────────────────────────────────────────

export default function AgreementsClient({
  projects,
  myAgreements: initialAgreements,
  userRole,
  userId,
}: Props) {
  const supabase = createClient()

  const [myAgreements, setMyAgreements] = useState<Agreement[]>(initialAgreements)
  const [selectedId, setSelectedId] = useState<string | null>(projects[0]?.id ?? null)
  const [view, setView] = useState<'mine' | 'browse'>('mine')
  const [filter, setFilter] = useState<'open' | 'mine' | 'all'>('open')
  const [workDescription, setWorkDescription] = useState('')
  const [expectedReward, setExpectedReward] = useState('')
  const [conditions, setConditions] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)

  const isExplorer = userRole === 'explorer'
  const isGuest = !userId

  // Existing proposal for the currently selected project
  const existingAgreement = myAgreements.find(a => a.project_id === selectedId) ?? null
  // Can resubmit if draft or rejected; anything else blocks a new submission
  const canResubmit = existingAgreement?.status === 'draft' || existingAgreement?.status === 'rejected'
  const hasBlockingProposal = !!existingAgreement && !canResubmit

  // Filter logic
  const myProjectIds = new Set(myAgreements.map(a => a.project_id))
  const openProjects = projects.filter(p => ['backlog', 'in_progress', 'review'].includes(p.status) && p.open_for_collaborators)
  const mineProjects = projects.filter(p => myProjectIds.has(p.id))
  const filteredProjects =
    filter === 'open'
      ? openProjects
      : filter === 'mine'
      ? mineProjects
      : projects

  const selectedProject = projects.find(p => p.id === selectedId) ?? null

  async function handleSendProposal() {
    if (!userId || !selectedId || !workDescription.trim() || !expectedReward.trim()) return
    setSubmitting(true)
    setSubmitError(null)

    const { data: inserted, error } = await supabase
      .from('collaboration_agreements')
      .upsert({
        user_id: userId,
        project_id: selectedId,
        work_description: workDescription.trim(),
        expected_reward: expectedReward.trim(),
        conditions: conditions.trim() || null,
        status: 'pending',
      }, { onConflict: 'project_id,user_id' })
      .select('id, created_at')
      .single()

    if (error) {
      setSubmitError(error.message)
      setSubmitting(false)
      return
    }

    setMyAgreements(prev => [
      {
        id: inserted.id,
        project_id: selectedId,
        work_description: workDescription.trim(),
        expected_reward: expectedReward.trim(),
        status: 'pending',
        created_at: inserted.created_at,
      },
      ...prev,
    ])
    setSubmitted(true)
    setSubmitting(false)
    setWorkDescription('')
    setExpectedReward('')
    setConditions('')
  }

  async function handleSaveDraft() {
    if (!userId || !selectedId) return
    setSubmitting(true)
    setSubmitError(null)

    const { error } = await supabase.from('collaboration_agreements').upsert({
      user_id: userId,
      project_id: selectedId,
      work_description: workDescription.trim() || '(draft)',
      expected_reward: expectedReward.trim() || '(draft)',
      conditions: conditions.trim() || null,
      status: 'draft',
    }, { onConflict: 'project_id,user_id' })

    if (error) {
      setSubmitError(error.message)
    } else {
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '26px 32px 60px' }}>

      {/* Page head */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 24, flexWrap: 'wrap' as const }}>
        <div>
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--m6)', background: 'color-mix(in srgb, var(--m6) 10%, transparent)', padding: '3px 10px', borderRadius: 20, marginBottom: 12 }}>
            Module 06 · Agreements
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', lineHeight: 1.15, marginBottom: 8 }}>
            Agreements
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', maxWidth: 520, lineHeight: 1.55 }}>
            Propose exactly what you'll contribute to a project, and exactly what you expect in return.
          </p>
        </div>
        <button
          style={{ fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--m6)', color: '#fff', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => setShowNewProject(true)}
        >
          + Propose new project
        </button>
      </div>

      {/* Tab row */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--rule)', paddingBottom: 0 }}>
        {([['mine', 'My Agreements'], ['browse', 'Browse & Propose']] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              fontSize: 13, fontWeight: view === v ? 700 : 500,
              color: view === v ? 'var(--m6)' : 'var(--ink-3)',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 16px', marginBottom: -1,
              borderBottom: view === v ? '2px solid var(--m6)' : '2px solid transparent',
              transition: 'color 120ms, border-color 120ms',
            }}
          >
            {label}{v === 'mine' && myAgreements.length > 0 ? ` (${myAgreements.length})` : ''}
          </button>
        ))}
      </div>

      {/* ── MY AGREEMENTS VIEW ─────────────────────────────────── */}
      {view === 'mine' && (
        <div>
          {myAgreements.length === 0 ? (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 12, padding: '48px 28px', textAlign: 'center' as const, maxWidth: 480 }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>🤝</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>No agreements yet</div>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 20 }}>
                Browse open projects and propose what you'll contribute and what you expect in return.
              </p>
              <button
                onClick={() => setView('browse')}
                style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--m6)', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer' }}
              >
                Browse projects →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12, maxWidth: 700 }}>
              {myAgreements.map(a => {
                const proj = projects.find(p => p.id === a.project_id)
                const STATUS_COLOR: Record<string, string> = {
                  accepted: '#15803d', active: '#3b82f6', completed: '#94a3b8', rejected: '#ef4444', pending: '#f59e0b', draft: '#94a3b8',
                }
                const color = STATUS_COLOR[a.status] ?? '#f59e0b'
                return (
                  <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{proj?.title ?? 'Project'}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color, background: `${color}18`, padding: '3px 10px', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap' as const }}>
                        {a.status}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--ink-4)', marginBottom: 4 }}>Will contribute</div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>{a.work_description}</div>
                      </div>
                      <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--ink-4)', marginBottom: 4 }}>Expects in return</div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>{a.expected_reward}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                      Submitted {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                )
              })}
              <button
                onClick={() => setView('browse')}
                style={{ alignSelf: 'flex-start' as const, fontSize: 13, fontWeight: 600, color: 'var(--m6)', background: 'none', border: '1px solid color-mix(in srgb, var(--m6) 35%, var(--rule))', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', marginTop: 4 }}
              >
                + Propose on another project
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── BROWSE & PROPOSE VIEW ──────────────────────────────── */}
      {view === 'browse' && (
      <div
        className="agreements-split"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 18, alignItems: 'start' }}
      >
        {/* LEFT — project list */}
        <div>
          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' as const }}>
            <FilterChip label={`Open · ${openProjects.length}`} active={filter === 'open'} onClick={() => setFilter('open')} />
            <FilterChip label="Mine" active={filter === 'mine'} onClick={() => setFilter('mine')} />
            <FilterChip label="All projects" active={filter === 'all'} onClick={() => setFilter('all')} />
            <div style={{ flex: 1 }} />
            <FilterChip label="↕ Soonest deadline" dashed />
          </div>

          {/* Project cards */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {filteredProjects.length === 0 ? (
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 10, padding: '32px 20px', textAlign: 'center' as const }}>
                <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: 0 }}>
                  {filter === 'mine' ? "You haven't proposed on any projects yet." : 'No projects open for collaboration right now.'}
                </p>
              </div>
            ) : (
              filteredProjects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  selected={selectedId === p.id}
                  onClick={() => {
                    setSelectedId(p.id)
                    setSubmitted(false)
                    setSubmitError(null)
                    setWorkDescription('')
                    setExpectedReward('')
                    setConditions('')
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT — agreement form */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
            position: 'sticky' as const,
            top: 20,
          }}
        >
          {selectedProject ? (
            <>
              {/* Form header */}
              <div
                style={{
                  background: 'color-mix(in srgb, var(--m6) 8%, var(--surface))',
                  borderBottom: '1px solid var(--rule)',
                  padding: '16px 20px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase' as const,
                    color: 'var(--ink-4)',
                    marginBottom: 8,
                  }}
                >
                  Propose your support for
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--display)',
                    fontSize: 18,
                    color: 'var(--ink)',
                    lineHeight: 1.2,
                    marginBottom: 6,
                  }}
                >
                  {selectedProject.title}
                </h3>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                  Project lead · {selectedProject.lead_name ?? 'Unknown'} · Deadline {formatDeadline(selectedProject.deadline)}
                </div>
              </div>

              {/* Form body */}
              <div style={{ padding: 20, position: 'relative' as const }}>

                {/* Explorer lock overlay */}
                {(isExplorer || isGuest) && (
                  <div
                    style={{
                      position: 'absolute' as const,
                      inset: 0,
                      background: 'color-mix(in srgb, var(--bg) 80%, transparent)',
                      backdropFilter: 'blur(2px)',
                      display: 'flex',
                      flexDirection: 'column' as const,
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                      borderRadius: '0 0 10px 10px',
                      gap: 10,
                      padding: '24px',
                      textAlign: 'center' as const,
                    }}
                  >
                    <span style={{ fontSize: 28 }}>🔒</span>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', margin: 0 }}>
                      {isGuest ? 'Sign in to propose' : 'Complete M05 Join to unlock'}
                    </p>
                    <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5, margin: 0, maxWidth: 260 }}>
                      {isGuest
                        ? 'Create a free account to submit collaboration proposals.'
                        : 'Once your join application is accepted you can submit proposals.'}
                    </p>
                    {isGuest ? (
                      <a
                        href="/auth/signup"
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#fff',
                          background: 'var(--m6)',
                          padding: '8px 20px',
                          borderRadius: 8,
                          textDecoration: 'none',
                          marginTop: 4,
                        }}
                      >
                        Join free →
                      </a>
                    ) : (
                      <a
                        href="/join"
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#fff',
                          background: 'var(--m6)',
                          padding: '8px 20px',
                          borderRadius: 8,
                          textDecoration: 'none',
                          marginTop: 4,
                        }}
                      >
                        Go to M05 Join →
                      </a>
                    )}
                  </div>
                )}

                {/* Success state */}
                {submitted ? (
                  <div style={{ textAlign: 'center' as const, padding: '24px 0' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                      Proposal sent!
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                      The project lead will review your proposal within 48 hours.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false)
                        setSelectedId(
                          filteredProjects.find(p => p.id !== selectedId)?.id ?? filteredProjects[0]?.id ?? null
                        )
                      }}
                      style={{
                        marginTop: 16,
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--m6)',
                        background: 'transparent',
                        border: '1px solid var(--m6)',
                        padding: '7px 18px',
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                    >
                      View another project
                    </button>
                  </div>
                ) : hasBlockingProposal ? (
                  /* Existing proposal — prevent duplicate submission */
                  (() => {
                    const STATUS_INFO: Record<string, { label: string; color: string; desc: string }> = {
                      pending:   { label: 'Under review',  color: '#f59e0b', desc: 'Your proposal is waiting for the project lead to review it.' },
                      accepted:  { label: 'Accepted',      color: '#22c55e', desc: 'Your proposal was accepted. Keep an eye on Operations for next steps.' },
                      active:    { label: 'Active',        color: '#3b82f6', desc: 'This collaboration is active. Deliver what you promised!' },
                      completed: { label: 'Completed',     color: '#94a3b8', desc: 'This collaboration is marked complete. Well done.' },
                    }
                    const info = STATUS_INFO[existingAgreement!.status] ?? STATUS_INFO.pending
                    return (
                      <div style={{ padding: '8px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: info.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{info.label}</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55, marginBottom: 16 }}>{info.desc}</p>
                        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                          <div style={{ marginBottom: 6 }}>
                            <strong style={{ color: 'var(--ink-2)' }}>Will do:</strong> {existingAgreement!.work_description}
                          </div>
                          <div>
                            <strong style={{ color: 'var(--ink-2)' }}>Expects:</strong> {existingAgreement!.expected_reward}
                          </div>
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <>
                    <FormField
                      label="What I'll contribute"
                      hint="Be specific — time, skill, materials, money"
                    >
                      <FocusTextarea
                        value={workDescription}
                        onChange={setWorkDescription}
                        placeholder="e.g. I'll design the landing page wireframes over 2 weeks…"
                      />
                    </FormField>

                    <FormField label="What I expect in return">
                      <FocusTextarea
                        value={expectedReward}
                        onChange={setExpectedReward}
                        placeholder="e.g. 200 contribution points and public credit…"
                      />
                    </FormField>

                    <FormField label="Conditions / fine print">
                      <FocusInput
                        value={conditions}
                        onChange={setConditions}
                        placeholder="Anything that would change your mind…"
                      />
                    </FormField>

                    {/* Info box */}
                    <div
                      style={{
                        background: 'var(--bg-2)',
                        border: '1px solid var(--rule-soft, var(--rule))',
                        borderRadius: 8,
                        padding: '12px 14px',
                        marginBottom: 20,
                        fontSize: 12,
                        color: 'var(--ink-3)',
                        lineHeight: 1.55,
                      }}
                    >
                      <span style={{ marginRight: 6 }}>ℹ</span>
                      The project lead reviews proposals within 48 hours. If accepted, your agreement is logged and feeds Operations (deliverables) and Contributions (points) automatically.
                    </div>

                    {submitError && (
                      <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>
                        {submitError}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button
                        onClick={handleSaveDraft}
                        disabled={submitting}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          padding: '9px 18px',
                          borderRadius: 8,
                          border: '1px solid var(--rule)',
                          background: 'var(--surface)',
                          color: 'var(--ink-2)',
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          opacity: submitting ? 0.6 : 1,
                          transition: 'opacity 120ms',
                        }}
                      >
                        Save as draft
                      </button>
                      <button
                        onClick={handleSendProposal}
                        disabled={submitting || !workDescription.trim() || !expectedReward.trim()}
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          padding: '9px 20px',
                          borderRadius: 8,
                          border: 'none',
                          background: 'var(--m6)',
                          color: '#fff',
                          cursor:
                            submitting || !workDescription.trim() || !expectedReward.trim()
                              ? 'not-allowed'
                              : 'pointer',
                          opacity:
                            submitting || !workDescription.trim() || !expectedReward.trim()
                              ? 0.5
                              : 1,
                          transition: 'opacity 120ms',
                        }}
                      >
                        {submitting ? 'Sending…' : 'Send proposal →'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: '48px 24px', textAlign: 'center' as const }}>
              <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>
                Select a project to propose your support.
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      {showNewProject && userId && (
        <NewProjectModal userId={userId} onClose={() => setShowNewProject(false)} />
      )}
    </div>
  )
}
