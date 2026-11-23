/**
 * Project lifecycle on the Kanban board.
 *
 * Both the main /operations board (cards = projects) and the /operations/[id] detail page
 * (cards = deliverables, plus pending proposals in the leftmost column) share
 * the same five columns:
 *
 *   Ideas → Backlog → In Progress → Review → Done
 *
 * Projects start in 'pending' (the Ideas column). When an admin activates a
 * project — or when a proposed-by-modal project is accepted — it moves to
 * 'backlog'. From there it advances through 'in_progress', 'review', and
 * 'done'. 'paused' isn't a Kanban column here; the main board adds a Paused column for projects (OpsClient, v4.33.6).
 */

export const PROJECT_KANBAN_STATUSES = ['later', 'pending', 'backlog', 'in_progress', 'review', 'done'] as const
export type ProjectKanbanStatus = typeof PROJECT_KANBAN_STATUSES[number]

export const PROJECT_KANBAN_COLUMNS: { key: ProjectKanbanStatus; label: string; color: string }[] = [
  // Later (v4.123.0): parked, left of Ideas. A task or project you may come back to
  { key: 'later',       label: 'Later',       color: '#a1a1aa' },
  { key: 'pending',     label: 'Ideas',       color: 'var(--ink-4)' },
  { key: 'backlog',     label: 'To do',       color: '#94a3b8' },
  { key: 'in_progress', label: 'In progress', color: '#4338ca' },
  { key: 'review',      label: 'Review',      color: '#f59e0b' },
  { key: 'done',        label: 'Done',        color: '#22c55e' },
]

export const PROJECT_STATUS_META: Record<string, { label: string; color: string }> = {
  later:       { label: 'Later',       color: '#a1a1aa' },
  pending:     { label: 'Idea',        color: 'var(--ink-4)' },
  backlog:     { label: 'To do',       color: '#94a3b8' },
  in_progress: { label: 'In progress', color: '#4338ca' },
  review:      { label: 'Review',      color: '#f59e0b' },
  done:        { label: 'Done',        color: '#22c55e' },
  paused:      { label: 'Paused',      color: '#f59e0b' },
}

/** Statuses of projects that are actively being worked — for `.in('status', …)` queries. */
export const ACTIVE_PROJECT_STATUSES = ['backlog', 'in_progress', 'review'] as const

/** True when a project is in a state where it's actively being worked. */
export function isActiveProject(status: string): boolean {
  return (ACTIVE_PROJECT_STATUSES as readonly string[]).includes(status)
}

/** True when a project is open enough that members can still propose collaboration. */
export function isOpenForProposals(status: string): boolean {
  return isActiveProject(status) || status === 'pending'
}
