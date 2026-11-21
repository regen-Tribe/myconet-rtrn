import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CIRCLE_SELECT, CIRCLE_SELECT_NO_ICON, circleSet, type Circle, type CircleSet } from './circles'

/** The community's circles, fetched once per request. */
export const loadCircleRows = cache(async (supabase: SupabaseClient): Promise<Circle[]> => {
  const { data, error } = await supabase.from('circles').select(CIRCLE_SELECT)
  if (!error) return (data ?? []) as Circle[]
  // A community that hasn't applied the circles.icon migration yet keeps its circles
  const old = await supabase.from('circles').select(CIRCLE_SELECT_NO_ICON)
  return (old.data ?? []) as Circle[]
})

export async function loadCircles(supabase: SupabaseClient): Promise<CircleSet> {
  return circleSet(await loadCircleRows(supabase))
}
