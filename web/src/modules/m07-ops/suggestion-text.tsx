'use client'

import type { AgentSuggestion } from './types'

/** The project manager's suggestions in plain words (from the old ProjectManagerPanel; used by the To decide list, v4.114.0) */
export const KIND: Record<string, string> = { merge: 'Same task twice', move: 'Belongs in a task', new_project: 'Start a task', assign: 'Who could take it' }
export const DONE: Record<string, string> = { pm_merge: 'Merged duplicates', pm_move: 'Filed into a task', pm_assign: 'Assigned' }


type Payload = { label?: string; title?: string; description?: string; tasks?: string[]; keep?: string; drop?: string; task?: string; project?: string; person?: string }
const q = (t: string | undefined) => (t ? <strong style={{ fontWeight: 600 }}>{t}</strong> : 'a task')
/** A task's name that opens its card (v4.79.0), when the board has it */
type Opener = ((id: string) => void) | undefined
const linkBtn: React.CSSProperties = { font: 'inherit', fontWeight: 600, color: 'var(--ink)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', textDecoration: 'underline', textDecorationColor: 'var(--rule)', textUnderlineOffset: 3 }
const taskName = (open: Opener, id: string | undefined, t: string | undefined) =>
  t && id && open ? <button type="button" onClick={() => open(id)} style={linkBtn} title="Open the task">{t}</button> : q(t)

/**
 * What accepting does, in plain words (v4.38.4: Oscar found "A ⟵ B" and "A → B" unclear), and the button that says it.
 * The labels the agent wrote ("A → B") are only the fallback for a task or project that's no longer here.
 */
export function explain(s: AgentSuggestion, title: (id?: string) => string | undefined, projectTitle: (id?: string) => string | undefined, open?: Opener): { what: React.ReactNode; button: string } {
  const p = s.payload as Payload
  const [left, right] = (p.label ?? '').split(/ [⟵→] /)
  if (s.kind === 'merge') return {
    what: <>These look like the same piece of work. Keep {taskName(open, p.keep, title(p.keep) ?? left)} and fold {taskName(open, p.drop, title(p.drop) ?? right)} into it: its person, date and meeting link carry over, and it leaves the board.</>,
    button: 'Merge them',
  }
  if (s.kind === 'move') return {
    what: <>Move the task {taskName(open, p.task, title(p.task) ?? left)} into the project {q(projectTitle(p.project) ?? right)}.</>,
    button: 'Move it',
  }
  if (s.kind === 'assign') return {
    what: <>Give the task {taskName(open, p.task, title(p.task) ?? left)} to {q(p.person ?? right)}.</>,
    button: `Give it to ${(p.person ?? right ?? 'them').split(' ')[0]}`,
  }
  const tasks = (p.tasks ?? []).map(id => ({ id, t: title(id) })).filter((x): x is { id: string; t: string } => !!x.t)
  return {
    what: <>Start a new task {q(p.title)}{p.description ? <> ({p.description})</> : null} and move {tasks.length === 1 ? 'this one' : `these ${tasks.length}`} into it as subtasks: {tasks.map((x, i) => <span key={x.id}>{i ? ' · ' : ''}{open ? <button type="button" onClick={() => open(x.id)} style={{ ...linkBtn, fontWeight: 400 }} title="Open the task">{x.t}</button> : x.t}</span>)}.</>,
    button: 'Create the task',
  }
}

