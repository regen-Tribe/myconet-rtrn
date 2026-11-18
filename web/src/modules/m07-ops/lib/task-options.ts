import type { SupabaseClient } from '@supabase/supabase-js'
import type { TaskPerson, TaskProjectOption, TaskTeamOption } from '../TaskModal'

/**
 * What a task's pop-up offers (v4.34.0): everyone a task can be given to (shared admin accounts left out), the
 * open projects it can be filed into, and the circles' teams (org_units of kind 'team'). The task's own project
 * is added by the caller when it isn't open any more.
 */
export async function loadTaskOptions(supabase: SupabaseClient): Promise<{ people: TaskPerson[]; projectOptions: TaskProjectOption[]; teams: TaskTeamOption[] }> {
  const [u, p, t] = await Promise.all([
    supabase.from('user_profiles').select('id, first_name, last_name, username').order('first_name'),
    supabase.from('projects').select('id, title, circle').in('status', ['pending', 'backlog', 'in_progress', 'review']).order('title'),
    supabase.from('org_units').select('id, name, circle').eq('kind', 'team').order('sort_order'),
  ])
  return {
    people: ((u.data ?? []) as { id: string; first_name: string | null; last_name: string | null; username: string | null }[])
      .map(r => ({ id: r.id, name: [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.username || 'Member', username: r.username ?? null }))
      .filter(r => !/admin/i.test(`${r.name} ${r.username ?? ''}`)),
    projectOptions: (p.data ?? []) as TaskProjectOption[],
    teams: (t.data ?? []) as TaskTeamOption[],
  }
}
