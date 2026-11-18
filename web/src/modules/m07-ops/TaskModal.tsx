'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/core/lib/supabase/client'
import { useCircles } from '@/core/components/CirclesProvider'
import { fmtTaskWhen, toTimeInput } from '@/core/lib/tasks'
import { CalendarPicker } from './CalendarPicker'
import { NAME_TAG, NameTag } from './NameTag'
import { PrioritySlider, PRIORITIES, type Priority } from './Priority'
import type { Deliverable, SubscriberProfile } from './types'

export interface TaskPerson { id: string; name: string; username: string | null }
/** A project a task can be filed into (open ones, plus the task's own) */
export interface TaskProjectOption { id: string; title: string; circle: string | null }
/** A team within a circle (org_units, kind 'team') */
export interface TaskTeamOption { id: string; name: string; circle: string }

export function SubscriberNames({ subs, max = 5 }: { subs: SubscriberProfile[]; max?: number }) {
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

export function BellIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 14px', borderRadius: 'var(--radius)',
  border: '1px solid var(--rule)', background: 'var(--surface)',
  color: 'var(--ink)', fontSize: 14, outline: 'none', fontFamily: 'inherit',
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 6 }
const small: React.CSSProperties = { ...inputStyle, padding: '8px 10px', fontSize: 13 }
const STATUS_LABEL: Record<string, string> = { backlog: 'Backlog', in_progress: 'In progress', review: 'Review', done: 'Done' }

/**
 * A task's pop-up (v4.34.0), the same on the main board and on a project's page: title, status, who has it,
 * priority, due date, project ("No project" keeps it on the board), circle and team, notes, subscribers. Leads
 * edit everything; the person it's assigned to changes its status and notes (update_my_task()); everyone else
 * reads it. The parent decides who leads (canManage) and what to do after a save or a delete.
 */
export function TaskModal({ task, canManage, userId, people, projects, teams, onClose, onSaved, onDeleted, onSubscribersChange }: {
  task: Deliverable
  canManage: boolean
  userId: string | null
  people: TaskPerson[]
  projects: TaskProjectOption[]
  teams: TaskTeamOption[]
  onClose: () => void
  onSaved: (task: Deliverable) => void
  onDeleted: (id: string) => void
  onSubscribersChange?: (subs: SubscriberProfile[]) => void
}) {
  const circles = useCircles()
  const supabase = createClient()
  const [title, setTitle] = useState(task.title)
  const [due, setDue] = useState<string | null>(task.due_date)
  const [time, setTime] = useState(toTimeInput(task.due_time))
  const [circle, setCircle] = useState(task.circle ?? '')
  const [projectId, setProjectId] = useState(task.project_id ?? '')
  const [teamId, setTeamId] = useState(task.team_id ?? '')
  const [status, setStatus] = useState(task.status ?? 'backlog')
  const [assignee, setAssignee] = useState(task.assignee_id ?? (task.assignee_name ? NAME_TAG : ''))
  const [assigneeName, setAssigneeName] = useState(task.assignee_name ?? '')
  const [priority, setPriority] = useState<Priority>((task.priority as Priority) ?? 'none')
  const [notes, setNotes] = useState(task.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [subs, setSubs] = useState<SubscriberProfile[]>([])
  const mine = task.assignee_id === userId && !!userId
  const subscribed = subs.some(s => s.user_id === userId)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Who follows this task
  useEffect(() => {
    let live = true
    createClient().from('deliverable_subscriptions').select('user_id, user_profiles(first_name, username)').eq('deliverable_id', task.id)
      .then(({ data }) => {
        if (!live) return
        setSubs((data ?? []).map((r: { user_id: string; user_profiles: unknown }) => {
          const p = (Array.isArray(r.user_profiles) ? r.user_profiles[0] : r.user_profiles) as { first_name: string | null; username: string | null } | null
          return { user_id: r.user_id, first_name: p?.first_name ?? null, username: p?.username ?? null }
        }))
      })
    return () => { live = false }
  }, [task.id])

  async function toggleSubscribe() {
    if (!userId) return
    const next = subscribed ? subs.filter(s => s.user_id !== userId) : [...subs, { user_id: userId, first_name: null, username: null }]
    setSubs(next); onSubscribersChange?.(next)
    if (subscribed) await supabase.from('deliverable_subscriptions').delete().eq('deliverable_id', task.id).eq('user_id', userId)
    else await supabase.from('deliverable_subscriptions').insert({ deliverable_id: task.id, user_id: userId })
  }

  // A team belongs to one circle: choosing a team sets the circle; another circle drops the team
  const circleTeams = teams.filter(t => t.circle === circle)
  function pickCircle(c: string) {
    setCircle(c)
    if (teamId && teams.find(t => t.id === teamId)?.circle !== c) setTeamId('')
  }
  function pickTeam(id: string) {
    setTeamId(id)
    const t = teams.find(x => x.id === id)
    if (t) setCircle(t.circle)
  }
  // A project brings its circle when the task has none
  function pickProject(id: string) {
    setProjectId(id)
    const p = projects.find(x => x.id === id)
    if (p?.circle && !circle) setCircle(p.circle)
  }

  async function saveMine() {
    setSaving(true); setError('')
    const { error: e } = await supabase.rpc('update_my_task', { p_task: task.id, p_status: status, p_notes: notes.trim() })
    setSaving(false)
    if (e) { setError(e.message); return }
    onSaved({ ...task, status, notes: notes.trim() || null })
  }

  async function save() {
    if (!title.trim()) return
    setSaving(true); setError('')
    const changes = {
      title: title.trim(),
      due_date: due,
      due_time: due && time ? time : null,
      circle: circle || null,
      project_id: projectId || null,
      team_id: teamId || null,
      status,
      assignee_id: assignee && assignee !== NAME_TAG ? assignee : null,
      assignee_name: assignee === NAME_TAG ? assigneeName.trim().slice(0, 80) || null : null,
      notes: notes.trim() || null,
      priority,
      // Saving a draft (e.g. from a meeting) confirms it
      needs_review: false,
    }
    // RLS rejects silently (0 rows, no error), so ask for the row back to tell
    const { data, error: e } = await supabase.from('deliverables').update(changes).eq('id', task.id).select('id')
    setSaving(false)
    if (e || !data?.length) { setError(e?.message ?? 'The database didn’t allow this change for your account.'); return }
    const who = people.find(x => x.id === changes.assignee_id)
    onSaved({ ...task, ...changes, user_profiles: who ? { first_name: who.name.split(' ')[0], username: who.username } : null } as Deliverable)
  }

  async function remove() {
    setSaving(true)
    const { error: e } = await supabase.from('deliverables').delete().eq('id', task.id)
    setSaving(false)
    if (e) { setError(e.message); return }
    onDeleted(task.id)
  }

  const projectTitle = projects.find(p => p.id === task.project_id)?.title
  const teamName = teams.find(t => t.id === task.team_id)?.name
  const circleLabel = (c: string | null | undefined) => (c && circles.has(c) ? `${circles.meta(c).emoji} ${circles.meta(c).label}` : 'No circle')

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 12,
      }}
    >
      {/* Never taller than the screen (web or phone): the middle scrolls, the header and the buttons stay */}
      <div
        role="dialog" aria-modal="true" aria-label={task.title}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 14,
          border: '1px solid var(--rule)',
          width: '100%', maxWidth: 480,
          maxHeight: 'calc(100dvh - 24px)', overflowY: 'auto', overscrollBehavior: 'contain',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          animation: 'calFadeIn 160ms ease',
        }}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--rule)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 2, background: 'var(--surface)', borderRadius: '14px 14px 0 0',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
            Task
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0, display: 'flex' }}>×</button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Title</label>
            {canManage ? (
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ ...inputStyle, fontSize: 15, fontWeight: 500 }} />
            ) : (
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.4 }}>{task.title}</div>
            )}
          </div>

          {/* Status and who has it */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle} htmlFor="task-status">Status</label>
              {canManage || mine ? (
                <select id="task-status" value={status} onChange={e => setStatus(e.target.value)} style={small}>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{STATUS_LABEL[task.status] ?? task.status}</div>
              )}
            </div>
            <div>
              <label style={labelStyle} htmlFor="task-assignee">Assigned to</label>
              {canManage ? (
                <>
                  <select id="task-assignee" value={assignee} onChange={e => setAssignee(e.target.value)} style={small}>
                    <option value="">Nobody yet</option>
                    {userId && <option value={userId}>Me</option>}
                    {people.filter(p => p.id !== userId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    <option value={NAME_TAG}>✏️ Type a name…</option>
                  </select>
                  {assignee === NAME_TAG && (
                    <input autoFocus={!assigneeName} value={assigneeName} onChange={e => setAssigneeName(e.target.value)} maxLength={80}
                      placeholder="Their name" aria-label="Name of someone not on MyCoNet yet" style={{ ...small, marginTop: 6 }} />
                  )}
                </>
              ) : (
                <div style={{ fontSize: 13, color: task.assignee_id ? 'var(--ink-2)' : 'var(--ink-4)' }}>
                  {people.find(p => p.id === task.assignee_id)?.name ?? (task.assignee_id ? 'Someone' : task.assignee_name ? <NameTag name={task.assignee_name} /> : 'Nobody yet')}
                </div>
              )}
            </div>
          </div>
          {canManage && assignee === NAME_TAG && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: -8, marginBottom: 16 }}>
              Just a name on the task: no account or invite is made. Once they join, pick their account instead.
            </div>
          )}

          {/* Priority */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="task-priority">Priority</label>
            {canManage ? (
              <PrioritySlider id="task-priority" value={priority} onChange={setPriority} />
            ) : (
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{PRIORITIES.find(p => p.value === task.priority)?.label ?? 'None'}</div>
            )}
          </div>

          {/* Due date */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Due date</label>
            {canManage ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <CalendarPicker value={due} onChange={setDue} placeholder="No due date" />
                {due && <input type="time" value={time} onChange={e => setTime(e.target.value)} aria-label="Time (optional)" style={{ ...small, width: 130 }} />}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: task.due_date ? 'var(--ink-2)' : 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
                {task.due_date ? fmtTaskWhen(task.due_date, task.due_time) : 'No due date'}
              </div>
            )}
            {task.due_date && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>Dated tasks also show on the calendar.</div>}
          </div>

          {/* Where it belongs: project, circle, team */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="task-project">Project</label>
            {canManage ? (
              <select id="task-project" value={projectId} onChange={e => pickProject(e.target.value)} style={small}>
                <option value="">No project · on the board</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            ) : task.project_id ? (
              <Link href={`/ops/${task.project_id}`} style={{ fontSize: 13, color: 'var(--m7)', fontWeight: 600, textDecoration: 'none' }}>{projectTitle ?? 'Its project'} →</Link>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No project · on the board</div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle} htmlFor="task-circle">Circle</label>
              {canManage ? (
                <select id="task-circle" value={circle} onChange={e => pickCircle(e.target.value)} style={small}>
                  <option value="">No circle</option>
                  {circles.slugs.map(c => <option key={c} value={c}>{circles.meta(c).emoji} {circles.meta(c).label}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{circleLabel(task.circle)}</div>
              )}
            </div>
            <div>
              <label style={labelStyle} htmlFor="task-team">Team</label>
              {canManage ? (
                <select id="task-team" value={teamId} onChange={e => pickTeam(e.target.value)} style={small} disabled={!circleTeams.length && !teamId}>
                  <option value="">{circleTeams.length ? 'The whole circle' : circle ? 'No teams in this circle' : 'Pick a circle first'}</option>
                  {circleTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 13, color: teamName ? 'var(--ink-2)' : 'var(--ink-4)' }}>{teamName ?? 'The whole circle'}</div>
              )}
            </div>
          </div>

          {task.needs_review && (
            <div style={{ fontSize: 12, color: '#92400e', background: '#fef3c7', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
              {task.source === 'meeting' ? 'Drafted by the agent from a meeting.' : 'A draft.'} Check it{canManage ? ' and save to confirm' : ''}.
            </div>
          )}
          {task.source_meeting_id && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 16, lineHeight: 1.5 }}>
              <Link href={`/meetings/${task.source_meeting_id}`} style={{ color: 'var(--m18, var(--m7))', fontWeight: 600, textDecoration: 'none' }}>📝 From a meeting →</Link>
              {task.source_item && task.source_item !== task.title && <> · “{task.source_item.slice(0, 200)}”</>}
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="task-notes">Notes</label>
            {canManage || mine ? (
              <textarea id="task-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={4} maxLength={5000}
                placeholder="What's been done, what's needed, links…" style={{ ...inputStyle, fontSize: 13, resize: 'vertical', lineHeight: 1.5 }} />
            ) : (
              <div style={{ fontSize: 13, color: task.notes ? 'var(--ink-2)' : 'var(--ink-4)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{task.notes || 'No notes yet.'}</div>
            )}
          </div>

          {/* Subscribers */}
          {userId && (
            <button
              onClick={toggleSubscribe}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, marginBottom: subs.length ? 12 : 0,
                padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: subscribed ? 'color-mix(in srgb, var(--m7) 12%, var(--surface))' : 'var(--bg-2)',
                color: subscribed ? 'var(--m7)' : 'var(--ink-3)',
                border: `1px solid ${subscribed ? 'color-mix(in srgb, var(--m7) 35%, var(--rule))' : 'var(--rule)'}`,
                cursor: 'pointer', transition: 'all 140ms',
              }}
            >
              <BellIcon filled={subscribed} />
              {subscribed ? 'Subscribed' : 'Subscribe to updates'}
            </button>
          )}
          {subs.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)', marginBottom: 6 }}>
                {subs.length} subscriber{subs.length !== 1 ? 's' : ''}
              </div>
              <SubscriberNames subs={subs} />
            </div>
          )}
        </div>

        {error && <div style={{ fontSize: 12.5, color: '#b91c1c', padding: '0 20px 10px' }}>{error}</div>}
        {/* The assignee (not a lead): status and notes only */}
        {!canManage && mine && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--rule)', display: 'flex', justifyContent: 'flex-end', gap: 8, position: 'sticky', bottom: 0, zIndex: 2, background: 'var(--surface)', borderRadius: '0 0 14px 14px' }}>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--rule)', color: 'var(--ink-3)', fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
            <button onClick={saveMine} disabled={saving} style={{ background: 'var(--m7)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '7px 18px', borderRadius: 8, border: 'none', cursor: saving ? 'wait' : 'pointer' }}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        )}
        {canManage && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--rule)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', bottom: 0, zIndex: 2, background: 'var(--surface)', borderRadius: '0 0 14px 14px',
          }}>
            <button onClick={remove} disabled={saving} style={{ background: 'none', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer' }}>
              Delete task
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--rule)', color: 'var(--ink-3)', fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={save}
                disabled={saving || !title.trim()}
                style={{
                  background: 'var(--m7)', color: '#fff', fontSize: 12, fontWeight: 600,
                  padding: '7px 18px', borderRadius: 8, border: 'none',
                  cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
                  opacity: saving || !title.trim() ? 0.65 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Where a task opens: its project's page, or the main board for a task with no project (v4.34.0) */
export const taskHref = (t: { id: string; project_id: string | null }) =>
  t.project_id ? `/ops/${t.project_id}?task=${t.id}` : `/ops?task=${t.id}`
