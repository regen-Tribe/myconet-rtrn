/**
 * Shared types for the M07 Ops module.
 */

export interface Project {
  id: string
  title: string
  description: string | null
  status: string
  open_for_collaborators: boolean
  circle?: string | null
  /** The circle's standing project for one-off tasks */
  is_chores?: boolean
  /** A team of its circle, or null for the whole circle (v4.37.0) */
  team_id?: string | null
  needs?: string[] | string | null
  deadline?: string | null
  sprint_name?: string | null
  created_at: string
  updated_at?: string
  created_by?: string | null
  lead_user_id?: string | null
}

export type ProjectSummary = Pick<Project, 'id' | 'title'>

export interface Deliverable {
  /** Free notes on the task (v4.31.0) */
  notes?: string | null
  id: string
  /** null: a task on its own, on the main board (v4.34.0) */
  project_id: string | null
  /** A team within its circle (org_units, kind 'team'), v4.34.0 */
  team_id?: string | null
  created_by?: string | null
  title: string
  status: string
  due_date: string | null
  assignee_id: string | null
  /** Someone not on MyCoNet yet: only a name tag, no account (v4.32.0). Empty when assignee_id is set */
  assignee_name?: string | null
  /** none · low · medium · high (v4.32.0) */
  priority?: string | null
  progress: number | null
  assignee_username?: string | null
  from_agreement_id?: string | null
  /** Local time of day ("19:00:00"), only with a due_date */
  due_time?: string | null
  /** Defaults to the project's circle */
  circle?: string | null
  /** Who added it: a person, the agent, or a meeting's action items */
  source?: 'person' | 'agent' | 'meeting'
  /** A draft (e.g. from a meeting) waiting for a lead to confirm */
  needs_review?: boolean
  /** The meeting it came from, and what was said */
  source_meeting_id?: string | null
  source_item?: string | null
  user_profiles?: { first_name: string | null; username: string | null } | null
}

export interface ProjectUpdate {
  id: string
  project_id: string
  user_id?: string
  content: string
  created_at: string
  author_first_name?: string | null
  user_profiles?: { first_name: string | null; username: string | null } | null
}

/** Subscriber profile — used for project + deliverable subscription display */
export interface SubscriberProfile {
  user_id: string
  first_name: string | null
  username: string | null
}

/** Quirk: Supabase's generic types model many-to-one joins as arrays. We know at
 * runtime each row has at most one related user_profiles record, so module
 * components treat it as an object. Use `as unknown as T` at the page boundary
 * (server component) when handing data to consumers. */

export interface CollaborationAgreement {
  id: string
  work_description: string | null
  expected_reward: string | null
  conditions?: string | null
  status: string
  created_at?: string
  user_profiles?: { first_name: string | null; username: string | null } | null
}

export interface MyProposal {
  id: string
  work_description: string | null
  expected_reward: string | null
  conditions: string | null
  status: string
}

/** One of the project manager's suggestions for a circle (agent_suggestions, open) */
export interface AgentSuggestion {
  id: string
  circle: string
  kind: 'merge' | 'move' | 'new_project' | 'assign'
  payload: Record<string, unknown>
  reason: string | null
  /** When the project manager reviewed the board and made it */
  created_at?: string
  /** Where its tasks came from (v4.77.0), for "Where this comes from" */
  sources?: SuggestionSource[]
}

/** One task a suggestion is about, and where it came from: the meeting line it was drafted from, or who added it */
export interface SuggestionSource {
  task_id: string
  title: string
  status: string
  draft: boolean
  /** The project it's in now, if any */
  project: string | null
  person: string | null
  due_date: string | null
  priority: string | null
  notes: string | null
  /** The meeting it was drafted from; title null when the person can't open that meeting */
  meeting: { id: string; title: string | null; date: string | null; circle: string | null; attendees: string[] } | null
  /** What was said there (the meeting's action item), and who said it (Fireflies' speaker for that item) */
  said: string | null
  said_by: string | null
  /** Who added it, and when */
  added_by: string | null
  added_at: string | null
  /** The raw fields, for editing it right in the panel (v4.105.0) */
  edit: { circle: string | null; team_id: string | null; project_id: string | null; assignee_id: string | null; assignee_name: string | null; priority: string | null; due_date: string | null; due_time: string | null }
}

/** A change the project manager made itself (agent_actions pm_*), undoable by the circle's leads */
export interface PmAction {
  id: string
  action: string
  circle: string
  label: string
  reason: string | null
}
