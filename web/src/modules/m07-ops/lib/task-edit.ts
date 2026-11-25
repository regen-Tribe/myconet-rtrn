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
  /** The task's notes (Oscar: "add a note in the area where I can update the fields for suggested tasks") */
  notes?: string | null
}

export type TaskChange = Partial<Pick<EditableTask, 'title' | 'status' | 'circle' | 'team_id' | 'project_id' | 'assignee_id' | 'assignee_name' | 'priority' | 'due_date' | 'due_time' | 'notes'>>

/** What the database gives back after a change (the triggers may adjust circle and subcircle) */
export const EDITABLE_SELECT = 'title, status, circle, team_id, project_id, assignee_id, assignee_name, priority, due_date, due_time, needs_review, notes'

/**
 * The task pop-up's rules (TaskModal), for a change made in one picker: a subcircle or a task (project) brings its
 * circle, and what no longer fits the new circle is cleared.
 */
/**
 * What "Part of" offers a task (v4.119.0: Oscar, "the drop down options under part of should only display options that
 * are in the same circle or sub circle as are selected"): with a subcircle, that subcircle's tasks; with a circle, that
 * circle's; with neither, every open task. The task's own current one always stays in the list.
 */
export function partOfChoices(t: Pick<EditableTask, 'circle' | 'team_id' | 'project_id'>, projects: TaskProjectOption[]): TaskProjectOption[] {
  return projects.filter(p => p.id === t.project_id
    || (!t.circle ? true : p.circle === t.circle && (!t.team_id || p.team_id === t.team_id)))
}

export function placeChange(t: EditableTask, field: 'circle' | 'team_id' | 'project_id', value: string, projects: TaskProjectOption[], teams: TaskTeamOption[]): TaskChange {
  const projectCircle = (id: string | null | undefined) => projects.find(p => p.id === id)?.circle ?? null
  const teamCircle = (id: string | null | undefined) => teams.find(x => x.id === id)?.circle ?? null
  const keepProject = (c: string | null) => (t.project_id && projectCircle(t.project_id) && projectCircle(t.project_id) !== c ? null : t.project_id)
  const keepTeam = (c: string | null) => (t.team_id && teamCircle(t.team_id) === c ? t.team_id : null)
  if (field === 'circle') { const c = value || null; return { circle: c, team_id: keepTeam(c), project_id: keepProject(c) } }
  if (field === 'team_id') {
    const c = value ? teamCircle(value) : t.circle ?? null
    // A subcircle keeps the task's parent only when that parent is the same subcircle's (v4.119.0)
    const parentTeam = projects.find(p => p.id === t.project_id)?.team_id ?? null
    const project = value && t.project_id && parentTeam !== value ? null : keepProject(c)
    return { team_id: value || null, circle: c, project_id: project }
  }
  const c = (value && projectCircle(value)) || t.circle || null
  // A task in a subcircle brings its subcircle too
  const team = value ? projects.find(p => p.id === value)?.team_id ?? null : null
  return { project_id: value || null, circle: c, team_id: team ?? keepTeam(c) }
}
