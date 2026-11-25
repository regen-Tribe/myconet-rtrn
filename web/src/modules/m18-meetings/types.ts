import type { FirefliesNotes } from './lib/fireflies'

export type MeetingStatus = 'processing' | 'done' | 'error'
export type MeetingVisibility = 'community' | 'circle'

export interface ActionItem { text: string; speaker: string | null }

export interface MeetingListItem {
  id: string
  title: string
  meeting_date: string | null
  attendees: string[]
  status: MeetingStatus
  source: string
  needs_review: boolean
  created_at: string
  circle: string | null
  /** The subcircle it belongs to (v4.108.0), within its circle; read on its own so a community without the column keeps its pages */
  team_id?: string | null
  visibility: MeetingVisibility
  summary: string | null
  action_items: ActionItem[]
  processed_at: string | null
  /** Who chose the circle: a person, or the agent from the meeting's content */
  circle_source: 'person' | 'agent' | null
  /** The agent's reason for its choice, or why it skipped the meeting */
  agent_note: string | null
}

export interface Meeting extends MeetingListItem {
  /** What people (or Fireflies) called it, before the agent named it */
  original_title: string | null
  transcript: string | null
  error: string | null
  created_by: string | null
  processing_started_at: string | null
  processing_error: string | null
  tasks_drafted: number | null
  notes_path: string | null
  notes_url: string | null
  /** The rest of Fireflies' notes (v4.22.0), shown as tabs */
  fireflies_notes: FirefliesNotes | null
  notes_emailed_at: string | null
  notes_email_count: number | null
  notes_email_error: string | null
}

/** A meeting's task as the second-brain note and the notes email show it */
export interface NotesTask {
  title: string
  person: string | null
  onMyCoNet: boolean
  url: string
  draft: boolean
  when: string | null
  circle: string | null
  circleName: string
}

/** A task the pipeline put on the board for this meeting */
export interface MeetingTask {
  deliverable_id: string
  /** null: on the main board (v4.34.0) */
  project_id: string | null
  project_title: string | null
  title: string
  status: string
  needs_review: boolean
  due_date: string | null
  due_time: string | null
  person_name: string | null
  assignee: string | null
  item_text: string
  /** May the viewer approve or decline this draft from its pill (v4.33.2): an admin, the project’s circle lead, or its project lead */
  can_decide: boolean
  /** May the viewer change it right here (v4.105.0): the same people, draft or not */
  can_edit: boolean
  circle: string | null
  team_id: string | null
  assignee_id: string | null
  assignee_name: string | null
  priority: string | null
  /** Its notes, changed from the row's Edit fields */
  notes?: string | null
  /** The meeting it came from (v4.107.0: the board's project manager lists drafts by meeting); title null when the viewer can't open it */
  meeting?: { id: string; title: string | null; date: string | null; circle: string | null }
}
