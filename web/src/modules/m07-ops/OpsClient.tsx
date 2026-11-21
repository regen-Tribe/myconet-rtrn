'use client'
import { CircleSeal } from '@/core/components/v4/CircleSeal'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/client'
import { useCircles } from '@/core/components/CirclesProvider'
import { PROJECT_KANBAN_COLUMNS } from '@/core/lib/project-status'

// The main board's columns: the Kanban ones, then Paused (v4.33.6), so paused and merged projects can be seen and
// dragged back. Projects only: a task can't be paused, so tasks can't be dropped there.
const BOARD_COLUMNS: { key: string; label: string; color: string }[] = [
  ...PROJECT_KANBAN_COLUMNS,
  { key: 'paused', label: 'Paused', color: '#a1a1aa' },
]
import { canMoveProject, projectEditBlock, type CircleDirectory, type PermissionNotice } from '@/core/lib/ops-permissions'
import { DeliverablesTab } from './DeliverablesTab'
import { UpdatesTab } from './UpdatesTab'
import { CirclesTab } from './CirclesTab'
import { PermissionNoticeModal } from './PermissionNoticeModal'
import { NewTaskModal } from './NewTaskModal'
import { fmtTaskWhen, isTaskOverdue, taskDate } from '@/core/lib/tasks'
import { DraftSwipe } from './DraftSwipe'
import type { Project, Deliverable, ProjectUpdate, SubscriberProfile, AgentSuggestion, PmAction } from './types'
import { ProjectManagerPanel } from './ProjectManagerPanel'
import type { MeetingTask } from '@/modules/m18-meetings/types'
import { NameTag } from './NameTag'
import { TaskModal, type TaskPerson, type TaskProjectOption, type TaskTeamOption } from './TaskModal'
import { PriorityBadge } from './Priority'
import { modLabel } from '@/core/lib/module-label'
import { DESIGN } from '@/core/lib/instance'
import { Button, Chip, ChipRow, PageHeader, InlineIcon } from '@/core/components/v4'
import { CircleFilter, parseCircleParam, setCircleParam } from '@/core/components/v4/CircleFilter'
import './ops-v4.css'

// ─── Types ───────────────────────────────────────────────────────────────────

interface OpsClientProps {
  projects: Project[]
  deliverables: Deliverable[]
  updates: ProjectUpdate[]
  activeCount: number
  deliverableCount: number
  doneCount: number
  atRiskCount: number
  isAdmin: boolean
  userId: string | null
  userRole: string
  leadCircles: string[]
  sprintName: string | null
  projectSubscribers: Record<string, SubscriberProfile[]>
  userProfiles: Record<string, { first_name: string | null; username: string | null }>
  canPropose: boolean
  circleDirectory: CircleDirectory
  initialTab: OpsTab
  /** Meetings per circle this person can read; null when Meetings is off */
  meetingCounts: Record<string, number> | null
  /** ?circle= : the board opens filtered to it (the circles' Project manager buttons) */
  initialCircle: string | null
  pmSuggestions: AgentSuggestion[]
  /** Meetings' drafts waiting to be confirmed, for the project manager panel (v4.107.0) */
  meetingDrafts?: MeetingTask[]
  pmActions: PmAction[]
  /** Open this task's pop-up on arrival (/operations?task=<id>) */
  initialTaskId?: string | null
  /** For the task pop-up */
  people?: TaskPerson[]
  projectOptions?: TaskProjectOption[]
  teams?: TaskTeamOption[]
  /** Ops › Circles: each circle's org-chart unit and its members (v4.35.0) */
  circleUnits?: { id: string; circle: string }[]
  circleMembers?: import('@/modules/m17-org/types').OrgMember[]
  /** Projects (with loose tasks) or every task (v4.38.0) */
  initialView?: 'projects' | 'tasks'
}

type OpsTab = 'board' | 'tasks' | 'updates' | 'circles'

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, delta, valueColor = 'var(--ink)', onClick, active }: {
  label: string; value: string | number; delta: string; valueColor?: string
  onClick?: () => void; active?: boolean
}) {
  if (DESIGN === 'v4') {
    const body = <><small>{label}</small><b style={{ color: valueColor }}>{value}</b><span>{delta}</span></>
    return onClick
      ? <button type="button" className={`v4-stat v4-stat--click${active ? ' on' : ''}`} onClick={onClick} aria-pressed={active}>{body}</button>
      : <div className="v4-stat">{body}</div>
  }
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? 'color-mix(in srgb, #f59e0b 10%, var(--surface))' : 'var(--surface)',
        border: `1px solid ${active ? '#f59e0b' : 'var(--rule)'}`,
        borderRadius: 10, padding: '14px 16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 120ms, background 120ms',
      }}
    >
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: valueColor }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{delta}</div>
    </div>
  )
}

// ─── Project Kanban Card ─────────────────────────────────────────────────────

function ProjectKanbanCard({
  project, subtaskCount, doneCount, canMove, subscribers, leadName, teamName,
  onDragStart, onDragEnd, onBlockedDrag, isDragging,
}: {
  project: Project; subtaskCount: number; doneCount: number; canMove: boolean
  /** The circle team it belongs to, if any (v4.37.0) */
  teamName?: string | null
  subscribers: SubscriberProfile[]
  leadName: string | null
  onDragStart?: (id: string) => void; onDragEnd?: () => void; isDragging?: boolean
  /** Called when the user tries to drag a card they can't move. */
  onBlockedDrag?: () => void
}) {
  const circles = useCircles()
  const circleMeta = circles.has(project.circle) ? circles.meta(project.circle) : null
  const accent = circleMeta?.color ?? 'var(--m7)'

  const deadline = project.deadline ? new Date(project.deadline + 'T00:00:00') : null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const isOverdue = deadline && deadline < today && project.status !== 'done'

  // Format subscriber names: "Oscar · Vaipunu · +3"
  const subNames = subscribers.map(s => s.first_name ?? s.username ?? 'Member')

  return (
    <Link href={`/operations/${project.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}>
      <div
        // Blocked cards stay draggable so the attempt can explain itself
        className="ops-card"
        draggable={canMove || !!onBlockedDrag}
        onDragStart={(e) => {
          if (!canMove) { e.preventDefault(); onBlockedDrag?.(); return }
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', project.id)
          onDragStart?.(project.id)
        }}
        onDragEnd={canMove ? () => onDragEnd?.() : undefined}
        title={canMove ? undefined : "You can't move this card — drag it to see why"}
        style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          borderLeft: `3px solid ${accent}`, borderRadius: 8,
          padding: '10px 12px', boxShadow: 'var(--shadow-sm)',
          cursor: canMove ? 'grab' : 'pointer',
          opacity: isDragging ? 0.5 : 1,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--ink)', lineHeight: 1.35 }}>
          {project.title}
        </div>

        {/* Lead name */}
        {leadName && (
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 4, fontFamily: 'var(--mono)' }}>
            Led by <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{leadName}</span>
          </div>
        )}

        {circleMeta && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 600, color: circleMeta.color, background: `${circleMeta.color}15`, padding: '1px 6px', borderRadius: 20, marginBottom: 5 }}>
            {circleMeta.emoji} {circleMeta.label}
          </div>
        )}
        {teamName && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 600, color: 'var(--ink-3)', background: 'var(--bg-2)', padding: '1px 6px', borderRadius: 20, marginBottom: 5, marginLeft: circleMeta ? 4 : 0 }}>
            {teamName}
          </div>
        )}

        {project.description && (
          <p style={{
            fontSize: 11, color: 'var(--ink-3)', margin: '0 0 6px', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {project.description}
          </p>
        )}

        {/* Subscriber names */}
        {subNames.length > 0 && (
          <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 6, lineHeight: 1.4 }}>
            <span style={{ color: 'var(--ink-4)' }}>Watching: </span>
            <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>
              {subNames.slice(0, 3).join(' · ')}
              {subNames.length > 3 && <span style={{ color: 'var(--ink-4)' }}> · +{subNames.length - 3}</span>}
            </span>
          </div>
        )}

        {/* Footer row: subtasks + deadline */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, flexWrap: 'wrap', gap: 4 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
            {subtaskCount === 0 ? 'no tasks' : `${doneCount}/${subtaskCount} done`}
          </span>
          {deadline && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
              color: isOverdue ? '#ef4444' : 'var(--ink-4)',
              background: isOverdue ? '#fef2f2' : 'transparent',
              padding: isOverdue ? '1px 4px' : 0, borderRadius: 4,
            }}>
              {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─── Task Kanban Card ────────────────────────────────────────────────────────
// A task with no project (v4.34.0): on the main board on its own, tagged with its circle. It opens in its pop-up
// right here on the board.

function TaskKanbanCard({ task, canMove, onOpen, projectTitle, onDragStart, onDragEnd, onBlockedDrag, isDragging, onApproved, onDeclined }: {
  task: Deliverable; canMove: boolean; onOpen: () => void
  /** In the All tasks view: the project it's in */
  projectTitle?: string | null
  /** A draft was approved or declined from its pill */
  onApproved?: () => void; onDeclined?: () => void
  onDragStart?: (id: string) => void; onDragEnd?: () => void; onBlockedDrag?: () => void; isDragging?: boolean
}) {
  const circles = useCircles()
  const meta = task.circle && circles.has(task.circle) ? circles.meta(task.circle) : null
  const late = isTaskOverdue(task.due_date, task.due_time, task.status)
  return (
    <div
      role="button" tabIndex={0} aria-label={task.title}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter') onOpen() }}
      style={{ display: 'block', marginBottom: 8 }}
    >
      <div
        className="ops-card"
        draggable={canMove || !!onBlockedDrag}
        onDragStart={(e) => {
          if (!canMove) { e.preventDefault(); onBlockedDrag?.(); return }
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', `task:${task.id}`)
          onDragStart?.(`task:${task.id}`)
        }}
        onDragEnd={canMove ? () => onDragEnd?.() : undefined}
        title={canMove ? undefined : "You can't move this card — drag it to see why"}
        style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          borderLeft: `3px solid ${meta?.color ?? 'var(--m7)'}`, borderRadius: 8,
          padding: '8px 12px', boxShadow: 'var(--shadow-sm)',
          cursor: canMove ? 'grab' : 'pointer', opacity: isDragging ? 0.5 : 1,
        }}
      >
        <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 5, color: 'var(--ink)', lineHeight: 1.35 }}>
          {task.needs_review && <DraftSwipe taskId={task.id} canDecide={canMove} onApproved={onApproved} onDeclined={onDeclined} />}{task.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <PriorityBadge priority={task.priority} />
          {projectTitle && <span title="Part of task" style={{ fontSize: 9, fontWeight: 600, color: 'var(--ink-3)', background: 'var(--bg-2)', border: '1px solid var(--rule)', padding: '0 6px', borderRadius: 20, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>▣ {projectTitle}</span>}
          {meta && (
            <span style={{ fontSize: 9, fontWeight: 600, color: meta.color, background: `${meta.color}15`, padding: '1px 6px', borderRadius: 20 }}>
              {meta.emoji} {meta.label}
            </span>
          )}
          {task.assignee_username && <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>@{task.assignee_username}</span>}
          {!task.assignee_id && task.assignee_name && <NameTag name={task.assignee_name} style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }} />}
          {task.due_date && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600, color: late ? '#ef4444' : 'var(--ink-4)', marginLeft: 'auto' }}>
              {fmtTaskWhen(task.due_date, task.due_time)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── v4 cards (Task board, v4.62.0) ──────────────────────────────────────────
// On screen a project is a "task" and its deliverables are its "subtasks" (LEXICON, 20 Nov); a deliverable with no
// project is a task of its own. Same drag rules as the cards above.

type Person = { id?: string | null; name: string }

function initials(name: string) {
  const parts = name.replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

function Avatars({ people, max = 3 }: { people: Person[]; max?: number }) {
  if (!people.length) return null
  return (
    <span className="ops4-avs" title={people.map(p => p.name).join(', ')}>
      {people.slice(0, max).map((p, i) => <span key={(p.id ?? p.name) + i} className="ops4-av">{initials(p.name)}</span>)}
      {people.length > max && <span className="ops4-av ops4-av--more">+{people.length - max}</span>}
    </span>
  )
}

function dragProps(id: string, canMove: boolean, onDragStart?: (id: string) => void, onDragEnd?: () => void, onBlockedDrag?: () => void) {
  return {
    draggable: canMove || !!onBlockedDrag,
    onDragStart: (e: React.DragEvent) => {
      if (!canMove) { e.preventDefault(); onBlockedDrag?.(); return }
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', id)
      onDragStart?.(id)
    },
    onDragEnd: canMove ? () => onDragEnd?.() : undefined,
    title: canMove ? undefined : "You can't move this card. Drag it to see why",
  }
}

function V4ProjectCard({ project, subtaskCount, doneCount, canMove, people, watchers, teamName, onDragStart, onDragEnd, onBlockedDrag, isDragging }: {
  project: Project; subtaskCount: number; doneCount: number; canMove: boolean
  /** The lead first, then whoever has a subtask */
  people: Person[]
  watchers: SubscriberProfile[]
  teamName?: string | null
  onDragStart?: (id: string) => void; onDragEnd?: () => void; onBlockedDrag?: () => void; isDragging?: boolean
}) {
  const circles = useCircles()
  const meta = project.circle && circles.has(project.circle) ? circles.meta(project.circle) : null
  const deadline = project.deadline ? new Date(project.deadline + 'T00:00:00') : null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const late = !!deadline && deadline < today && project.status !== 'done'
  const pct = subtaskCount ? Math.round((doneCount / subtaskCount) * 100) : 0
  const isIdea = project.status === 'pending'
  const watchNames = watchers.map(s => s.first_name ?? s.username ?? 'Member')
  return (
    <Link href={`/operations/${project.id}`} className="ops4-link">
      <div className={`ops-card ops4-card${isDragging ? ' is-dragging' : ''}${canMove ? ' can-move' : ''}`} {...dragProps(project.id, canMove, onDragStart, onDragEnd, onBlockedDrag)}>
        <b className="ops4-title">{project.title}</b>
        {(meta || teamName) && (
          <div className="ops4-circ">
            {meta && <CircleSeal slug={project.circle} size={16} />}
            {meta?.label}{teamName ? `${meta ? ' · ' : ''}${teamName}` : ''}
          </div>
        )}
        {!isIdea && subtaskCount > 0 && (
          <div className="ops4-prog" role="img" aria-label={`${doneCount} of ${subtaskCount} subtasks done`}><i style={{ width: `${pct}%` }} /></div>
        )}
        <div className="ops4-foot">
          <small>
            {subtaskCount === 0 ? (isIdea ? 'Task idea' : 'No subtasks yet') : `${doneCount}/${subtaskCount} subtasks`}
            {deadline && <span className={late ? 'ops4-late' : undefined}> · {late ? 'late · ' : ''}{deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
            {watchNames.length > 0 && <span className="ops4-watch" title={`Watching: ${watchNames.join(', ')}`}> · {watchNames.length} watching</span>}
          </small>
          <Avatars people={people} />
        </div>
      </div>
    </Link>
  )
}

function V4TaskCard({ task, canMove, onOpen, projectTitle, onDragStart, onDragEnd, onBlockedDrag, isDragging, onApproved, onDeclined }: {
  task: Deliverable; canMove: boolean; onOpen: () => void
  /** In the Subtasks view: the task it belongs to */
  projectTitle?: string | null
  onApproved?: () => void; onDeclined?: () => void
  onDragStart?: (id: string) => void; onDragEnd?: () => void; onBlockedDrag?: () => void; isDragging?: boolean
}) {
  const circles = useCircles()
  const meta = task.circle && circles.has(task.circle) ? circles.meta(task.circle) : null
  const late = isTaskOverdue(task.due_date, task.due_time, task.status)
  const who = task.user_profiles?.first_name ?? task.assignee_username ?? (!task.assignee_id ? task.assignee_name : null) ?? null
  return (
    <div role="button" tabIndex={0} aria-label={task.title} onClick={onOpen} onKeyDown={e => { if (e.key === 'Enter') onOpen() }} className="ops4-link">
      <div className={`ops-card ops4-card ops4-card--task${isDragging ? ' is-dragging' : ''}${canMove ? ' can-move' : ''}`} style={{ ['--c' as string]: meta?.color ?? 'var(--ink-4)' }}
        {...dragProps(`task:${task.id}`, canMove, onDragStart, onDragEnd, onBlockedDrag)}>
        <span className="ops4-kind">{projectTitle ? `Subtask · ${projectTitle}` : 'Task of its own'}</span>
        <b className="ops4-title">
          {task.needs_review && <DraftSwipe taskId={task.id} canDecide={canMove} onApproved={onApproved} onDeclined={onDeclined} />}{task.title}
        </b>
        <div className="ops4-foot">
          <small>
            <PriorityBadge priority={task.priority} />
            {meta && !projectTitle ? <>{meta.label}</> : null}
            {task.due_date && <span className={late ? 'ops4-late' : undefined}>{meta && !projectTitle ? ' · ' : ''}{late ? 'late · ' : ''}{fmtTaskWhen(task.due_date, task.due_time)}</span>}
          </small>
          {who && <Avatars people={[{ id: task.assignee_id, name: who }]} />}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OpsClient({
  projects, deliverables: initialDeliverables, updates,
  activeCount, deliverableCount, doneCount, atRiskCount,
  isAdmin, userId, userRole, leadCircles, sprintName,
  projectSubscribers, userProfiles, canPropose, circleDirectory, initialTab, meetingCounts,
  initialCircle, pmSuggestions, pmActions, meetingDrafts = [], initialTaskId = null, people = [], projectOptions = [], teams = [],
  circleUnits = [], circleMembers = [], initialView = 'projects',
}: OpsClientProps) {
  const circles = useCircles()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<OpsTab>(initialTab)
  const [notice, setNotice] = useState<PermissionNotice | null>(null)
  const [boardProjects, setBoardProjects] = useState<Project[]>(projects)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  // The circle filter: several circles at once ([] = all), kept in the address as ?circle=a,b (v4.68.0)
  const [selectedCircles, setSelectedCircles] = useState<string[]>(() => parseCircleParam(initialCircle, s => circles.has(s)))
  function pickCircles(next: string[]) { setSelectedCircles(next); setCircleParam(next) }
  // One circle chosen: new tasks start in it, and the project manager panel shows it (as with the old single filter)
  const selectedCircle = selectedCircles.length === 1 ? selectedCircles[0] : null
  // Who decides the project manager's suggestions for a circle: admins and that circle's leads
  const canDecide = (c: string) => userRole === 'admin' || (userRole === 'circle_lead' && leadCircles.includes(c))
  const pmCounts: Record<string, number> = {}
  for (const sg of pmSuggestions) if (canDecide(sg.circle)) pmCounts[sg.circle] = (pmCounts[sg.circle] ?? 0) + 1
  const [myRole, setMyRole] = useState<'all' | 'lead' | 'member' | 'subscriber'>('all')
  const [overdueOnly, setOverdueOnly] = useState(false)
  // The board shows projects (with the tasks that have no project), or every task on its own (v4.38.0, ?view=tasks)
  const [view, setView] = useState<'projects' | 'tasks'>(initialView)
  function pickView(v: 'projects' | 'tasks') {
    setView(v)
    const url = new URL(window.location.href)
    if (v === 'tasks') url.searchParams.set('view', 'tasks'); else url.searchParams.delete('view')
    window.history.replaceState(null, '', url.toString())
  }
  const [newTask, setNewTask] = useState(false)
  const [draftsOnly, setDraftsOnly] = useState(false)
  const [boardTasks, setBoardTasks] = useState<Deliverable[]>(initialDeliverables)
  const draftCount = initialDeliverables.filter(d => d.needs_review).length
  const projectsById = new Map(boardProjects.map(p => [p.id, p]))
  // Who may change a task: its project's leads, or for a task with no project the same rule by its circle
  // (core/lib/ops-permissions.ts; the database checks it again)
  const taskRef = (t: Deliverable) => (t.project_id && projectsById.get(t.project_id)) || { circle: t.circle ?? null, created_by: t.created_by ?? null, lead_user_id: null }
  const canEditTask = (t: Deliverable) => canMoveProject(taskRef(t), userId, userRole, leadCircles, circles)

  // The task pop-up, on the board (a task with no project; /ops?task=<id> opens it too)
  const [openTask, setOpenTask] = useState<Deliverable | null>(() => (initialTaskId ? initialDeliverables.find(d => d.id === initialTaskId) ?? null : null))
  function closeTask() {
    setOpenTask(null)
    // Leave the board's address as it was, without ?task=
    const url = new URL(window.location.href)
    if (url.searchParams.has('task')) { url.searchParams.delete('task'); window.history.replaceState(null, '', url.toString()) }
  }

  async function moveTask(taskId: string, newStatus: string) {
    const t = boardTasks.find(x => x.id === taskId)
    // Tasks have no Ideas column
    if (!t || t.status === newStatus || newStatus === 'pending' || newStatus === 'paused') return
    const p = taskRef(t)
    const block = projectEditBlock(p, userId, userRole, leadCircles, circles)
    if (block) { setNotice(block); return }
    setBoardTasks(prev => prev.map(x => x.id === taskId ? { ...x, status: newStatus } : x))
    const supabase = createClient()
    const { data, error } = await supabase.from('deliverables').update({ status: newStatus }).eq('id', taskId).select('id')
    if (error || !data?.length) {
      setBoardTasks(prev => prev.map(x => x.id === taskId ? { ...x, status: t.status } : x))
      setNotice({
        title: "That move didn't save",
        message: error?.message ?? 'The database didn’t allow this change for your account. Ask a lead of this circle or an admin to move it.',
        circle: circles.has(t.circle ?? p.circle) ? (t.circle ?? p.circle ?? null) : null,
      })
    } else {
      router.refresh()
    }
  }

  async function moveProject(projectId: string, newStatus: string) {
    const p = boardProjects.find(x => x.id === projectId)
    if (!p || p.status === newStatus) return
    const block = projectEditBlock(p, userId, userRole, leadCircles, circles)
    if (block) { setNotice(block); return }
    setBoardProjects(prev => prev.map(x => x.id === projectId ? { ...x, status: newStatus } : x))
    const supabase = createClient()
    // RLS rejects silently (0 rows, no error), so ask for the row back to tell
    const { data, error } = await supabase.from('projects').update({ status: newStatus }).eq('id', projectId).select('id')
    if (error || !data?.length) {
      setBoardProjects(prev => prev.map(x => x.id === projectId ? { ...x, status: p.status } : x))
      setNotice({
        title: "That move didn't save",
        message: error?.message ?? 'The database didn’t allow this change for your account. Ask a lead of this circle or an admin to move it.',
        circle: circles.has(p.circle) ? p.circle : null,
      })
    } else {
      router.refresh()
    }
  }

  const sprintLabel = sprintName ?? 'Operations'
  const onTrackCount = initialDeliverables.filter(d => d.status === 'in_progress').length
  const totalProjects = boardProjects.filter(p => !p.is_chores && ['backlog', 'in_progress', 'review'].includes(p.status)).length

  const subtasksByProject = new Map<string, { total: number; done: number }>()
  for (const d of initialDeliverables) {
    if (!d.project_id) continue
    const e = subtasksByProject.get(d.project_id) ?? { total: 0, done: 0 }
    e.total += 1
    if (d.status === 'done') e.done += 1
    subtasksByProject.set(d.project_id, e)
  }

  const overdueToday = new Date(); overdueToday.setHours(0, 0, 0, 0)
  const overdueProjectIds = new Set(
    initialDeliverables
      .filter(d => d.project_id && d.due_date && !['done', 'review'].includes(d.status) && taskDate(d.due_date) < overdueToday)
      .map(d => d.project_id as string)
  )

  const myAssignedProjectIds = new Set(
    userId ? initialDeliverables.filter(d => d.assignee_id === userId && d.project_id).map(d => d.project_id as string) : []
  )
  const mySubscribedProjectIds = new Set(
    userId ? Object.entries(projectSubscribers).filter(([, subs]) => subs.some(s => s.user_id === userId)).map(([id]) => id) : []
  )
  const myInvolvedProjectIds = new Set([
    ...myAssignedProjectIds, ...mySubscribedProjectIds,
    ...(userId ? boardProjects.filter(p => p.lead_user_id === userId || p.created_by === userId).map(p => p.id) : []),
  ])

  const filteredProjects = boardProjects.filter(p => {
    if (view === 'tasks' || p.is_chores) return false
    if (overdueOnly && !overdueProjectIds.has(p.id)) return false
    if (selectedCircles.length && !(p.circle && selectedCircles.includes(p.circle))) return false
    if (myRole === 'lead') return p.lead_user_id === userId || p.created_by === userId
    if (myRole === 'member') return myAssignedProjectIds.has(p.id)
    if (myRole === 'subscriber') return mySubscribedProjectIds.has(p.id)
    return true
  })

  // The circle filter's list: how many cards each circle has in this view, and the viewer's own circles first
  const circleCount = (c: string) => view === 'tasks'
    ? boardTasks.filter(t => (t.circle ?? (t.project_id ? projectsById.get(t.project_id)?.circle : null)) === c).length
    : boardProjects.filter(p => !p.is_chores && p.circle === c).length + boardTasks.filter(t => !t.project_id && t.circle === c).length
  const myUnitIds = new Set(circleMembers.filter(m => m.user_id === userId).map(m => m.unit_id))
  const myCircles = [...new Set([...leadCircles, ...circleUnits.filter(u => myUnitIds.has(u.id) && u.circle).map(u => u.circle as string)])]

  // Projects view: tasks with no project are cards of their own, a project's tasks are inside its card.
  // Tasks view: every task is a card, tagged with its project
  const filteredTasks = boardTasks.filter(t => {
    if (t.project_id && view === 'projects') return false
    const p = t.project_id ? projectsById.get(t.project_id) : null
    const circle = t.circle ?? p?.circle ?? null
    if (overdueOnly && !isTaskOverdue(t.due_date, t.due_time, t.status)) return false
    if (selectedCircles.length && !(circle && selectedCircles.includes(circle))) return false
    if (myRole === 'lead') return (!!circle && leadCircles.includes(circle)) || (!!p && (p.lead_user_id === userId || p.created_by === userId))
    if (myRole === 'member') return t.assignee_id === userId
    if (myRole === 'subscriber') return !!p && mySubscribedProjectIds.has(p.id)
    return true
  })
  // Tasks have no Ideas or Paused column
  const columns = view === 'tasks' ? BOARD_COLUMNS.filter(c => c.key !== 'pending' && c.key !== 'paused') : BOARD_COLUMNS

  const grouped = Object.fromEntries(
    BOARD_COLUMNS.map(col => [col.key, filteredProjects.filter(p => p.status === col.key)])
  )
  const groupedTasks = Object.fromEntries(
    BOARD_COLUMNS.map(col => [col.key, filteredTasks.filter(t => t.status === col.key)])
  )

  function tabStyle(tab: typeof activeTab): React.CSSProperties {
    const isActive = activeTab === tab
    return {
      fontSize: 13, fontWeight: isActive ? 600 : 400,
      color: isActive ? 'var(--ink)' : 'var(--ink-3)',
      padding: '8px 14px', background: 'none', border: 'none',
      borderBottom: isActive ? '2px solid var(--m7)' : '2px solid transparent',
      cursor: 'pointer', marginBottom: -1, transition: 'color 120ms', outline: 'none',
    }
  }

  return (
    <div className={DESIGN === 'v4' ? 'v4-page v4-page--wide v4-ops' : undefined} style={DESIGN === 'v4' ? undefined : { padding: '26px 32px 60px' }}>

{DESIGN === 'v4' ? (
        <PageHeader eyebrow={sprintName ? `Working together · ${sprintName}` : 'Working together'} title="Task board"
          subtitle={<><b>{activeCount} task{activeCount !== 1 ? 's' : ''} on the go</b> · {deliverableCount - doneCount} open subtask{deliverableCount - doneCount !== 1 ? 's' : ''} · {doneCount} done</>}
          actions={<>
            {isAdmin && <Button variant="secondary" icon="plus" onClick={() => setNewTask(true)}>Task of its own</Button>}
            {isAdmin && <Button variant="next" href="/operations/new">New task</Button>}
            {canPropose && !isAdmin && <Button variant="next" href="/operations/new">Suggest a task</Button>}
          </>} />
) : (<>
      {/* ── Page Head ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'color-mix(in srgb, var(--m7) 10%, var(--surface))', color: 'var(--m7)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, marginBottom: 10 }}>
            {modLabel('07', 'Operations', 'Module')}
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 8px' }}>
            {sprintLabel}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
            {activeCount} active · {deliverableCount} task{deliverableCount !== 1 ? 's' : ''} · {doneCount} done
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Propose project — visible to joining+ non-admins */}
          {canPropose && !isAdmin && (
            <Link href="/operations/new" style={{
              fontSize: 13, fontWeight: 500, color: 'var(--ink-2)',
              background: 'var(--surface)', border: '1px solid var(--rule)',
              borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
              textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-block',
            }}>
              + Suggest a project
            </Link>
          )}
          {/* One-off task for a circle — the same people who can add tasks */}
          {isAdmin && (
            <button onClick={() => setNewTask(true)} style={{
              fontSize: 13, fontWeight: 600, color: 'var(--m7)', background: 'var(--surface)',
              border: '1px solid color-mix(in srgb, var(--m7) 40%, var(--rule))', borderRadius: 8, padding: '8px 16px',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              + Task
            </button>
          )}
          {/* Create project — visible to ops admins */}
          {isAdmin && (
            <Link href="/operations/new" style={{
              fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--m7)',
              border: 'none', borderRadius: 8, padding: '8px 16px',
              cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-block',
            }}>
              + Project
            </Link>
          )}
        </div>
      </div>
</>)}

      {/* ── Stat Cards (v4: the summary line in the header, Late and Drafts as chips) ── */}
      {DESIGN !== 'v4' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 18 }}>
        <StatCard label="Active" value={activeCount} delta={`+${activeCount} this sprint`} />
        <StatCard label="Tasks" value={deliverableCount} delta={`${doneCount} done · ${deliverableCount - doneCount} to go`} />
        <StatCard label="On track" value={onTrackCount} valueColor="var(--m5)" delta="across active tasks" />
        <StatCard
          label="At risk" value={atRiskCount}
          valueColor={atRiskCount > 0 ? '#f59e0b' : 'var(--ink)'}
          delta={atRiskCount === 0 ? 'no late items' : `${atRiskCount} overdue · click to filter`}
          active={overdueOnly}
          onClick={atRiskCount > 0 ? () => { setOverdueOnly(v => !v); setActiveTab('board') } : undefined}
        />
        <StatCard label="Tasks" value={totalProjects} delta={`${totalProjects} total`} />
        {draftCount > 0 && (
          <StatCard
            label="Drafts" value={draftCount} valueColor="#b45309"
            delta="tasks to confirm · click to see" active={activeTab === 'tasks' && draftsOnly}
            onClick={() => { setDraftsOnly(true); setActiveTab('tasks') }}
          />
        )}
      </div>}

{DESIGN === 'v4' ? (
        <ChipRow>
          {/* One row for what the page shows: the board of tasks, the board of every subtask, the list, … */}
          <Chip on={activeTab === 'board' && view === 'projects'} onClick={() => { setActiveTab('board'); pickView('projects') }}>Tasks</Chip>
          <Chip on={activeTab === 'board' && view === 'tasks'} onClick={() => { setActiveTab('board'); pickView('tasks') }}>All subtasks</Chip>
          <Chip on={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')}>List</Chip>
          <Chip on={activeTab === 'updates'} onClick={() => setActiveTab('updates')}>Updates</Chip>
          <Chip on={activeTab === 'circles'} onClick={() => setActiveTab('circles')}>Circles</Chip>
          {draftCount > 0 && (
            <Chip on={activeTab === 'tasks' && draftsOnly} count={draftCount} onClick={() => { setDraftsOnly(true); setActiveTab('tasks') }}>Drafts to confirm</Chip>
          )}
        </ChipRow>
) : (<>
      {/* ── Tab Row ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--rule)', marginBottom: 18 }}>
        <button onClick={() => setActiveTab('board')} style={tabStyle('board')}>Board</button>
        <button onClick={() => setActiveTab('tasks')} style={tabStyle('tasks')}>Tasks</button>
        <button onClick={() => setActiveTab('updates')} style={tabStyle('updates')}>Updates</button>
        <button onClick={() => setActiveTab('circles')} style={tabStyle('circles')}>Circles</button>
      </div>
</>)}

      {/* ── Board ─────────────────────────────────────────────────────── */}
      {activeTab === 'board' && (
        <>
          {/* Overdue filter banner */}
          {overdueOnly && DESIGN !== 'v4' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'color-mix(in srgb, #f59e0b 10%, var(--surface))',
              border: '1px solid #f59e0b', borderRadius: 8,
              padding: '8px 14px', marginBottom: 12,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#b45309' }}><InlineIcon name="alert" />Showing only tasks with late subtasks</span>
              <button
                onClick={() => setOverdueOnly(false)}
                style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#b45309', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
              >
                Clear filter <InlineIcon name="x" />
              </button>
            </div>
          )}
{DESIGN === 'v4' ? (
          <div className="v4-opsfilters ops4-filters">
            <CircleFilter
              options={circles.slugs.map(c => ({ slug: c, label: circles.meta(c).label, color: circles.meta(c).color, count: circleCount(c) }))}
              value={selectedCircles} onChange={pickCircles} mine={myCircles}
            />
            {atRiskCount > 0 && (
              <button type="button" aria-pressed={overdueOnly} className={`v4-chip ops4-latechip${overdueOnly ? ' v4-chip--on' : ''}`} onClick={() => setOverdueOnly(v => !v)}>
                {atRiskCount} late{overdueOnly && <> <InlineIcon name="x" label="Clear" /></>}
              </button>
            )}
            <span className="ops4-spacer" />
            {userId && (
              <span className="v4-seg" role="group" aria-label="My role">
                {(['all', 'lead', 'member', 'subscriber'] as const).map(r => (
                  <button key={r} type="button" aria-pressed={myRole === r} className={myRole === r ? 'on' : ''} onClick={() => setMyRole(r)}>
                    {({ all: 'Everything', lead: 'I lead', member: 'I’m in', subscriber: 'I watch' } as const)[r]}
                  </button>
                ))}
              </span>
            )}
          </div>
) : (<>
          {/* Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {/* What the board shows: projects (and tasks with no project yet), or every task */}
            <div role="tablist" aria-label="Board view" style={{ display: 'inline-flex', alignSelf: 'flex-start', background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 9, padding: 2, gap: 2 }}>
              {([['projects', 'Tasks'], ['tasks', 'All subtasks']] as const).map(([v, label]) => (
                <button key={v} role="tab" aria-selected={view === v} onClick={() => pickView(v)} style={{
                  fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: view === v ? 'var(--surface)' : 'transparent', color: view === v ? 'var(--ink)' : 'var(--ink-3)',
                  boxShadow: view === v ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
                }}>{label}</button>
              ))}
            </div>
            {/* Circle filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'var(--mono)', marginRight: 2 }}>Circle</span>
              {[null, ...circles.slugs].map(circle => {
                const meta = circle ? circles.meta(circle) : null
                const isActive = selectedCircle === circle
                return (
                  <button
                    key={circle ?? 'all'}
                    onClick={() => pickCircles(circle ? [circle] : [])}
                    style={{
                      fontSize: 11, fontWeight: isActive ? 700 : 400,
                      color: isActive ? (meta?.color ?? 'var(--m7)') : 'var(--ink-3)',
                      background: isActive ? (meta ? `${meta.color}18` : 'color-mix(in srgb, var(--m7) 12%, var(--surface))') : 'var(--bg-2)',
                      border: `1px solid ${isActive ? (meta?.color ?? 'var(--m7)') : 'var(--rule)'}`,
                      borderRadius: 20, padding: '3px 10px', cursor: 'pointer', outline: 'none',
                      transition: 'all 120ms',
                    }}
                  >
                    {meta ? `${meta.emoji} ${meta.label}` : 'All'}
                  </button>
                )
              })}
            </div>

            {/* My role filter — only when logged in */}
            {userId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'var(--mono)', marginRight: 2 }}>My role</span>
                {(['all', 'lead', 'member', 'subscriber'] as const).map(role => {
                  const isActive = myRole === role
                  const labels: Record<typeof role, string> = { all: 'All', lead: 'Lead', member: 'Member', subscriber: 'Watching' }
                  return (
                    <button
                      key={role}
                      onClick={() => setMyRole(role)}
                      style={{
                        fontSize: 11, fontWeight: isActive ? 700 : 400,
                        color: isActive ? 'var(--m7)' : 'var(--ink-3)',
                        background: isActive ? 'color-mix(in srgb, var(--m7) 12%, var(--surface))' : 'var(--bg-2)',
                        border: `1px solid ${isActive ? 'var(--m7)' : 'var(--rule)'}`,
                        borderRadius: 20, padding: '3px 10px', cursor: 'pointer', outline: 'none',
                        transition: 'all 120ms',
                      }}
                    >
                      {labels[role]}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
</>)}

        <ProjectManagerPanel
          suggestions={pmSuggestions} actions={pmActions} circle={selectedCircles} canDecide={canDecide}
          projects={projectOptions} teams={teams}
          taskTitles={Object.fromEntries(initialDeliverables.map(d => [d.id, d.title]))}
          editOptions={{ people, projectOptions, teams }}
          meetingDrafts={meetingDrafts}
          onOpenTask={id => { const t = boardTasks.find(x => x.id === id) ?? initialDeliverables.find(x => x.id === id); if (t) setOpenTask(t) }}
        />
        <div className={DESIGN === 'v4' ? 'ops4-board' : undefined} style={DESIGN === 'v4' ? undefined : { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {columns.map(col => {
            const cards = grouped[col.key] ?? []
            const taskCards = groupedTasks[col.key] ?? []
            const isTarget = dropTarget === col.key
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  if (!draggingId) return
                  if (col.key === 'paused' && draggingId.startsWith('task:')) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (dropTarget !== col.key) setDropTarget(col.key)
                }}
                className="ops-col"
                onDragLeave={(e) => { if (e.currentTarget === e.target) setDropTarget(null) }}
                onDrop={(e) => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('text/plain')
                  if (id.startsWith('task:')) { if (col.key !== 'paused') moveTask(id.slice(5), col.key) }
                  else if (id) moveProject(id, col.key)
                  setDropTarget(null); setDraggingId(null)
                }}
                style={{
                  background: isTarget ? `${col.color}10` : 'var(--bg-2)',
                  borderRadius: 10, padding: 10,
                  border: isTarget ? `1px dashed ${col.color}` : '1px solid transparent',
                  transition: 'background 120ms, border-color 120ms',
                }}
              >
                <div className="ops4-colhead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{col.label}{DESIGN === 'v4' && col.key === 'paused' && <small className="ops4-colnote"> · not for a task of its own</small>}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>{cards.length + taskCards.length}</span>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: col.color }} />
                  </div>
                </div>

                {cards.length + taskCards.length === 0 ? (
                  <div className="ops4-empty" style={DESIGN === 'v4' ? undefined : { fontSize: 11, color: 'var(--ink-4)', padding: '12px 4px', textAlign: 'center' }}>{DESIGN === 'v4' ? (col.key === 'pending' ? 'No task ideas' : col.key === 'paused' ? 'Nothing paused' : 'Nothing here') : 'Empty'}</div>
                ) : (
                  cards.map(p => {
                    const stats = subtasksByProject.get(p.id) ?? { total: 0, done: 0 }
                    const subs = projectSubscribers[p.id] ?? []
                    const leadId = p.lead_user_id ?? p.created_by ?? ''
                    const leadProf = userProfiles[leadId]
                    const leadName = leadProf?.first_name ?? leadProf?.username ?? null
                    if (DESIGN === 'v4') {
                      // The lead first, then whoever has a subtask on it
                      const seen = new Set<string>()
                      const people: Person[] = []
                      const add = (id: string | null | undefined, name: string | null | undefined) => {
                        const k = id ?? name ?? ''
                        if (!name || seen.has(k)) return
                        seen.add(k); people.push({ id, name })
                      }
                      if (leadName) add(leadId, leadName)
                      for (const d of initialDeliverables) if (d.project_id === p.id) add(d.assignee_id, d.user_profiles?.first_name ?? d.assignee_username ?? (!d.assignee_id ? d.assignee_name : null))
                      return (
                        <V4ProjectCard
                          key={p.id} project={p} subtaskCount={stats.total} doneCount={stats.done}
                          canMove={canMoveProject(p, userId, userRole, leadCircles, circles)}
                          people={people} watchers={subs}
                          teamName={teams.find(t => t.id === p.team_id)?.name ?? null}
                          onDragStart={(id) => setDraggingId(id)}
                          onBlockedDrag={userId ? () => setNotice(projectEditBlock(p, userId, userRole, leadCircles, circles)) : undefined}
                          onDragEnd={() => { setDraggingId(null); setDropTarget(null) }}
                          isDragging={draggingId === p.id}
                        />
                      )
                    }
                    return (
                      <ProjectKanbanCard
                        key={p.id}
                        project={p}
                        subtaskCount={stats.total}
                        doneCount={stats.done}
                        canMove={canMoveProject(p, userId, userRole, leadCircles, circles)}
                        subscribers={subs}
                        leadName={leadName}
                        teamName={teams.find(t => t.id === p.team_id)?.name ?? null}
                        onDragStart={(id) => setDraggingId(id)}
                        onBlockedDrag={userId ? () => setNotice(projectEditBlock(p, userId, userRole, leadCircles, circles)) : undefined}
                        onDragEnd={() => { setDraggingId(null); setDropTarget(null) }}
                        isDragging={draggingId === p.id}
                      />
                    )
                  }).concat(taskCards.map(t => {
                    const p = taskRef(t)
                    const Card = DESIGN === 'v4' ? V4TaskCard : TaskKanbanCard
                    return (
                      <Card
                        key={t.id}
                        task={t}
                        canMove={canMoveProject(p, userId, userRole, leadCircles, circles)}
                        onOpen={() => setOpenTask(t)}
                        projectTitle={t.project_id ? projectsById.get(t.project_id)?.title ?? null : null}
                        onDragStart={(id) => setDraggingId(id)}
                        onBlockedDrag={userId ? () => setNotice(projectEditBlock(p, userId, userRole, leadCircles, circles)) : undefined}
                        onDragEnd={() => { setDraggingId(null); setDropTarget(null) }}
                        isDragging={draggingId === `task:${t.id}`}
                        onApproved={() => { setBoardTasks(prev => prev.map(x => (x.id === t.id ? { ...x, needs_review: false } : x))); router.refresh() }}
                        onDeclined={() => { setBoardTasks(prev => prev.filter(x => x.id !== t.id)); router.refresh() }}
                      />
                    )
                  }))
                )}
              </div>
            )
          })}
        </div>
        {DESIGN === 'v4' && (
          <p className="ops4-hint">
            {userId ? 'Drag a card to move it. Only a task’s lead or its circle’s lead can move it. A task of its own can’t be paused.' : 'Open a card to see more.'}
          </p>
        )}
        </>
      )}

      {activeTab === 'tasks' && (
        <DeliverablesTab
          deliverables={initialDeliverables} projects={boardProjects} draftsOnly={draftsOnly} onDraftsOnly={setDraftsOnly}
          canDecide={canEditTask}
          onOpen={setOpenTask}
          projectOptions={projectOptions} teams={teams}
          onDecided={() => router.refresh()}
        />
      )}
      {activeTab === 'updates' && (
        <UpdatesTab updates={updates} projects={projects} />
      )}

      {activeTab === 'circles' && (
        <CirclesTab
          directory={circleDirectory}
          projects={boardProjects}
          userId={userId}
          userRole={userRole}
          leadCircles={leadCircles}
          involvedProjectIds={myInvolvedProjectIds}
          meetingCounts={meetingCounts}
          pmCounts={pmCounts}
          circleUnits={circleUnits}
          circleMembers={circleMembers}
          people={people}
          teams={teams}
        />
      )}

      <PermissionNoticeModal notice={notice} directory={circleDirectory} onClose={() => setNotice(null)} />
      {newTask && (
        <NewTaskModal
          defaultCircle={selectedCircle ?? leadCircles[0] ?? null}
          onClose={() => setNewTask(false)}
          onAdded={() => { setNewTask(false); router.refresh() }}
        />
      )}
      {openTask && (
        <TaskModal
          task={openTask}
          canManage={canEditTask(openTask)}
          userId={userId}
          people={people}
          projects={projectOptions}
          teams={teams}
          onClose={closeTask}
          onSaved={t => { setBoardTasks(prev => prev.map(x => (x.id === t.id ? t : x))); closeTask(); router.refresh() }}
          onDeleted={id => { setBoardTasks(prev => prev.filter(x => x.id !== id)); closeTask(); router.refresh() }}
        />
      )}
    </div>
  )
}
