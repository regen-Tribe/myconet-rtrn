/**
 * What the person is looking at, for the MyCoNet agent (v4.36.0): the floating agent sends it with each Do request,
 * so "this task", "here" or "these" mean what's on screen. Pages and pop-ups set their part while they're shown
 * (a project page its project, a task's pop-up its task) and clear it when they close; the address bar is sent too.
 */
export interface AgentContext {
  project_id?: string
  task_id?: string
  suggestion_id?: string
}

const parts: Record<string, AgentContext> = {}

/** Set (or clear, with null) one part of the context, e.g. setAgentContext('task', { task_id }) */
export function setAgentContext(key: string, ctx: AgentContext | null) {
  if (ctx) parts[key] = ctx
  else delete parts[key]
}

export function getAgentContext(): AgentContext {
  return Object.assign({}, ...Object.values(parts))
}

/** Open the floating agent on Do with an instruction (and extra context), e.g. from a project-manager suggestion */
export const INSTRUCT_EVENT = 'myconet:instruct'
export function instructAgent(text: string, ctx: AgentContext = {}) {
  window.dispatchEvent(new CustomEvent(INSTRUCT_EVENT, { detail: { text, ctx } }))
}
