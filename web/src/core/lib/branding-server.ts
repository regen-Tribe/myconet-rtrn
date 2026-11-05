import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BRANDING_SELECT, NO_BRANDING, type Branding } from './branding'

/** The community's logo and banner, fetched once per request. */
export const loadBranding = cache(async (supabase: SupabaseClient): Promise<Branding> => {
  const { data } = await supabase.from('community_settings').select(BRANDING_SELECT).maybeSingle()
  return (data as Branding | null) ?? NO_BRANDING
})
