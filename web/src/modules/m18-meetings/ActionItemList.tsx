'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DraftSwipe } from '@/modules/m07-ops/DraftSwipe'
import { TaskQuickEdit } from '@/modules/m07-ops/TaskQuickEdit'
import type { TaskPerson, TaskProjectOption, TaskTeamOption } from '@/modules/m07-ops/TaskModal'
import { fmtTaskWhen } from '@/core/lib/tasks'
import { Icon, StatusPill } from '@/core/components/v4'
import type { MeetingTask } from './types'
import './meetings-v4.css'

export type ActionItemOptions = { people: TaskPerson[]; projectOptions: TaskProjectOption[]; teams: TaskTeamOption[] }

/**
 * A meeting's action items as rows (v4 look), shared by the meeting's page and the project manager panel on the board
 * (v4.107.0: Oscar, "the things that show up in the meeting section, should also show on the operations page + project
 * manager drop down. same functionality to change things in both places"). A draft opens its fields straight away for
 * those who may change it (with "✦ What should the assistant do?"); a confirmed one opens them with Edit. What's
 * changed here stays with its new values until the page is reloaded.
 */
export function ActionItemList({ tasks: loaded, taskOptions }: { tasks: MeetingTask[]; taskOptions: ActionItemOptions | null }) {
  const router = useRouter()
  const [patch, setPatch] = useState<Record<string, Partial<MeetingTask>>>({})
  const [editing, setEditing] = useState<Set<string>>(() => new Set(loaded.filter(t => t.needs_review && t.can_edit).map(t => t.deliverable_id)))
  const tasks = loaded.map(t => ({ ...t, ...patch[t.deliverable_id] }))
  const toggleEdit = (id: string) => setEditing(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <div className="v4-list">
                    {tasks.map(t => {
                      const who = t.assignee ?? (t.assignee_name ? `${t.assignee_name} (not on MyCoNet yet)` : t.person_name ? `${t.person_name} (not on MyCoNet yet)` : 'Not assigned yet')
                      const canEdit = t.can_edit && !!taskOptions
                      return (
                        <div key={t.deliverable_id} className="mt4-taskwrap">
                        <div className="v4-row mt4-task">
                          <span className="v4-row__lead"><span className="v4-avatar">{(t.assignee ?? t.person_name ?? '?').slice(0, 1).toUpperCase()}</span></span>
                          <Link href={t.project_id ? `/operations/${t.project_id}?task=${t.deliverable_id}` : `/operations?task=${t.deliverable_id}`} className="v4-row__main mt4-tlink">
                            <b className={t.status === 'done' ? 'mt4-done' : undefined}>{t.title}</b>
                            <small>{who}{t.due_date ? ` · ${fmtTaskWhen(t.due_date, t.due_time)}` : ''}{t.project_title ? ` · subtask of “${t.project_title}”` : ''}</small>
                            {t.item_text && t.item_text !== t.title && <small className="mt4-quote">“{t.item_text.slice(0, 120)}”</small>}
                          </Link>
                          <span className="v4-row__trail">
                            {t.needs_review
                              ? <DraftSwipe taskId={t.deliverable_id} canDecide={!!t.can_decide} onApproved={() => setPatch(prev => ({ ...prev, [t.deliverable_id]: { ...prev[t.deliverable_id], needs_review: false } }))} onDeclined={() => router.refresh()} />
                              : <StatusPill status={t.status === 'done' ? 'done' : 'todo'} label={t.status === 'done' ? 'Done' : 'On the board'} />}
                            {canEdit && (
                              <button type="button" className="mt4-editbtn" aria-expanded={editing.has(t.deliverable_id)} onClick={() => toggleEdit(t.deliverable_id)}>
                                <Icon name="pencil" size={13} />{editing.has(t.deliverable_id) ? 'Done' : 'Edit'}
                              </button>
                            )}

                          </span>
                        </div>
                        {canEdit && editing.has(t.deliverable_id) && (
                          <div className="mt4-taskedit">
                            <TaskQuickEdit
                              task={{ id: t.deliverable_id, title: t.title, status: t.status, circle: t.circle, team_id: t.team_id, project_id: t.project_id, assignee_id: t.assignee_id, assignee_name: t.assignee_name, priority: t.priority, due_date: t.due_date, due_time: t.due_time, needs_review: t.needs_review }}
                              {...taskOptions!}
                              onSaved={x => setPatch(prev => ({ ...prev, [t.deliverable_id]: {
                                ...prev[t.deliverable_id], status: x.status, circle: x.circle ?? null, team_id: x.team_id ?? null, project_id: x.project_id,
                                assignee_id: x.assignee_id, assignee_name: x.assignee_name ?? null, priority: x.priority ?? null, due_date: x.due_date, due_time: x.due_time ?? null, needs_review: false,
                                assignee: x.assignee_id ? taskOptions!.people.find(p => p.id === x.assignee_id)?.name.split(' ')[0] ?? null : null,
                                project_title: x.project_id ? taskOptions!.projectOptions.find(p => p.id === x.project_id)?.title ?? t.project_title : null,
                              } }))}
                            />
                          </div>
                        )}
                        </div>
                      )
                    })}
                  </div>
  )
}
