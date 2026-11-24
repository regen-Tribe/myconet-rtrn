'use client'
import { CircleSeal } from '@/core/components/v4/CircleSeal'
import { DraftSwipe } from './DraftSwipe'
import { useEffect, useState } from 'react'
import { setAgentContext } from '@/core/lib/agent-context'
import { createClient } from '@/core/lib/supabase/client'
import { fmtTaskWhen, isTaskOverdue } from '@/core/lib/tasks'
import { isJoiningOrAbove } from '@/core/lib/roles'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DESIGN, DESIGN_REVIEW, COMMUNITY_NAME } from '@/core/lib/instance'
import { Icon as V4Icon, StatusPill as V4Pill, Tag as V4Tag, Result as V4Result, type Tone, statusFromDb, InlineIcon } from '@/core/components/v4'
import './ops-v4.css'

const V4 = (DESIGN as string) === 'v4'
// The design review (decisions #55–#58): same information and flows, only the look and the phone layout
const RV = DESIGN_REVIEW
/** With the review on, a class (styled in ops-v4.css); without it, the old inline style */
const rv = (className: string, legacy?: React.CSSProperties) => (RV ? { className } : { style: legacy })
import type { Project, Deliverable, ProjectUpdate, CollaborationAgreement, MyProposal, SubscriberProfile } from './types'
import { useCircles } from '@/core/components/CirclesProvider'
import type { CircleSlug } from '@/core/lib/circles'
import { isActiveProject, isOpenForProposals, PROJECT_STATUS_META, PROJECT_KANBAN_COLUMNS } from '@/core/lib/project-status'
import { CalendarPicker } from './CalendarPicker'
import { NameTag } from './NameTag'
import { TaskModal, BellIcon, SubscriberNames, type TaskProjectOption, type TaskTeamOption } from './TaskModal'
import { TeamPicker } from './TeamPicker'
import { PriorityBadge } from './Priority'
import { PermissionNoticeModal } from './PermissionNoticeModal'
import { LinkedEventsList } from '@/modules/m14-events/LinkedEventsList'
import type { CalendarEvent } from '@/modules/m14-events/types'
import { circleChangeBlock, projectEditBlock, type CircleDirectory, type PermissionNotice } from '@/core/lib/ops-permissions'

// ─── Sub-components ────────────────────────────────────────────────────────────

// ─── Constants ────────────────────────────────────────────────────────────────

const BLOCKING_STATUSES = ['pending', 'accepted', 'active', 'completed']
const PROPOSAL_STATUS_INFO: Record<string, { label: string; color: string; note: string }> = {
  pending:   { label: 'Pending review', color: '#f59e0b', note: 'Your offer to help is waiting for the task lead.' },
  accepted:  { label: 'Accepted',       color: '#22c55e', note: 'Your offer to help was accepted. It’s on the board as a subtask.' },
  active:    { label: 'Active',         color: '#3b82f6', note: 'Your collaboration is underway.' },
  completed: { label: 'Completed',      color: '#94a3b8', note: 'This collaboration has been marked complete.' },
  rejected:  { label: 'Not accepted',   color: '#ef4444', note: 'Your last offer to help wasn’t accepted. You can send a new one.' },
}
// The review shows an offer's state as a Result badge (square, an icon), never a status colour; words as in LEXICON.md
const PROPOSAL_RESULT: Record<string, { label: string; tone: Tone }> = {
  pending:   { label: 'Waiting',   tone: 'attention' },
  accepted:  { label: 'Accepted',             tone: 'good' },
  active:    { label: 'Under way',            tone: 'neutral' },
  completed: { label: 'Completed',            tone: 'neutral' },
  rejected:  { label: 'Declined',             tone: 'bad' },
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProjectDetailClient({
  project, updates, pendingProposals: initialPendingProposals,
  deliverables: initialDeliverables, myProposal: initialMyProposal, userId, userRole, leadCircles, circleDirectory, isAdmin, isProjectCreator,
  projectSubscribers: initialProjectSubscribers, isProjectSubscribed: initialIsProjectSubscribed,
  deliverableSubscribers: initialDeliverableSubscribers,
  leadProfile, creatorProfile, projectEvents, initialTaskId, people = [], projectOptions = [], teams = [],
}: {
  project: Project
  /** Who a task can be given to (the task pop-up's Assigned to) */
  people?: { id: string; name: string; username: string | null }[]
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
  /** Opens this task's pop-up on arrival (links from the calendar: ?task=<id>) */
  initialTaskId?: string | null
  /** For the task pop-up: projects a task can be filed into, and the circles' teams */
  projectOptions?: TaskProjectOption[]
  teams?: TaskTeamOption[]
}) {
  const circles = useCircles()
  const supabase = createClient()
  const router = useRouter()
  const s = PROJECT_STATUS_META[project.status] ?? PROJECT_STATUS_META.backlog

  const canManage = isAdmin || isProjectCreator
  // Settings write to `projects`, whose RLS is stricter than canManage
  const settingsBlock = projectEditBlock(project, userId, userRole, leadCircles, circles)
  const [notice, setNotice] = useState<PermissionNotice | null>(null)
  // Offering help (an agreement) opens at joining member; the database refuses it before (decision #73)
  const openToHelp = !canManage && project.open_for_collaborators && isOpenForProposals(project.status)
  // (a visitor's button still leads to Create account outside the design review)
  const canPropose = openToHelp && (userId ? isJoiningOrAbove(userRole) : !DESIGN_REVIEW)

  // ── Kanban state ─────────────────────────────────────────────────────────
  const [deliverables, setDeliverables] = useState<Deliverable[]>(initialDeliverables)
  const [pendingProposals, setPendingProposals] = useState<CollaborationAgreement[]>(initialPendingProposals)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDue, setNewTaskDue] = useState<string | null>(null)
  const [newTaskTime, setNewTaskTime] = useState('')
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
  const [editTeam, setEditTeam] = useState(project.team_id ?? '')
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

  // ── The task pop-up (TaskModal) ──────────────────────────────────────────
  const [editModal, setEditModal] = useState<Deliverable | null>(() => (initialTaskId ? initialDeliverables.find(x => x.id === initialTaskId) ?? null : null))
  // The agent knows which project this page is ("move these tasks here")
  useEffect(() => {
    setAgentContext('project', { project_id: project.id })
    return () => setAgentContext('project', null)
  }, [project.id])

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
      due_time: newTaskDue && newTaskTime ? newTaskTime : null,
      status: 'backlog',
      progress: 0,
    }).select('id, project_id, title, status, due_date, due_time, circle, source, needs_review, assignee_id, progress').single()
    if (error) {
      setTaskError(error.message)
      setAddingTask(false)
      return
    }
    setDeliverables(prev => [...prev, data])
    setNewTaskTitle('')
    setNewTaskDue(null)
    setNewTaskTime('')
    setAddingTask(false)
  }

  async function updateTaskStatus(taskId: string, newStatus: string) {
    setDeliverables(prev => prev.map(d => d.id === taskId ? { ...d, status: newStatus } : d))
    await supabase.from('deliverables').update({ status: newStatus }).eq('id', taskId)
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
      .select('id, project_id, title, status, due_date, due_time, circle, source, needs_review, assignee_id, progress, from_agreement_id')
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
      team_id: editTeam || null,
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
    <div className={V4 ? 'ops-detail-root v4-page pj4' : 'ops-detail-root'} style={V4 ? { maxWidth: 1040 } : { maxWidth: 920, margin: '0 auto', padding: '48px 20px 80px' }}>

      {/* Back */}
      {V4 && RV ? (
        // Review: the top bar already has ‹ Operations (#41), and the circle shows as its seal, not a coloured
        // banner (#7). The banner's circle, lead and calendar stay, in one quiet row with Watch (#55).
        <div className="pj5-top">
          {circles.has(project.circle) && (
            <V4Tag seal={<CircleSeal slug={project.circle} size={16} />}>{circles.meta(project.circle).label} circle{teams.find(t => t.id === project.team_id) ? ` · ${teams.find(t => t.id === project.team_id)!.name}` : ''}</V4Tag>
          )}
          <span className="pj5-round">
            <button type="button" onClick={toggleProjectSubscription} disabled={togglingProjectSub} aria-pressed={subscribedToProject}
              title={subscribedToProject ? 'Stop watching this task' : 'Watch this task'} className={`pj5-watch${subscribedToProject ? ' on' : ''}`}>
              <V4Icon name="bell" size={16} />{subscribedToProject ? 'Watching' : 'Watch'}
            </button>
            {leadProfile?.username && <Link href={`/u/${leadProfile.username}`} aria-label="The task lead" title="The task lead" className="pj5-rbtn"><V4Icon name="user" /></Link>}
            <Link href="/calendar" aria-label="Calendar" title="Calendar" className="pj5-rbtn"><V4Icon name="calendar" /></Link>
          </span>
        </div>
      ) : V4 ? (
        <>
          <Link href="/operations" className="v4-back"><V4Icon name="left" size={14} />Operations</Link>
          {/* The prototype's project hero: the circle's colour, its name, the lead and the calendar at hand */}
          <div className="pj4-hero" style={{ ['--c' as string]: circles.has(project.circle) ? circles.meta(project.circle).color : '#8a8f9c' }}>
            {circles.has(project.circle) && (
              <span className="pj4-pill"><CircleSeal slug={project.circle} size={16} />{circles.meta(project.circle).label} circle{teams.find(t => t.id === project.team_id) ? ` · ${teams.find(t => t.id === project.team_id)!.name}` : ''}</span>
            )}
            <span className="pj4-round">
              {leadProfile?.username && <Link href={`/u/${leadProfile.username}`} aria-label="The task lead" className="pj4-rbtn"><V4Icon name="user" /></Link>}
              <Link href="/calendar" aria-label="Calendar" className="pj4-rbtn"><V4Icon name="calendar" /></Link>
            </span>
          </div>
        </>
      ) : (
      <Link href="/operations" style={{ fontSize: 13, color: 'var(--ink-4)', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 28 }}>
        ← Operations
      </Link>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            {V4 && (
              <>
                <h1 className="v4-ph__title pj4-title">{project.title}</h1>
                <div className="v4-tags pj4-tags">
                  <V4Pill status={statusFromDb(project.status)} label={s.label} />
                  {project.open_for_collaborators && isActiveProject(project.status) && <V4Tag icon="hand">Open for helpers</V4Tag>}
                  {leadProfile && <V4Tag>Lead · {leadProfile.first_name ?? leadProfile.username ?? 'Unknown'}</V4Tag>}
                  {creatorProfile && creatorProfile.username !== leadProfile?.username && <V4Tag>Proposed by {creatorProfile.first_name ?? creatorProfile.username ?? 'Unknown'}</V4Tag>}
                  <V4Tag>{deliverables.length} {deliverables.length === 1 ? 'subtask' : 'subtasks'}</V4Tag>
                  {project.deadline && (!['done', 'review'].includes(project.status) && isTaskOverdue(project.deadline, null, project.status)
                    ? (RV
                      // Late needs attention (yellow, as "31 late" on the board); red only means Declined (#34)
                      ? <V4Result tone="attention">Late · was due {fmtTaskWhen(project.deadline)}</V4Result>
                      : <V4Pill status="no" label={`Overdue · was due ${fmtTaskWhen(project.deadline)}`} />)
                    : <V4Tag icon="calendar">Due {fmtTaskWhen(project.deadline)}</V4Tag>)}
                </div>
              </>
            )}
            {!V4 && (<>
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
                    {m.emoji} {m.label}{teams.find(t => t.id === project.team_id) ? ` · ${teams.find(t => t.id === project.team_id)!.name}` : ''}
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
                    return isTaskOverdue(project.deadline, null, project.status) ? '#ef4444' : 'var(--ink-3)'
                  })(),
                  fontFamily: 'var(--mono)',
                }}>
                  Due {fmtTaskWhen(project.deadline)}
                </span>
              </div>
            )}

            </>)}
            {project.description && (
              <p className={V4 ? 'pj4-about' : undefined} style={V4 ? undefined : { color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.65, maxWidth: 640, margin: '0 0 12px' }}>
                {project.description}
              </p>
            )}
          </div>

          {/* Subscribe button (with the review on, Watch sits in the top row) */}
          {!(V4 && RV) && <button
            onClick={toggleProjectSubscription}
            disabled={togglingProjectSub}
            title={subscribedToProject ? 'Stop watching this task' : 'Watch this task'}
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
          </button>}
        </div>

        {/* Project subscribers */}
        {projectSubsList.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div {...rv('pj5-label', { fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)', marginBottom: 5 })}>
              {RV ? `${projectSubsList.length} watching` : `${projectSubsList.length} subscriber${projectSubsList.length !== 1 ? 's' : ''}`}
            </div>
            <SubscriberNames subs={projectSubsList} />
          </div>
        )}

        {openToHelp && !canPropose && (DESIGN_REVIEW || !!userId) && (
          <p className="v4-hint">
            {userId
              ? <>Offer help once you’ve joined {COMMUNITY_NAME}. <Link href="/join">Start joining</Link></>
              : <>Offer help once you’ve joined {COMMUNITY_NAME}. <Link href="/auth/signup">Create account</Link></>}
          </p>
        )}
        {canPropose && !hasBlockingProposal && V4 && (
          <button type="button" className={`v4-btn ${showProposalForm ? 'v4-btn--secondary' : 'v4-btn--next'} pj4-offer`} onClick={() => setShowProposalForm(v => !v)}>
            <span>{showProposalForm ? 'Cancel' : 'Offer to help · start an agreement'}</span>
            {!showProposalForm && <span className="v4-btn__go"><V4Icon name="right" size={14} /></span>}
          </button>
        )}
        {canPropose && !hasBlockingProposal && !V4 && (
          <button
            onClick={() => setShowProposalForm(v => !v)}
            style={{ display: 'block', width: '100%', maxWidth: 260, marginTop: 4, background: showProposalForm ? 'var(--bg-2)' : '#3b82f6', color: showProposalForm ? 'var(--ink-3)' : '#fff', fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 'var(--radius)', border: showProposalForm ? '1px solid var(--rule)' : 'none', cursor: 'pointer', textAlign: 'center' }}
          >
            {showProposalForm ? 'Cancel' : 'Offer to help →'}
          </button>
        )}
        {canPropose && hasBlockingProposal && myProposal && (() => {
          const info = PROPOSAL_STATUS_INFO[myProposal.status]
          const result = PROPOSAL_RESULT[myProposal.status]
          if (RV && result) return (
            <div className="pj5-offerstate">
              <V4Result tone={result.tone}>{result.label}</V4Result>
              <span>{info.note}</span>
            </div>
          )
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
        <div {...rv('pj5-panel pj5-offerform', {
          background: 'color-mix(in srgb, #3b82f6 5%, var(--surface))',
          border: '1px solid color-mix(in srgb, #3b82f6 30%, var(--rule))',
          borderRadius: 12, padding: '22px 24px', marginBottom: 32,
        })}>
          <div {...rv('pj5-label', { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 18 })}>
            Offer to help
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                What will you contribute? <span {...rv('pj5-req', { color: '#ef4444' })}>*</span>
              </label>
              <textarea
                value={workDesc}
                onChange={e => setWorkDesc(e.target.value)}
                placeholder="Describe what you'll do, deliver, or create for this task…"
                rows={3}
                {...rv('v4-input pj5-field', { width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit', outline: 'none' })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>
                What do you expect in return? <span {...rv('pj5-req', { color: '#ef4444' })}>*</span>
              </label>
              <textarea
                value={reward}
                onChange={e => setReward(e.target.value)}
                placeholder="Mentorship, credits, revenue share, recognition…"
                rows={2}
                {...rv('v4-input pj5-field', { width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit', outline: 'none' })}
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
                {...rv('v4-input pj5-field', { width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit', outline: 'none' })}
              />
            </div>
            {submitError && (
              <p {...rv('pj5-error', { fontSize: 12, color: '#ef4444', margin: 0 })}>{submitError}</p>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={submitProposal}
                disabled={submitting || !workDesc.trim() || !reward.trim()}
                {...rv('v4-btn v4-btn--primary', { background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, padding: '9px 22px', borderRadius: 'var(--radius)', border: 'none', cursor: submitting || !workDesc.trim() || !reward.trim() ? 'not-allowed' : 'pointer', opacity: submitting || !workDesc.trim() || !reward.trim() ? 0.6 : 1 })}
              >
                {submitting ? 'Sending…' : 'Send offer to help'}
              </button>
              <button
                onClick={() => setShowProposalForm(false)}
                {...rv('v4-btn v4-btn--secondary', { background: 'none', border: 'none', fontSize: 13, color: 'var(--ink-4)', cursor: 'pointer', padding: '9px 4px' })}
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
                {canManage && pendingProposals.length > 0 && ` · ${pendingProposals.length} offer${pendingProposals.length === 1 ? '' : 's'} to help`}
              </span>
            </div>

            {canManage && (
              <div {...rv('pj5-add', { background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 })}>
                {/* Review: one row on phones too (#38: controls in one row), so the subtasks start higher */}
                <div {...(RV ? { className: 'pj5-addrow' } : { className: 'ops-subtask-form', style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' } })}>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSubtask()}
                    placeholder="New subtask…"
                    aria-label="New subtask"
                    {...rv('v4-input pj5-field pj5-addtitle', { ...inputStyle, flex: '1 1 200px', padding: '8px 12px', fontSize: 13 })}
                  />
                  <div style={{ flexShrink: 0 }}>
                    <CalendarPicker
                      value={newTaskDue}
                      onChange={setNewTaskDue}
                      placeholder="Due date"
                      align="right"
                    />
                  </div>
                  {newTaskDue && (
                    <input
                      type="time"
                      value={newTaskTime}
                      onChange={e => setNewTaskTime(e.target.value)}
                      aria-label="Time (optional)"
                      title="Time (optional)"
                      {...rv('v4-input pj5-field pj5-time', { ...inputStyle, width: 120, flexShrink: 0, padding: '8px 10px', fontSize: 13 })}
                    />
                  )}
                  <button
                    onClick={addSubtask}
                    disabled={addingTask || !newTaskTitle.trim()}
                    {...rv('v4-btn v4-btn--primary pj5-addbtn', {
                      background: 'var(--m7)', color: '#fff', fontSize: 13, fontWeight: 600,
                      padding: '8px 18px', borderRadius: 8, border: 'none', whiteSpace: 'nowrap',
                      cursor: addingTask || !newTaskTitle.trim() ? 'not-allowed' : 'pointer',
                      opacity: addingTask || !newTaskTitle.trim() ? 0.55 : 1,
                      flexShrink: 0,
                    })}
                  >
                    {RV ? <><V4Icon name="plus" size={16} />{addingTask ? 'Adding…' : 'Add'}</> : addingTask ? 'Adding…' : '+ Add'}
                  </button>
                </div>
                {taskError && <p {...rv('pj5-error', { fontSize: 12, color: '#ef4444', marginTop: 8, marginBottom: 0 })}>{taskError}</p>}
              </div>
            )}

            <div {...rv('pj5-board', { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 })}>
              {PROJECT_KANBAN_COLUMNS.map(col => {
                const isTarget = dropTarget === col.key
                // Ideas also holds proposals waiting for a lead; subtasks can be Ideas or Later too (v4.122/v4.123)
                const cards = col.key === 'pending'
                  ? [...(canManage ? pendingProposals : []), ...deliverables.filter(d => d.status === 'pending')]
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
                    className={RV ? `ops-col pj5-col${isTarget ? ' is-target' : ''}${cards.length === 0 && deliverables.length + (canManage ? pendingProposals.length : 0) > 0 ? ' is-empty' : ''}` : 'ops-col'}
                    style={RV ? undefined : {
                      background: isTarget ? `${col.color}10` : 'var(--bg-2)',
                      borderRadius: 10, padding: 8,
                      border: isTarget ? `1px dashed ${col.color}` : '1px solid transparent',
                      transition: 'background 120ms, border-color 120ms',
                      minHeight: 100,
                    }}
                  >
                    {RV ? (
                      // Review: the column is its status pill, the only place a subtask's status colour shows (#34)
                      <div className="pj5-colhead">
                        <V4Pill status={statusFromDb(col.key)} label={col.label} />
                        <span className="pj5-colcount">{cards.length}</span>
                      </div>
                    ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>{col.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>{cards.length}</span>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: col.color }} />
                      </div>
                    </div>
                    )}

                    {cards.length === 0 ? (
                      <div {...rv('pj5-empty', { fontSize: 11, color: 'var(--ink-4)', padding: '8px 4px', textAlign: 'center' })}>
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
                            {...(RV ? { className: `ops-card pj5-card${canManage ? ' can-move' : ''}${dragging?.id === proposal.id ? ' is-dragging' : ''}` } : { className: 'ops-card', style: {
                              background: 'var(--surface)', border: '1px solid var(--rule)',
                              borderLeft: '3px solid #3b82f6',
                              borderRadius: 8, padding: '10px 12px', marginBottom: 6,
                              cursor: canManage ? 'grab' : 'default',
                              opacity: dragging?.id === proposal.id ? 0.5 : 1,
                            } })}
                          >
                            <div {...rv('pj5-cardtitle', { fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 })}>{name}</div>
                            <div {...rv('pj5-offerline', { fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.45, marginBottom: 4 })}>
                              <span style={{ color: 'var(--ink-3)' }}>Offers: </span>{proposal.work_description}
                            </div>
                            <div {...rv('pj5-offerline', { fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.45, marginBottom: 8 })}>
                              <span style={{ color: 'var(--ink-3)' }}>Wants: </span>{proposal.expected_reward}
                            </div>
                            {canManage && (
                              <button
                                onClick={() => acceptProposal(proposal.id, 'backlog')}
                                {...rv('v4-btn v4-btn--primary v4-btn--sm', { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer' })}
                              >
                                {RV ? <><V4Icon name="check" size={14} />Accept</> : 'Accept →'}
                              </button>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      cards.map(c => {
                        const d = c as Deliverable
                        const assignee = d.user_profiles?.first_name ?? d.user_profiles?.username ?? null
                        const named = !assignee && d.assignee_name ? d.assignee_name : null
                        const isSubbed = myDeliverableSubIds.has(d.id)
                        const subsList = deliverableSubsMap[d.id] ?? []
                        const isOverdue = isTaskOverdue(d.due_date, d.due_time, d.status)
                        const otherCircle = d.circle && d.circle !== project.circle && circles.has(d.circle) ? circles.meta(d.circle) : null
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
                              setEditModal(d)
                            }}
                            {...(RV ? { className: `ops-card pj5-card${canManage ? ' can-move' : ''}${dragging?.id === d.id ? ' is-dragging' : ''}` } : {
                              className: 'ops-card',
                              style: {
                                background: 'var(--surface)', border: '1px solid var(--rule)',
                                borderRadius: 8, padding: '8px 10px', marginBottom: 6,
                                cursor: canManage ? 'grab' : 'pointer',
                                opacity: dragging?.id === d.id ? 0.5 : 1,
                                transition: 'box-shadow 120ms',
                              },
                              onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => { if (!canManage || !dragging) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)' },
                              onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.boxShadow = 'none' },
                            })}
                          >
                            <div {...rv(`pj5-cardtitle${d.status === 'done' ? ' is-done' : ''}`, {
                              fontSize: 12, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.35, marginBottom: 6,
                              textDecoration: d.status === 'done' ? 'line-through' : 'none',
                              opacity: d.status === 'done' ? 0.6 : 1,
                            })}>
                              {d.needs_review && (
                                <DraftSwipe
                                  taskId={d.id} canDecide={canManage}
                                  onApproved={() => setDeliverables(prev => prev.map(x => (x.id === d.id ? { ...x, needs_review: false } : x)))}
                                  onDeclined={() => setDeliverables(prev => prev.filter(x => x.id !== d.id))}
                                />
                              )}
                              {d.title}
                            </div>
                            {RV ? (
                              // Review: who and when in body text, late as a yellow result, another circle as its seal
                              // (#7), and the bell from the icon set; watching is filled black (#31)
                              <div className="pj5-meta">
                                <div className="pj5-metaitems">
                                  {assignee && <span className="pj5-who">{assignee}</span>}
                                  {named && <NameTag name={named} />}
                                  <PriorityBadge priority={d.priority} />
                                  {d.due_date && (isOverdue
                                    ? <V4Result tone="attention">{fmtTaskWhen(d.due_date, d.due_time)}<span className="sr-only"> · late</span></V4Result>
                                    : <span className="pj5-when">{fmtTaskWhen(d.due_date, d.due_time)}</span>)}
                                  {otherCircle && d.circle && <span className="pj5-circ" title={otherCircle.label}><CircleSeal slug={d.circle} size={16} />{otherCircle.label}</span>}
                                </div>
                                <button type="button" onClick={(e) => toggleDeliverableSubscription(d.id, e)} aria-pressed={isSubbed}
                                  title={isSubbed ? 'Stop watching' : 'Watch'} aria-label={isSubbed ? 'Stop watching this subtask' : 'Watch this subtask'}
                                  className={`pj5-bell${isSubbed ? ' on' : ''}`}>
                                  <V4Icon name="bell" size={16} />
                                </button>
                              </div>
                            ) : (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, flexWrap: 'wrap', fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
                                {assignee && <span>{assignee}</span>}
                                {named && <NameTag name={named} />}
                                <PriorityBadge priority={d.priority} />
                                {d.due_date && (
                                  <span style={{ color: isOverdue ? '#ef4444' : 'var(--ink-4)', fontWeight: isOverdue ? 700 : 400 }}>
                                    {assignee || named ? '· ' : ''}{fmtTaskWhen(d.due_date, d.due_time)}{isOverdue && <> <InlineIcon name="alert" label="Late" /></>}
                                  </span>
                                )}
                                {otherCircle && <span title={otherCircle.label}>· {otherCircle.emoji} {otherCircle.label}</span>}
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
                            )}
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
            addHref={isJoiningOrAbove(userRole) ? `/calendar?new=1&project=${project.id}` : null}
            hideWhenEmpty
          />

          {/* ── Updates feed ─────────────────────────────────────────────────── */}
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 14 }}>
              Updates
            </div>

            {canManage && (
              <div {...rv('pj5-panel pj5-compose', { background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: 20 })}>
                <textarea
                  value={updateText}
                  onChange={e => setUpdateText(e.target.value)}
                  placeholder="Post an update on this task…"
                  aria-label="Update"
                  rows={3}
                  {...rv('v4-input pj5-field', { ...inputStyle, background: 'var(--surface)', resize: 'vertical', lineHeight: 1.6, marginBottom: 10 })}
                />
                <button
                  onClick={postUpdate}
                  disabled={postingUpdate || !updateText.trim()}
                  {...rv('v4-btn v4-btn--primary', { background: '#4338ca', color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 'var(--radius)', border: 'none', cursor: postingUpdate || !updateText.trim() ? 'not-allowed' : 'pointer', opacity: postingUpdate || !updateText.trim() ? 0.65 : 1 })}
                >
                  {postingUpdate ? 'Posting…' : 'Post update'}
                </button>
              </div>
            )}

            {updates.length === 0 ? (
              <div {...rv('pj5-empty pj5-empty--left', { color: 'var(--ink-4)', fontSize: 13, padding: '24px 0' })}>No updates yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {updates.map((u, i) => {
                  const author = u.user_profiles?.first_name ?? u.user_profiles?.username ?? 'Team'
                  const date = new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  return (
                    RV ? (
                      // Review: no rail line (#37); when and who in meta text, the newest marked in ink
                      <div key={u.id} className={`pj5-update${i === 0 ? ' is-new' : ''}`}>
                        <div className="pj5-update__when"><span>{date}</span><span className="pj5-update__who">{author}</span></div>
                        <p>{u.content}</p>
                      </div>
                    ) : (
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
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column — admin panel ────────────────────────────────────── */}
        {isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div {...rv('pj5-panel pj5-settings', { background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '16px' })}>
              <div {...rv('pj5-label', { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 12 })}>Task settings</div>

              {settingsBlock && (
                // Review: not waiting on anyone, so not yellow: a quiet note with the lock (#34, #36)
                <div {...rv('pj5-lock', { fontSize: 12, lineHeight: 1.5, color: '#b45309', background: 'color-mix(in srgb, #f59e0b 10%, var(--surface))', border: '1px solid #f59e0b', borderRadius: 8, padding: '8px 10px', marginBottom: 12 })}>
                  <InlineIcon name="lock" />You can view these settings but not change them.{' '}
                  <button type="button" onClick={() => setNotice(settingsBlock)} {...rv('pj5-why', { background: 'none', border: 'none', padding: 0, color: '#b45309', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontSize: 12 })}>
                    Why?
                  </button>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} aria-label="Status" {...rv('v4-input pj5-field', { ...inputStyle, padding: '8px 12px', fontSize: 13 })}>
                  <option value="later">Later</option>
                  <option value="pending">Idea</option>
                  <option value="backlog">To do</option>
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
                          else { setEditCircle(next); if (next !== editCircle) setEditTeam('') }
                        }}
                        aria-pressed={RV ? active : undefined}
                        // Review: a circle is its seal; the chosen one is black, like every chosen chip (#7, #31, #37)
                        {...rv(`pj5-chip${active ? ' on' : ''}`, {
                          fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 20,
                          background: active ? meta.color : 'var(--surface)',
                          color: active ? '#fff' : 'var(--ink-3)',
                          border: `1px solid ${active ? meta.color : 'var(--rule)'}`,
                          cursor: 'pointer',
                        })}
                      >
                        {RV ? <><CircleSeal slug={p} size={16} />{meta.label}</> : <>{meta.emoji} {meta.label}</>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {editCircle && teams.some(t => t.circle === editCircle) && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }}>Subcircle</label>
                  <TeamPicker circle={editCircle} teams={teams} value={editTeam} onChange={setEditTeam} color={circles.meta(editCircle).color} size="sm" />
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 14 }}>
                <input type="checkbox" checked={editOpenCollab} onChange={e => setEditOpenCollab(e.target.checked)} style={{ accentColor: RV ? 'var(--ink, #111317)' : '#4338ca' }} />
                <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Open for offers to help</span>
              </label>

              <button
                onClick={saveProjectSettings}
                disabled={savingSettings || !!settingsBlock}
                {...rv('v4-btn v4-btn--primary v4-btn--sm', { background: '#4338ca', color: '#fff', fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 'var(--radius)', border: 'none', cursor: savingSettings || settingsBlock ? 'not-allowed' : 'pointer', opacity: savingSettings || settingsBlock ? 0.65 : 1 })}
              >
                {savingSettings ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          </div>
        )}

      </div>

      <PermissionNoticeModal notice={notice} directory={circleDirectory} onClose={() => setNotice(null)} />

      {/* ── The task pop-up ─────────────────────────────────────────────────────── */}
      {editModal && (
        <TaskModal
          task={editModal}
          canManage={canManage}
          userId={userId}
          people={people}
          projects={projectOptions}
          teams={teams}
          onClose={() => setEditModal(null)}
          onSaved={t => {
            // Filed into another project, or onto the board: it leaves this project's list
            setDeliverables(prev => (t.project_id === project.id ? prev.map(d => (d.id === t.id ? t : d)) : prev.filter(d => d.id !== t.id)))
            setEditModal(null)
          }}
          onDeleted={id => { setDeliverables(prev => prev.filter(d => d.id !== id)); setEditModal(null) }}
          onSubscribersChange={subs => setDeliverableSubsMap(prev => ({ ...prev, [editModal.id]: subs }))}
        />
      )}

    </div>
  )
}
