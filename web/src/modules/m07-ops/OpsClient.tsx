'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/client'
import { useCircles } from '@/core/components/CirclesProvider'
import { PROJECT_KANBAN_COLUMNS } from '@/core/lib/project-status'
import { canMoveProject, projectEditBlock, type CircleDirectory, type PermissionNotice } from '@/core/lib/ops-permissions'
import { DeliverablesTab } from './DeliverablesTab'
import { UpdatesTab } from './UpdatesTab'
import { CirclesTab } from './CirclesTab'
import { PermissionNoticeModal } from './PermissionNoticeModal'
import type { Project, Deliverable, ProjectUpdate, SubscriberProfile } from './types'

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
}

type OpsTab = 'board' | 'deliverables' | 'updates' | 'circles'

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, delta, valueColor = 'var(--ink)', onClick, active }: {
  label: string; value: string | number; delta: string; valueColor?: string
  onClick?: () => void; active?: boolean
}) {
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
  project, subtaskCount, doneCount, canMove, subscribers, leadName,
  onDragStart, onDragEnd, onBlockedDrag, isDragging,
}: {
  project: Project; subtaskCount: number; doneCount: number; canMove: boolean
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
    <Link href={`/ops/${project.id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}>
      <div
        // Blocked cards stay draggable so the attempt can explain itself
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
            {subtaskCount === 0 ? 'no subtasks' : `${doneCount}/${subtaskCount} done`}
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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OpsClient({
  projects, deliverables: initialDeliverables, updates,
  activeCount, deliverableCount, doneCount, atRiskCount,
  isAdmin, userId, userRole, leadCircles, sprintName,
  projectSubscribers, userProfiles, canPropose, circleDirectory, initialTab,
}: OpsClientProps) {
  const circles = useCircles()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<OpsTab>(initialTab)
  const [notice, setNotice] = useState<PermissionNotice | null>(null)
  const [boardProjects, setBoardProjects] = useState<Project[]>(projects)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null)
  const [myRole, setMyRole] = useState<'all' | 'lead' | 'member' | 'subscriber'>('all')
  const [overdueOnly, setOverdueOnly] = useState(false)

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

  const sprintLabel = sprintName ?? 'Community Projects'
  const onTrackCount = initialDeliverables.filter(d => d.status === 'in_progress').length
  const totalProjects = boardProjects.filter(p => ['backlog', 'in_progress', 'review'].includes(p.status)).length

  const subtasksByProject = new Map<string, { total: number; done: number }>()
  for (const d of initialDeliverables) {
    const e = subtasksByProject.get(d.project_id) ?? { total: 0, done: 0 }
    e.total += 1
    if (d.status === 'done') e.done += 1
    subtasksByProject.set(d.project_id, e)
  }

  const overdueToday = new Date(); overdueToday.setHours(0, 0, 0, 0)
  const overdueProjectIds = new Set(
    initialDeliverables
      .filter(d => d.due_date && !['done', 'review'].includes(d.status) && new Date(d.due_date) < overdueToday)
      .map(d => d.project_id)
  )

  const myAssignedProjectIds = new Set(
    userId ? initialDeliverables.filter(d => d.assignee_id === userId).map(d => d.project_id) : []
  )
  const mySubscribedProjectIds = new Set(
    userId ? Object.entries(projectSubscribers).filter(([, subs]) => subs.some(s => s.user_id === userId)).map(([id]) => id) : []
  )
  const myInvolvedProjectIds = new Set([
    ...myAssignedProjectIds, ...mySubscribedProjectIds,
    ...(userId ? boardProjects.filter(p => p.lead_user_id === userId || p.created_by === userId).map(p => p.id) : []),
  ])

  const filteredProjects = boardProjects.filter(p => {
    if (overdueOnly && !overdueProjectIds.has(p.id)) return false
    if (selectedCircle && p.circle !== selectedCircle) return false
    if (myRole === 'lead') return p.lead_user_id === userId || p.created_by === userId
    if (myRole === 'member') return myAssignedProjectIds.has(p.id)
    if (myRole === 'subscriber') return mySubscribedProjectIds.has(p.id)
    return true
  })

  const grouped = Object.fromEntries(
    PROJECT_KANBAN_COLUMNS.map(col => [col.key, filteredProjects.filter(p => p.status === col.key)])
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
    <div style={{ padding: '26px 32px 60px' }}>

      {/* ── Page Head ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'color-mix(in srgb, var(--m7) 10%, var(--surface))', color: 'var(--m7)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, marginBottom: 10 }}>
            Module 07 · Operations
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 8px' }}>
            {sprintLabel}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
            {activeCount} active · {deliverableCount} deliverable{deliverableCount !== 1 ? 's' : ''} · {doneCount} done
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Propose project — visible to joining+ non-admins */}
          {canPropose && !isAdmin && (
            <Link href="/ops/new" style={{
              fontSize: 13, fontWeight: 500, color: 'var(--ink-2)',
              background: 'var(--surface)', border: '1px solid var(--rule)',
              borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
              textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-block',
            }}>
              + Propose project
            </Link>
          )}
          {/* Create project — visible to ops admins */}
          {isAdmin && (
            <Link href="/ops/new" style={{
              fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--m7)',
              border: 'none', borderRadius: 8, padding: '8px 16px',
              cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-block',
            }}>
              + Project
            </Link>
          )}
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 18 }}>
        <StatCard label="Active" value={activeCount} delta={`+${activeCount} this sprint`} />
        <StatCard label="Deliverables" value={deliverableCount} delta={`${doneCount} done · ${deliverableCount - doneCount} to go`} />
        <StatCard label="On track" value={onTrackCount} valueColor="var(--m5)" delta="across active projects" />
        <StatCard
          label="At risk" value={atRiskCount}
          valueColor={atRiskCount > 0 ? '#f59e0b' : 'var(--ink)'}
          delta={atRiskCount === 0 ? 'no late items' : `${atRiskCount} overdue · click to filter`}
          active={overdueOnly}
          onClick={atRiskCount > 0 ? () => { setOverdueOnly(v => !v); setActiveTab('board') } : undefined}
        />
        <StatCard label="Projects" value={totalProjects} delta={`${totalProjects} total`} />
      </div>

      {/* ── Tab Row ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--rule)', marginBottom: 18 }}>
        <button onClick={() => setActiveTab('board')} style={tabStyle('board')}>Board</button>
        <button onClick={() => setActiveTab('deliverables')} style={tabStyle('deliverables')}>Deliverables</button>
        <button onClick={() => setActiveTab('updates')} style={tabStyle('updates')}>Updates</button>
        <button onClick={() => setActiveTab('circles')} style={tabStyle('circles')}>Circles</button>
      </div>

      {/* ── Board ─────────────────────────────────────────────────────── */}
      {activeTab === 'board' && (
        <>
          {/* Overdue filter banner */}
          {overdueOnly && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'color-mix(in srgb, #f59e0b 10%, var(--surface))',
              border: '1px solid #f59e0b', borderRadius: 8,
              padding: '8px 14px', marginBottom: 12,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#b45309' }}>⚠ Showing only projects with overdue tasks</span>
              <button
                onClick={() => setOverdueOnly(false)}
                style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#b45309', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
              >
                Clear filter ✕
              </button>
            </div>
          )}
          {/* Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {/* Circle filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'var(--mono)', marginRight: 2 }}>Circle</span>
              {[null, ...circles.slugs].map(circle => {
                const meta = circle ? circles.meta(circle) : null
                const isActive = selectedCircle === circle
                return (
                  <button
                    key={circle ?? 'all'}
                    onClick={() => setSelectedCircle(circle)}
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {PROJECT_KANBAN_COLUMNS.map(col => {
            const cards = grouped[col.key] ?? []
            const isTarget = dropTarget === col.key
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  if (!draggingId) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (dropTarget !== col.key) setDropTarget(col.key)
                }}
                onDragLeave={(e) => { if (e.currentTarget === e.target) setDropTarget(null) }}
                onDrop={(e) => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('text/plain')
                  if (id) moveProject(id, col.key)
                  setDropTarget(null); setDraggingId(null)
                }}
                style={{
                  background: isTarget ? `${col.color}10` : 'var(--bg-2)',
                  borderRadius: 10, padding: 10,
                  border: isTarget ? `1px dashed ${col.color}` : '1px solid transparent',
                  transition: 'background 120ms, border-color 120ms',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{col.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>{cards.length}</span>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: col.color }} />
                  </div>
                </div>

                {cards.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', padding: '12px 4px', textAlign: 'center' }}>Empty</div>
                ) : (
                  cards.map(p => {
                    const stats = subtasksByProject.get(p.id) ?? { total: 0, done: 0 }
                    const subs = projectSubscribers[p.id] ?? []
                    const leadId = p.lead_user_id ?? p.created_by ?? ''
                    const leadProf = userProfiles[leadId]
                    const leadName = leadProf?.first_name ?? leadProf?.username ?? null
                    return (
                      <ProjectKanbanCard
                        key={p.id}
                        project={p}
                        subtaskCount={stats.total}
                        doneCount={stats.done}
                        canMove={canMoveProject(p, userId, userRole, leadCircles, circles)}
                        subscribers={subs}
                        leadName={leadName}
                        onDragStart={(id) => setDraggingId(id)}
                        onBlockedDrag={userId ? () => setNotice(projectEditBlock(p, userId, userRole, leadCircles, circles)) : undefined}
                        onDragEnd={() => { setDraggingId(null); setDropTarget(null) }}
                        isDragging={draggingId === p.id}
                      />
                    )
                  })
                )}
              </div>
            )
          })}
        </div>
        </>
      )}

      {activeTab === 'deliverables' && (
        <DeliverablesTab deliverables={initialDeliverables} projects={boardProjects} />
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
        />
      )}

      <PermissionNoticeModal notice={notice} directory={circleDirectory} onClose={() => setNotice(null)} />
    </div>
  )
}
