/**
 * The calendar's Tasks layer: dated tasks from the task board, shown (never copied) on the calendar.
 * They're turned into calendar items in the browser, because a task's date and time are local.
 */
import { taskDate } from '@/core/lib/tasks'
import { one } from '@/core/lib/rows'
import type { BoardTask, CalendarEvent } from '../types'

export const BOARD_TASK_SELECT =
  'id, title, due_date, due_time, status, circle, project_id, assignee_name, projects(title), user_profiles!deliverables_assignee_id_fkey(first_name, username)'

export function toBoardTask(r: any): BoardTask {
  const person = one<{ first_name: string | null; username: string | null }>(r.user_profiles)
  const project = one<{ title: string }>(r.projects)
  return {
    id: r.id, title: r.title, due_date: r.due_date, due_time: r.due_time ?? null, status: r.status,
    circle: r.circle ?? null, project_id: r.project_id, project_title: project?.title ?? null,
    // A name typed in for someone not on MyCoNet yet
    assignee: person?.first_name ?? person?.username ?? r.assignee_name ?? null,
  }
}

export const isBoardTaskId = (id: string) => id.startsWith('task:')

/** A board task as a calendar item: all day without a time, a 30-minute slot with one. */
export function boardTaskEvent(t: BoardTask): CalendarEvent {
  const start = taskDate(t.due_date, t.due_time)
  const end = t.due_time ? new Date(start.getTime() + 30 * 60000) : null
  return {
    id: `task:${t.id}`,
    title: `${t.status === 'done' ? '✓' : '☐'} ${t.title}`,
    description: null, location: null, online_url: null,
    starts_at: start.toISOString(), ends_at: end ? end.toISOString() : null,
    all_day: !t.due_time,
    kind: 'task', is_public: true, circle: t.circle, category: null,
    project_id: t.project_id, proposal_id: null, created_by: '',
    feed_id: null, notes: null, notes_at: null, notes_author: null,
    times_set_at: null, times_author: null, creator: null,
    project: t.project_title ? { id: t.project_id, title: t.project_title } : null,
    proposal: null,
    board: { taskId: t.id, projectId: t.project_id, status: t.status, assignee: t.assignee },
  }
}
