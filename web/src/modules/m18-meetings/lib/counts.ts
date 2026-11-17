import type { SupabaseClient } from '@supabase/supabase-js'
import { moduleOn } from '@/core/lib/modules'

/** Meetings per circle that this person can read (RLS), for the circles' "Meeting notes" buttons. Null when Meetings is off. */
export async function meetingCountsByCircle(supabase: SupabaseClient): Promise<Record<string, number> | null> {
  if (!moduleOn('meetings')) return null
  const { data } = await supabase.from('meeting_transcripts').select('circle').not('circle', 'is', null)
  const out: Record<string, number> = {}
  for (const m of data ?? []) out[m.circle as string] = (out[m.circle as string] ?? 0) + 1
  return out
}
