import type { TaskProjectOption, TaskTeamOption } from '../TaskModal'

/** The fields a task can be changed by where it's reviewed (v4.105.0): the drafts list, the project manager, a meeting */
export interface EditableTask {
  id: string
  title: string
  status: string
  circle?: string | null
  team_id?: string | null
  project_id: string | null
  assignee_id: string | null
  assignee_name?: string | null
  priority?: string | null
  due_date: string | null
  due_time?: string | null
  needs_review?: boolean
}

export type TaskChange = Partial<Pick<EditableTask, 'status' | 'circle' | 'team_id' | 'project_id' | 'assignee_id' | 'assignee_name' | 'priority' | 'due_date' | 'due_time'>>

/** What the database gives back after a change (the triggers may adjust circle and subcircle) */
export const EDITABLE_SELECT = 'status, circle, team_id, project_id, assignee_id, assignee_name, priority, due_date, due_time, needs_review'

/**
 * The task pop-up's rules (TaskModal), for a change made in one picker: a subcircle or a task (project) brings its
 * circle, and what no longer fits the new circle is cleared.
 */
export function placeChange(t: EditableTask, field: 'circle' | 'team_id' | 'project_id', value: string, projects: TaskProjectOption[], teams: TaskTeamOption[]): TaskChange {
  const projectCircle = (id: string | null | undefined) => projects.find(p => p.id === id)?.circle ?? null
  const teamCircle = (id: string | null | undefined) => teams.find(x => x.id === id)?.circle ?? null
  const keepProject = (c: string | null) => (t.project_id && projectCircle(t.project_id) && projectCircle(t.project_id) !== c ? null : t.project_id)
  const keepTeam = (c: string | null) => (t.team_id && teamCircle(t.team_id) === c ? t.team_id : null)
  if (field === 'circle') { const c = value || null; return { circle: c, team_id: keepTeam(c), project_id: keepProject(c) } }
  if (field === 'team_id') { const c = value ? teamCircle(value) : t.circle ?? null; return { team_id: value || null, circle: c, project_id: keepProject(c) } }
  const c = (value && projectCircle(value)) || t.circle || null
  return { project_id: value || null, circle: c, team_id: keepTeam(c) }
}
