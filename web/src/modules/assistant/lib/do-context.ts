import type { SupabaseClient } from '@supabase/supabase-js'
import type { Board } from './do-actions'

/** What the page sends with a Do request (core/lib/agent-context.ts), plus its address */
export interface PageContext {
  path?: string
  project_id?: string
  task_id?: string
  suggestion_id?: string
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

/**
 * The lines the planner reads about what the person is looking at (v4.36.0), with the same T/P references as its
 * lists (do-plan.ts), so "this task", "here" or "these" can be resolved. A project-manager suggestion is described
 * in full: what it proposed and why. Empty when there's nothing to say.
 */
export async function describeContext(admin: SupabaseClient, ctx: PageContext | undefined, b: Board): Promise<string> {
  if (!ctx) return ''
  const T = (id?: string | null) => { const i = b.tasks.findIndex(t => t.id === id); return i < 0 ? null : `T${i + 1} "${b.tasks[i].title}"` }
  const P = (id?: string | null) => { const i = b.projects.findIndex(p => p.id === id); return i < 0 ? null : `P${i + 1} "${b.projects[i].title}"` }
  const lines: string[] = []
  const path = typeof ctx.path === 'string' ? ctx.path.slice(0, 300) : ''
  if (path) lines.push(`Page: ${path}`)

  // From the address when the page didn't say: /ops/<project>?task=<task>, /ops?circle=…, /meetings/<id>
  const url = path ? new URL(path, 'https://x') : null
  const projectId = ctx.project_id ?? (url?.pathname.match(/^\/ops\/([^/]+)$/)?.[1] ?? null)
  const taskId = ctx.task_id ?? url?.searchParams.get('task') ?? null
  const circle = url?.pathname === '/ops' ? url.searchParams.get('circle') : null
  if (P(projectId)) lines.push(`Looking at project ${P(projectId)}`)
  if (T(taskId)) lines.push(`Has task ${T(taskId)} open`)
  if (circle) lines.push(`The board is filtered to the ${b.circles.find(c => c.slug === circle)?.name ?? circle} circle`)

  const meetingId = url?.pathname.match(/^\/meetings\/([^/]+)$/)?.[1]
  if (meetingId && UUID.test(meetingId)) {
    const [{ data: m }, { data: links }] = await Promise.all([
      admin.from('meeting_transcripts').select('title').eq('id', meetingId).maybeSingle(),
      admin.from('meeting_action_links').select('deliverable_id').eq('meeting_id', meetingId).not('deliverable_id', 'is', null),
    ])
    if (m) {
      const refs = (links ?? []).map(l => T(l.deliverable_id as string)).filter(Boolean)
      lines.push(`Looking at the meeting "${m.title}"${refs.length ? `; its tasks: ${refs.join(', ')}` : ''}`)
    }
  }

  if (ctx.suggestion_id && UUID.test(ctx.suggestion_id)) {
    const { data: s } = await admin.from('agent_suggestions').select('kind, payload, reason, circle, status').eq('id', ctx.suggestion_id).maybeSingle()
    if (s) {
      const p = s.payload as Record<string, unknown>
      const list = (ids: unknown) => (Array.isArray(ids) ? ids.map(x => T(x as string)).filter(Boolean).join(', ') : '')
      const what = s.kind === 'new_project' ? `a new project "${p.title}"${p.description ? ` (${p.description})` : ''} for ${list(p.tasks) || 'some tasks'}`
        : s.kind === 'move' ? `moving ${T(p.task as string) ?? 'a task'} into ${P(p.project as string) ?? 'a project'}`
        : s.kind === 'merge' ? `merging ${T(p.drop as string) ?? 'a task'} into ${T(p.keep as string) ?? 'another'}`
        : s.kind === 'assign' ? `giving ${T(p.task as string) ?? 'a task'} to ${p.person ?? 'someone'}`
        : String(p.label ?? s.kind)
      lines.push(`They are answering the project manager's suggestion for the ${b.circles.find(c => c.slug === s.circle)?.name ?? s.circle} circle: ${what}${s.reason ? `. Its reason: ${s.reason}` : ''}. Their request says what to do instead; "this" and "these" mean the suggestion's tasks.`)
    }
  }
  return lines.join('\n')
}
