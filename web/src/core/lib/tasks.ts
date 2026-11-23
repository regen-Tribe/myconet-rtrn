/**
 * Board tasks (deliverables) with a date and an optional time.
 *
 * `due_date` is a calendar date ("2026-11-21") and `due_time` a local time of day ("19:00:00"),
 * both in the community's local time. They're read as local, never through `new Date("2026-11-21")`,
 * which JavaScript treats as midnight UTC (the day before, west of Greenwich).
 */

export type TaskSource = 'person' | 'agent' | 'meeting'

/** Local Date for a task's date + time (midnight when there's no time). */
export function taskDate(dueDate: string, dueTime?: string | null): Date {
  const [y, m, d] = dueDate.split('-').map(Number)
  const [hh, mm] = (dueTime ?? '00:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh || 0, mm || 0)
}

/** "19:00:00" → "19:00" for <input type="time"> */
export function toTimeInput(dueTime: string | null | undefined): string {
  return dueTime ? dueTime.slice(0, 5) : ''
}

/** "Fri, Nov 21 · 7:00 PM", "Fri, Nov 21", or "—" */
export function fmtTaskWhen(dueDate: string | null | undefined, dueTime?: string | null): string {
  if (!dueDate) return '—'
  const when = taskDate(dueDate, dueTime)
  const day = when.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return dueTime ? `${day} · ${when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : day
}

/** Past due: past the time if there is one, else past the whole day. */
export function isTaskOverdue(dueDate: string | null | undefined, dueTime: string | null | undefined, status: string, now = new Date()): boolean {
  // An idea isn't late (v4.122.0)
  if (!dueDate || status === 'done' || status === 'review' || status === 'pending') return false
  const due = taskDate(dueDate, dueTime)
  if (!dueTime) due.setDate(due.getDate() + 1)
  return due < now
}
