import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/core/lib/supabase/service'
import type { AgentSuggestion, PmAction } from '../types'

/**
 * The project manager's open suggestions (the person's own session) and its own changes of the last two
 * weeks (agent_actions is admin-only to read, so these few fields come through the server).
 */
export async function loadProjectManager(supabase: SupabaseClient): Promise<{ suggestions: AgentSuggestion[]; actions: PmAction[] }> {
  const since = new Date(Date.now() - 14 * 86400_000).toISOString()
  const [{ data: sugs }, { data: acts }] = await Promise.all([
    supabase.from('agent_suggestions').select('id, circle, kind, payload, reason').eq('status', 'open').order('created_at'),
    createServiceClient().from('agent_actions').select('id, action, detail').or('action.like.pm_%,action.like.do_%').is('undone_at', null).gte('created_at', since).order('created_at', { ascending: false }).limit(40),
  ])
  const actions = (acts ?? []).map(a => {
    const d = a.detail as Record<string, any>
    const label = String(a.action).startsWith('do_') ? String(d.summary ?? '')
      : a.action === 'pm_merge' ? `${d.kept} ⟵ ${d.dropped?.title ?? ''}`
      : a.action === 'pm_move' ? `${d.title} → ${d.project ?? 'a project'}`
      : `${d.title} → ${d.person ?? ''}`
    return { id: a.id as string, action: a.action as string, circle: (d.circle ?? '') as string, label, reason: (d.reason ?? null) as string | null }
  })
  return { suggestions: (sugs ?? []) as AgentSuggestion[], actions }
}

/** Open suggestions per circle, for the circles' "Project manager" buttons */
export async function suggestionCountsByCircle(supabase: SupabaseClient): Promise<Record<string, number>> {
  const { data } = await supabase.from('agent_suggestions').select('circle').eq('status', 'open')
  const out: Record<string, number> = {}
  for (const s of data ?? []) out[s.circle as string] = (out[s.circle as string] ?? 0) + 1
  return out
}
