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
  id: string
  project_id: string
  title: string
  status: string
  due_date: string | null
  assignee_id: string | null
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
