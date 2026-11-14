'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { fmtDate } from '@/core/lib/format'
import { isJoiningOrAbove } from '@/core/lib/roles'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Project, Deliverable, ProjectUpdate, CollaborationAgreement, MyProposal, SubscriberProfile } from './types'
import { useCircles } from '@/core/components/CirclesProvider'
import type { CircleSlug } from '@/core/lib/circles'
import { isActiveProject, isOpenForProposals, PROJECT_STATUS_META, PROJECT_KANBAN_COLUMNS } from '@/core/lib/project-status'
import { CalendarPicker } from './CalendarPicker'
import { PermissionNoticeModal } from './PermissionNoticeModal'
import { LinkedEventsList } from '@/modules/m14-events/LinkedEventsList'
import type { CalendarEvent } from '@/modules/m14-events/types'
import { circleChangeBlock, projectEditBlock, type CircleDirectory, type PermissionNotice } from '@/core/lib/ops-permissions'

// ─── Sub-components ────────────────────────────────────────────────────────────

function SubscriberNames({ subs, max = 5 }: { subs: SubscriberProfile[]; max?: number }) {
  if (!subs.length) return null
  const show = subs.slice(0, max)
  const extra = subs.length - max
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
      {show.map(s => {
        const name = s.first_name ?? s.username ?? 'Member'
        const hue = (name.charCodeAt(0) * 37) % 360
        return (
          <span key={s.user_id} style={{
            fontSize: 11, fontWeight: 500,
            color: `hsl(${hue}, 45%, 40%)`,
            background: `hsl(${hue}, 55%, 55%, 0.12)`,
            border: `1px solid hsl(${hue}, 55%, 55%, 0.3)`,
            padding: '2px 8px', borderRadius: 999,
          }}>
            {name}
          </span>
        )
      })}
      {extra > 0 && (
        <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>+{extra} more</span>
      )}
    </div>
  )
}

function BellIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BLOCKING_STATUSES = ['pending', 'accepted', 'active', 'completed']
const PROPOSAL_STATUS_INFO: Record<string, { label: string; color: string; note: string }> = {
  pending:   { label: 'Pending review', color: '#f59e0b', note: 'Your proposal is waiting for admin review.' },
  accepted:  { label: 'Accepted',       color: '#22c55e', note: 'Your proposal was accepted. Start your contribution!' },
  active:    { label: 'Active',         color: '#3b82f6', note: 'Your collaboration is underway.' },
  completed: { label: 'Completed',      color: '#94a3b8', note: 'This collaboration has been marked complete.' },
  rejected:  { label: 'Not accepted',   color: '#ef4444', note: 'Your previous proposal was not accepted. You can submit a new one.' },
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProjectDetailClient({
  project, updates, pendingProposals: initialPendingProposals,
  deliverables: initialDeliverables, myProposal: initialMyProposal, userId, userRole, leadCircles, circleDirectory, isAdmin, isProjectCreator,
  projectSubscribers: initialProjectSubscribers, isProjectSubscribed: initialIsProjectSubscribed,
  deliverableSubscribers: initialDeliverableSubscribers,
  leadProfile, creatorProfile, projectEvents,
}: {
  project: Project
  updates: ProjectUpdate[]
  pendingProposals: CollaborationAgreement[]
  deliverables: Deliverable[]
  myProposal: MyProposal | null
  userId: string | null
  userRole: string
  leadCircles: string[]
  circleDirectory: CircleDirectory
  isAdmin: boolean
  isProjectCreator: boolean
  projectSubscribers: SubscriberProfile[]
  isProjectSubscribed: boolean
  deliverableSubscribers: Record<string, SubscriberProfile[]>
  leadProfile: { first_name: string | null; username: string | null } | null
  creatorProfile: { first_name: string | null; username: string | null } | null
  projectEvents: CalendarEvent[]
}) {
  const circles = useCircles()
  const supabase = createClient()
  const router = useRouter()
  const s = PROJECT_STATUS_META[project.status] ?? PROJECT_STATUS_META.backlog

  const canManage = isAdmin || isProjectCreator
  // Settings write to `projects`, whose RLS is stricter than canManage
  const settingsBlock = projectEditBlock(project, userId, userRole, leadCircles, circles)
  const [notice, setNotice] = useState<PermissionNotice | null>(null)
  const canPropose = !canManage && project.open_for_collaborators && isOpenForProposals(project.status)

  // ── Kanban state ─────────────────────────────────────────────────────────
  const [deliverables, setDeliverables] = useState<Deliverable[]>(initialDeliverables)
  const [pendingProposals, setPendingProposals] = useState<CollaborationAgreement[]>(initialPendingProposals)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDue, setNewTaskDue] = useState<string | null>(null)
  const [addingTask, setAddingTask] = useState(false)
  const [taskError, setTaskError] = useState<string | null>(null)

  // ── Drag-and-drop state ───────────────────────────────────────────────────
  const [dragging, setDragging] = useState<{ kind: 'deliverable' | 'proposal'; id: string } | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  // ── Updates state ─────────────────────────────────────────────────────────
  const [updateText, setUpdateText] = useState('')
  const [postingUpdate, setPostingUpdate] = useState(false)

  // ── Project settings ──────────────────────────────────────────────────────
  const [editStatus, setEditStatus] = useState(project.status)
  const [editOpenCollab, setEditOpenCollab] = useState(project.open_for_collaborators)
  const [editCircle, setEditCircle] = useState<CircleSlug | ''>(circles.has(project.circle) ? project.circle : '')
  const [editDeadline, setEditDeadline] = useState<string | null>(project.deadline ?? null)
  const [savingSettings, setSavingSettings] = useState(false)

  // ── Proposal form ─────────────────────────────────────────────────────────
  const [myProposal, setMyProposal] = useState<MyProposal | null>(initialMyProposal)
  const hasBlockingProposal = !!myProposal && BLOCKING_STATUSES.includes(myProposal.status)
  const [showProposalForm, setShowProposalForm] = useState(false)
  const [workDesc, setWorkDesc] = useState(myProposal?.work_description ?? '')
  const [reward, setReward] = useState(myProposal?.expected_reward ?? '')
  const [conditions, setConditions] = useState(myProposal?.conditions ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ── Project subscriptions ─────────────────────────────────────────────────
  const [subscribedToProject, setSubscribedToProject] = useState(initialIsProjectSubscribed)
  const [projectSubsList, setProjectSubsList] = useState<SubscriberProfile[]>(initialProjectSubscribers)
  const [togglingProjectSub, setTogglingProjectSub] = useState(false)

  // ── Deliverable subscriptions ─────────────────────────────────────────────
  const [deliverableSubsMap, setDeliverableSubsMap] = useState<Record<string, SubscriberProfile[]>>(initialDeliverableSubscribers)

  // ── Subtask edit modal ────────────────────────────────────────────────────
  const [editModal, setEditModal] = useState<Deliverable | null>(null)
  const [editModalTitle, setEditModalTitle] = useState('')
  const [editModalDue, setEditModalDue] = useState<string | null>(null)
  const [editModalSaving, setEditModalSaving] = useState(false)

  useEffect(() => {
    if (!editModal) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditModal(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editModal])

  // ── Derived ───────────────────────────────────────────────────────────────
  const myDeliverableSubIds = new Set(
    Object.entries(deliverableSubsMap)
      .filter(([, subs]) => subs.some(s => s.user_id === userId))
      .map(([id]) => id)
  )

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 14px', borderRadius: 'var(--radius)',
    border: '1px solid var(--rule)', background: 'var(--surface)',
    color: 'var(--ink)', fontSize: 14, outline: 'none', fontFamily: 'inherit',
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openEditModal(d: Deliverable) {
    setEditModal(d)
    setEditModalTitle(d.title)
    setEditModalDue(d.due_date)
  }

  async function toggleProjectSubscription() {
    if (!userId) { router.push('/auth/signup'); return }
    setTogglingProjectSub(true)
    if (subscribedToProject) {
      setSubscribedToProject(false)
      setProjectSubsList(prev => prev.filter(s => s.user_id !== userId))
      await supabase.from('project_subscriptions').delete().eq('project_id', project.id).eq('user_id', userId)
    } else {
      setSubscribedToProject(true)
      setProjectSubsList(prev => [...prev, { user_id: userId!, first_name: null, username: null }])
      await supabase.from('project_subscriptions').insert({ project_id: project.id, user_id: userId! })
    }
    setTogglingProjectSub(false)
  }

  async function toggleDeliverableSubscription(deliverableId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!userId) { router.push('/auth/signup'); return }
    const isSubbed = myDeliverableSubIds.has(deliverableId)
    if (isSubbed) {
      setDeliverableSubsMap(prev => ({
        ...prev,
        [deliverableId]: (prev[deliverableId] ?? []).filter(s => s.user_id !== userId),
      }))
      await supabase.from('deliverable_subscriptions').delete().eq('deliverable_id', deliverableId).eq('user_id', userId)
    } else {
      setDeliverableSubsMap(prev => ({
        ...prev,
        [deliverableId]: [...(prev[deliverableId] ?? []), { user_id: userId!, first_name: null, username: null }],
      }))
      await supabase.from('deliverable_subscriptions').insert({ deliverable_id: deliverableId, user_id: userId! })
    }
  }

  async function submitProposal() {
    if (!userId) { router.push('/auth/signup'); return }
    if (!workDesc.trim() || !reward.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    const { data, error } = await supabase
      .from('collaboration_agreements')
      .upsert({
        project_id: project.id,
        user_id: userId,
        work_description: workDesc.trim(),
        expected_reward: reward.trim(),
        conditions: conditions.trim() || null,
        status: 'pending',
      }, { onConflict: 'project_id,user_id' })
      .select('id, work_description, expected_reward, conditions, status')
      .single()
    if (error) {
      setSubmitError(error.message)
      setSubmitting(false)
      return
    }
    setMyProposal(data)
    setShowProposalForm(false)
    setSubmitting(false)
  }

  async function addSubtask() {
    if (!newTaskTitle.trim()) return
    setAddingTask(true)
    setTaskError(null)
    const { data, error } = await supabase.from('deliverables').insert({
      project_id: project.id,
      title: newTaskTitle.trim(),
      due_date: newTaskDue || null,
      status: 'backlog',
      progress: 0,
    }).select('id, project_id, title, status, due_date, assignee_id, progress').single()
    if (error) {
      setTaskError(error.message)
      setAddingTask(false)
      return
    }
    setDeliverables(prev => [...prev, data])
    setNewTaskTitle('')
    setNewTaskDue(null)
    setAddingTask(false)
  }

  async function updateTaskStatus(taskId: string, newStatus: string) {
    setDeliverables(prev => prev.map(d => d.id === taskId ? { ...d, status: newStatus } : d))
    await supabase.from('deliverables').update({ status: newStatus }).eq('id', taskId)
  }

  async function saveDeliverableEdit() {
    if (!editModal || !editModalTitle.trim()) return
    setEditModalSaving(true)
    const { error } = await supabase.from('deliverables').update({
      title: editModalTitle.trim(),
      due_date: editModalDue,
    }).eq('id', editModal.id)
    if (!error) {
      setDeliverables(prev => prev.map(d =>
        d.id === editModal.id ? { ...d, title: editModalTitle.trim(), due_date: editModalDue } : d
      ))
      setEditModal(null)
    }
    setEditModalSaving(false)
  }

  async function deleteDeliverableFromModal() {
    if (!editModal) return
    setDeliverables(prev => prev.filter(d => d.id !== editModal.id))
    await supabase.from('deliverables').delete().eq('id', editModal.id)
    setEditModal(null)
  }

  async function acceptProposal(agreementId: string, targetStatus: string = 'backlog') {
    const proposal = pendingProposals.find(p => p.id === agreementId)
    if (!proposal) return

    setPendingProposals(prev => prev.filter(p => p.id !== agreementId))
    const optimisticDeliverable: Deliverable = {
      id: `optimistic-${agreementId}`,
      project_id: project.id,
      title: (proposal.work_description ?? '').slice(0, 120) || 'Contribution',
      status: targetStatus,
      due_date: null,
      assignee_id: (proposal as CollaborationAgreement & { user_id?: string }).user_id ?? null,
      progress: 0,
      from_agreement_id: agreementId,
      user_profiles: proposal.user_profiles ?? null,
    }
    setDeliverables(prev => [...prev, optimisticDeliverable])

    const { error: agreementErr } = await supabase
      .from('collaboration_agreements')
      .update({ status: 'accepted' })
      .eq('id', agreementId)

    if (agreementErr) {
      setPendingProposals(prev => [proposal, ...prev])
      setDeliverables(prev => prev.filter(d => d.id !== optimisticDeliverable.id))
      return
    }

    const { data: newDeliverable, error: insertErr } = await supabase
      .from('deliverables')
      .insert({
        project_id: project.id,
        title: optimisticDeliverable.title,
        status: targetStatus,
        progress: 0,
        assignee_id: optimisticDeliverable.assignee_id,
        from_agreement_id: agreementId,
      })
      .select('id, project_id, title, status, due_date, assignee_id, progress, from_agreement_id')
      .single()

    if (insertErr || !newDeliverable) {
      setDeliverables(prev => prev.filter(d => d.id !== optimisticDeliverable.id))
      return
    }
    setDeliverables(prev => prev.map(d =>
      d.id === optimisticDeliverable.id
        ? { ...newDeliverable, user_profiles: proposal.user_profiles ?? null }
        : d
    ))
    router.refresh()
  }

  function handleDrop(columnKey: string) {
    if (!dragging) return
    if (dragging.kind === 'proposal') {
      if (columnKey === 'pending') return
      acceptProposal(dragging.id, columnKey === 'pending' ? 'backlog' : columnKey)
    } else {
      if (columnKey === 'pending') return
      updateTaskStatus(dragging.id, columnKey)
    }
    setDragging(null)
    setDropTarget(null)
  }

  async function postUpdate() {
    if (!updateText.trim()) return
    setPostingUpdate(true)
    await supabase.from('project_updates').insert({
      project_id: project.id,
      user_id: userId,
      content: updateText.trim(),
    })
    setUpdateText('')
    setPostingUpdate(false)
    router.refresh()
  }

  async function saveProjectSettings() {
    if (settingsBlock) { setNotice(settingsBlock); return }
    const circleBlock = circleChangeBlock(editCircle, userRole, leadCircles, circles)
    if (circleBlock) { setNotice(circleBlock); return }
    setSavingSettings(true)
    // RLS rejects silently (0 rows, no error), so ask for the row back to tell
    const { data, error } = await supabase.from('projects').update({
      status: editStatus,
      open_for_collaborators: editOpenCollab,
      circle: editCircle || null,
      deadline: editDeadline || null,
    }).eq('id', project.id).select('id')
    setSavingSettings(false)
    if (error || !data?.length) {
      setNotice({
        title: "Settings didn't save",
        message: error?.message ?? 'The database didn’t allow this change for your account.',
        circle: circles.has(project.circle) ? project.circle : null,
      })
      return
    }
    router.refresh()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="ops-detail-root" style={{ maxWidth: 920, margin: '0 auto', padding: '48px 20px 80px' }}>

      {/* Back */}
      <Link href="/ops" style={{ fontSize: 13, color: 'var(--ink-4)', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 28 }}>
        ← Operations
      </Link>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 className="ops-detail-h1" style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', lineHeight: 1.1, margin: 0 }}>
                {project.title}
              </h1>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: s.color, background: `${s.color}15`, padding: '3px 10px', borderRadius: 20 }}>
                {s.label}
              </span>
              {project.open_for_collaborators && isActiveProject(project.status) && (
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#3b82f6', background: '#3b82f615', padding: '3px 10px', borderRadius: 20 }}>
                  Open for collaborators
                </span>
              )}
              {circles.has(project.circle) && (() => {
                const m = circles.meta(project.circle)
                return (
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: m.color, background: `${m.color}15`, padding: '3px 10px', borderRadius: 20 }}>
                    {m.emoji} {m.label}
                  </span>
                )
              })()}
            </div>

            {/* Lead / creator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
              {leadProfile && (
                <div style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: 'var(--ink-4)' }}>Led by</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>
                    {leadProfile.first_name ?? leadProfile.username ?? 'Unknown'}
                  </span>
                </div>
              )}
              {creatorProfile && (
                <div style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: 'var(--ink-4)' }}>Proposed by</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>
                    {creatorProfile.first_name ?? creatorProfile.username ?? 'Unknown'}
                  </span>
                </div>
              )}
            </div>

            {/* Deadline display */}
            {project.deadline && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ink-4)', flexShrink: 0 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span style={{
                  fontSize: 12, color: (() => {
                    if (['done', 'review'].includes(project.status)) return 'var(--ink-4)'
                    const d = new Date(project.deadline); d.setHours(0,0,0,0)
                    const now = new Date(); now.setHours(0,0,0,0)
                    return d < now ? '#ef4444' : 'var(--ink-3)'
                  })(),
                  fontFamily: 'var(--mono)',
                }}>
                  Due {fmtDate(project.deadline)}
                </span>
              </div>
            )}

            {project.description && (
              <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.65, maxWidth: 640, margin: '0 0 12px' }}>
                {project.description}
              </p>
            )}
          </div>

          {/* Subscribe button */}
          <button
            onClick={toggleProjectSubscription}
            disabled={togglingProjectSub}
            title={subscribedToProject ? 'Unsubscribe from project' : 'Subscribe to project'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: subscribedToProject ? 'color-mix(in srgb, var(--m7) 12%, var(--surface))' : 'var(--bg-2)',
              color: subscribedToProject ? 'var(--m7)' : 'var(--ink-3)',
              border: `1px solid ${subscribedToProject ? 'color-mix(in srgb, var(--m7) 35%, var(--rule))' : 'var(--rule)'}`,
              cursor: togglingProjectSub ? 'not-allowed' : 'pointer',
              transition: 'all 140ms',
              flexShrink: 0,
            }}
          >
            <BellIcon filled={subscribedToProject} />
            {subscribedToProject ? 'Subscribed' : 'Subscribe'}
          </button>
        </div>

        {/* Project subscribers */}
        {projectSubsList.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)', marginBottom: 5 }}>
              {projectSubsList.length} subscriber{projectSubsList.length !== 1 ? 's' : ''}
            </div>
            <SubscriberNames subs={projectSubsList} />
          </div>
        )}

        {canPropose && !hasBlockingProposal && (
          <button
            onClick={() => setShowProposalForm(v => !v)}
            style={{ display: 'block', width: '100%', maxWidth: 260, marginTop: 4, background: showProposalForm ? 'var(--bg-2)' : '#3b82f6', color: showProposalForm ? 'var(--ink-3)' : '#fff', fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 'var(--radius)', border: showProposalForm ? '1px solid var(--rule)' : 'none', cursor: 'pointer', textAlign: 'center' }}
          >
            {showProposalForm ? 'Cancel' : 'Propose collaboration →'}
          </button>
        )}
        {canPropose && hasBlockingProposal && myProposal && (() => {
          const info = PROPOSAL_STATUS_INFO[myProposal.status]
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4, background: `${info.color}12`, border: `1px solid ${info.color}40`, borderRadius: 'var(--radius)', padding: '8px 14px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: info.color }}>{info.label}</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{info.note}</span>
            </div>
          )
        })()}
      </div>

      {/* ── Inline proposal form ─────────────────────────────────────────────── */}
      {showProposalForm && canPropose && (
        <div style={{
          background: 'color-mix(in srgb, #3b82f6 5%, var(--surface))',
          border: '1px solid color-mix(in srgb, #3b82f6 30%, var(--rule))',
          borderRadius: 12, padding: '22px 24px', marginBottom: 32,
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 18 }}>
            Propose collaboration
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                What will you contribute? <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={workDesc}
                onChange={e => setWorkDesc(e.target.value)}
                placeholder="Describe what you'll do, deliver, or create for this project…"
                rows={3}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                What do you expect in return? <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={reward}
                onChange={e => setReward(e.target.value)}
                placeholder="Mentorship, credits, revenue share, recognition…"
                rows={2}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                Any conditions or notes? <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                value={conditions}
                onChange={e => setConditions(e.target.value)}
                placeholder="Timing constraints, availability, dependencies…"
                rows={2}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
            {submitError && (
              <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{submitError}</p>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={submitProposal}
                disabled={submitting || !workDesc.trim() || !reward.trim()}
                style={{ background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, padding: '9px 22px', borderRadius: 'var(--radius)', border: 'none', cursor: submitting || !workDesc.trim() || !reward.trim() ? 'not-allowed' : 'pointer', opacity: submitting || !workDesc.trim() || !reward.trim() ? 0.6 : 1 }}
              >
                {submitting ? 'Submitting…' : 'Submit proposal'}
              </button>
              <button
                onClick={() => setShowProposalForm(false)}
                style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--ink-4)', cursor: 'pointer', padding: '9px 4px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ops-detail-grid" style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 340px' : '1fr', gap: 32 }}>

        {/* ── Left column ────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* ── Subtask kanban ───────────────────────────────────────────────── */}
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
              <span>
                Subtasks · {deliverables.length}
                {canManage && pendingProposals.length > 0 && ` · ${pendingProposals.length} idea${pendingProposals.length === 1 ? '' : 's'}`}
              </span>
            </div>

            {canManage && (
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                <div className="ops-subtask-form" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSubtask()}
                    placeholder="New subtask title…"
                    style={{ ...inputStyle, flex: '1 1 200px', padding: '8px 12px', fontSize: 13 }}
                  />
                  <div style={{ flexShrink: 0 }}>
                    <CalendarPicker
                      value={newTaskDue}
                      onChange={setNewTaskDue}
                      placeholder="Due date"
                      align="right"
                    />
                  </div>
                  <button
                    onClick={addSubtask}
                    disabled={addingTask || !newTaskTitle.trim()}
                    style={{
                      background: 'var(--m7)', color: '#fff', fontSize: 13, fontWeight: 600,
                      padding: '8px 18px', borderRadius: 8, border: 'none', whiteSpace: 'nowrap',
                      cursor: addingTask || !newTaskTitle.trim() ? 'not-allowed' : 'pointer',
                      opacity: addingTask || !newTaskTitle.trim() ? 0.55 : 1,
                      flexShrink: 0,
                    }}
                  >
                    {addingTask ? 'Adding…' : '+ Add'}
                  </button>
                </div>
                {taskError && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8, marginBottom: 0 }}>{taskError}</p>}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
              {PROJECT_KANBAN_COLUMNS.map(col => {
                const isTarget = dropTarget === col.key
                const cards = col.key === 'pending'
                  ? (canManage ? pendingProposals : [])
                  : deliverables.filter(d => d.status === col.key)
                const droppable = canManage
                return (
                  <div
                    key={col.key}
                    onDragOver={(e) => {
                      if (!droppable || !dragging) return
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      if (dropTarget !== col.key) setDropTarget(col.key)
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget === e.target) setDropTarget(null)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      handleDrop(col.key)
                    }}
                    style={{
                      background: isTarget ? `${col.color}10` : 'var(--bg-2)',
                      borderRadius: 10, padding: 8,
                      border: isTarget ? `1px dashed ${col.color}` : '1px solid transparent',
                      transition: 'background 120ms, border-color 120ms',
                      minHeight: 100,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>{col.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>{cards.length}</span>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: col.color }} />
                      </div>
                    </div>

                    {cards.length === 0 ? (
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', padding: '8px 4px', textAlign: 'center' }}>
                        {col.key === 'pending' && !canManage ? '—' : 'Empty'}
                      </div>
                    ) : col.key === 'pending' ? (
                      cards.map(p => {
                        const proposal = p as CollaborationAgreement
                        const name = proposal.user_profiles?.first_name ?? proposal.user_profiles?.username ?? 'Community member'
                        return (
                          <div
                            key={proposal.id}
                            draggable={canManage}
                            onDragStart={(e) => {
                              if (!canManage) return
                              e.dataTransfer.effectAllowed = 'move'
                              e.dataTransfer.setData('text/plain', proposal.id)
                              setDragging({ kind: 'proposal', id: proposal.id })
                            }}
                            onDragEnd={() => { setDragging(null); setDropTarget(null) }}
                            style={{
                              background: 'var(--surface)', border: '1px solid var(--rule)',
                              borderLeft: '3px solid #3b82f6',
                              borderRadius: 8, padding: '10px 12px', marginBottom: 6,
                              cursor: canManage ? 'grab' : 'default',
                              opacity: dragging?.id === proposal.id ? 0.5 : 1,
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{name}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.45, marginBottom: 4 }}>
                              <span style={{ color: 'var(--ink-3)' }}>Offers: </span>{proposal.work_description}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.45, marginBottom: 8 }}>
                              <span style={{ color: 'var(--ink-3)' }}>Wants: </span>{proposal.expected_reward}
                            </div>
                            {canManage && (
                              <button
                                onClick={() => acceptProposal(proposal.id, 'backlog')}
                                style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer' }}
                              >
                                Accept →
                              </button>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      cards.map(c => {
                        const d = c as Deliverable
                        const assignee = d.user_profiles?.first_name ?? d.user_profiles?.username ?? null
                        const isSubbed = myDeliverableSubIds.has(d.id)
                        const subsList = deliverableSubsMap[d.id] ?? []
                        const isOverdue = d.due_date && !['done', 'review'].includes(d.status) && new Date(d.due_date) < new Date()
                        return (
                          <div
                            key={d.id}
                            draggable={canManage}
                            onDragStart={(e) => {
                              if (!canManage) return
                              e.dataTransfer.effectAllowed = 'move'
                              e.dataTransfer.setData('text/plain', d.id)
                              setDragging({ kind: 'deliverable', id: d.id })
                            }}
                            onDragEnd={() => { setDragging(null); setDropTarget(null) }}
                            onClick={() => {
                              if (dragging) return
                              openEditModal(d)
                            }}
                            style={{
                              background: 'var(--surface)', border: '1px solid var(--rule)',
                              borderRadius: 8, padding: '8px 10px', marginBottom: 6,
                              cursor: canManage ? 'grab' : 'pointer',
                              opacity: dragging?.id === d.id ? 0.5 : 1,
                              transition: 'box-shadow 120ms',
                            }}
                            onMouseEnter={e => { if (!canManage || !dragging) (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                          >
                            <div style={{
                              fontSize: 12, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.35, marginBottom: 6,
                              textDecoration: d.status === 'done' ? 'line-through' : 'none',
                              opacity: d.status === 'done' ? 0.6 : 1,
                            }}>
                              {d.title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, flexWrap: 'wrap', fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
                                {assignee && <span>{assignee}</span>}
                                {d.due_date && (
                                  <span style={{ color: isOverdue ? '#ef4444' : 'var(--ink-4)', fontWeight: isOverdue ? 700 : 400 }}>
                                    {assignee ? '· ' : ''}{fmtDate(d.due_date)}{isOverdue ? ' ⚠' : ''}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={(e) => toggleDeliverableSubscription(d.id, e)}
                                title={isSubbed ? 'Unsubscribe' : 'Subscribe'}
                                style={{
                                  background: 'none', border: 'none', padding: '2px 3px',
                                  cursor: 'pointer', borderRadius: 4,
                                  color: isSubbed ? 'var(--m7)' : 'var(--ink-4)',
                                  display: 'flex', alignItems: 'center',
                                  transition: 'color 120ms',
                                  flexShrink: 0,
                                }}
                              >
                                <BellIcon filled={isSubbed} />
                              </button>
                            </div>
                            {subsList.length > 0 && (
                              <div style={{ marginTop: 5 }}>
                                <SubscriberNames subs={subsList} max={4} />
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Events (M14) ─────────────────────────────────────────────────── */}
          <LinkedEventsList
            events={projectEvents}
            addHref={isJoiningOrAbove(userRole) ? `/events?new=1&project=${project.id}` : null}
            hideWhenEmpty
          />

          {/* ── Updates feed ─────────────────────────────────────────────────── */}
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 14 }}>
              Updates
            </div>

            {canManage && (
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: 20 }}>
                <textarea
                  value={updateText}
                  onChange={e => setUpdateText(e.target.value)}
                  placeholder="Post an update for this project…"
                  rows={3}
                  style={{ ...inputStyle, background: 'var(--surface)', resize: 'vertical', lineHeight: 1.6, marginBottom: 10 }}
                />
                <button
                  onClick={postUpdate}
                  disabled={postingUpdate || !updateText.trim()}
                  style={{ background: '#4338ca', color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 'var(--radius)', border: 'none', cursor: postingUpdate || !updateText.trim() ? 'not-allowed' : 'pointer', opacity: postingUpdate || !updateText.trim() ? 0.65 : 1 }}
                >
                  {postingUpdate ? 'Posting…' : 'Post update'}
                </button>
              </div>
            )}

            {updates.length === 0 ? (
              <div style={{ color: 'var(--ink-4)', fontSize: 13, padding: '24px 0' }}>No updates yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {updates.map((u, i) => {
                  const author = u.user_profiles?.first_name ?? u.user_profiles?.username ?? 'Team'
                  const date = new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  return (
                    <div key={u.id} className="ops-update-row" style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0 16px', paddingBottom: 24 }}>
                      <div style={{ paddingTop: 3 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>{date}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)', marginTop: 2 }}>{author}</div>
                      </div>
                      <div style={{ borderLeft: '1px solid var(--rule)', paddingLeft: 16, position: 'relative' }}>
                        <div style={{ position: 'absolute', left: -5, top: 6, width: 8, height: 8, borderRadius: '50%', background: i === 0 ? '#4338ca' : 'var(--rule)', border: '1.5px solid var(--surface)' }} />
                        <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>{u.content}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column — admin panel ────────────────────────────────────── */}
        {isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '16px' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 12 }}>Project settings</div>

              {settingsBlock && (
                <div style={{ fontSize: 12, lineHeight: 1.5, color: '#b45309', background: 'color-mix(in srgb, #f59e0b 10%, var(--surface))', border: '1px solid #f59e0b', borderRadius: 8, padding: '8px 10px', marginBottom: 12 }}>
                  🔒 You can view these settings but not change them.{' '}
                  <button type="button" onClick={() => setNotice(settingsBlock)} style={{ background: 'none', border: 'none', padding: 0, color: '#b45309', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontSize: 12 }}>
                    Why?
                  </button>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }}>
                  <option value="pending">Idea</option>
                  <option value="backlog">Backlog</option>
                  <option value="in_progress">In progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>Deadline</label>
                <CalendarPicker value={editDeadline} onChange={setEditDeadline} placeholder="No deadline" />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>Circle</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {circles.slugs.map(p => {
                    const meta = circles.meta(p)
                    const active = editCircle === p
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          const next = active ? '' : p
                          const block = settingsBlock ?? circleChangeBlock(next, userRole, leadCircles, circles)
                          if (block) setNotice(block)
                          else setEditCircle(next)
                        }}
                        style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 20,
                          background: active ? meta.color : 'var(--surface)',
                          color: active ? '#fff' : 'var(--ink-3)',
                          border: `1px solid ${active ? meta.color : 'var(--rule)'}`,
                          cursor: 'pointer',
                        }}
                      >
                        {meta.emoji} {meta.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 14 }}>
                <input type="checkbox" checked={editOpenCollab} onChange={e => setEditOpenCollab(e.target.checked)} style={{ accentColor: '#4338ca' }} />
                <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Open for collaborators</span>
              </label>

              <button
                onClick={saveProjectSettings}
                disabled={savingSettings || !!settingsBlock}
                style={{ background: '#4338ca', color: '#fff', fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 'var(--radius)', border: 'none', cursor: savingSettings || settingsBlock ? 'not-allowed' : 'pointer', opacity: savingSettings || settingsBlock ? 0.65 : 1 }}
              >
                {savingSettings ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          </div>
        )}

      </div>

      <PermissionNoticeModal notice={notice} directory={circleDirectory} onClose={() => setNotice(null)} />

      {/* ── Subtask edit modal ─────────────────────────────────────────────────── */}
      {editModal && (
        <div
          onClick={() => setEditModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', borderRadius: 14,
              border: '1px solid var(--rule)',
              width: '100%', maxWidth: 480,
              boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
              animation: 'calFadeIn 160ms ease',
            }}
          >
            {/* Modal header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--rule)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
                Subtask
              </div>
              <button
                onClick={() => setEditModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0, display: 'flex' }}
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px' }}>
              {/* Title */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                  Title
                </label>
                {canManage ? (
                  <input
                    type="text"
                    value={editModalTitle}
                    onChange={e => setEditModalTitle(e.target.value)}
                    style={{ ...inputStyle, fontSize: 15, fontWeight: 500 }}
                  />
                ) : (
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.4 }}>
                    {editModal.title}
                  </div>
                )}
              </div>

              {/* Due date */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                  Due date
                </label>
                {canManage ? (
                  <CalendarPicker value={editModalDue} onChange={setEditModalDue} placeholder="No due date" />
                ) : (
                  <div style={{ fontSize: 13, color: editModal.due_date ? 'var(--ink-2)' : 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
                    {editModal.due_date ? fmtDate(editModal.due_date) : 'No due date'}
                  </div>
                )}
              </div>

              {/* Subscribe toggle */}
              <div style={{ marginBottom: (() => {
                const subs = deliverableSubsMap[editModal.id] ?? []
                return subs.length > 0 ? 12 : 0
              })() }}>
                <button
                  onClick={() => toggleDeliverableSubscription(editModal.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: myDeliverableSubIds.has(editModal.id) ? 'color-mix(in srgb, var(--m7) 12%, var(--surface))' : 'var(--bg-2)',
                    color: myDeliverableSubIds.has(editModal.id) ? 'var(--m7)' : 'var(--ink-3)',
                    border: `1px solid ${myDeliverableSubIds.has(editModal.id) ? 'color-mix(in srgb, var(--m7) 35%, var(--rule))' : 'var(--rule)'}`,
                    cursor: 'pointer', transition: 'all 140ms',
                  }}
                >
                  <BellIcon filled={myDeliverableSubIds.has(editModal.id)} />
                  {myDeliverableSubIds.has(editModal.id) ? 'Subscribed' : 'Subscribe to updates'}
                </button>
              </div>

              {/* Subscriber avatars */}
              {(() => {
                const subs = deliverableSubsMap[editModal.id] ?? []
                if (!subs.length) return null
                return (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)', marginBottom: 6 }}>
                      {subs.length} subscriber{subs.length !== 1 ? 's' : ''}
                    </div>
                    <SubscriberNames subs={subs} />
                  </div>
                )
              })()}
            </div>

            {/* Modal footer */}
            {canManage && (
              <div style={{
                padding: '14px 20px', borderTop: '1px solid var(--rule)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <button
                  onClick={deleteDeliverableFromModal}
                  style={{ background: 'none', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer' }}
                >
                  Delete subtask
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setEditModal(null)}
                    style={{ background: 'none', border: '1px solid var(--rule)', color: 'var(--ink-3)', fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveDeliverableEdit}
                    disabled={editModalSaving || !editModalTitle.trim()}
                    style={{
                      background: 'var(--m7)', color: '#fff', fontSize: 12, fontWeight: 600,
                      padding: '7px 18px', borderRadius: 8, border: 'none',
                      cursor: editModalSaving || !editModalTitle.trim() ? 'not-allowed' : 'pointer',
                      opacity: editModalSaving || !editModalTitle.trim() ? 0.65 : 1,
                    }}
                  >
                    {editModalSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
