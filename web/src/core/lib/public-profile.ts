import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * What logged-out visitors may read about a person (the database grants only these
 * columns to visitors; see migration 20261115000100_public_profiles.sql). Signed-in
 * people read every other column except the three in PROFILE_DETAIL_COLUMNS. Ask for
 * `profileColumns(signedIn, full)` so a visitor's query never names a hidden column,
 * which the database would refuse.
 */
export const PUBLIC_PROFILE_COLUMNS =
  'id, username, first_name, last_name, avatar_url, headline, public_bio, website_url, instagram, linkedin, twitter, created_at'

/** Every column a signed-in person may name (all but PROFILE_DETAIL's city, country and user_types; never `*`) */
export const SIGNED_IN_PROFILE_COLUMNS = `${PUBLIC_PROFILE_COLUMNS}, updated_at, role, lead_circles, approved`

export function profileColumns(signedIn: boolean, full: string): string {
  return signedIn ? full : PUBLIC_PROFILE_COLUMNS
}

/** Website and social links as full URLs; people may type a handle or a link */
export function socialLinks(p: { website_url?: string | null; instagram?: string | null; linkedin?: string | null; twitter?: string | null }) {
  const handle = (v: string) => v.trim().replace(/^@/, '').replace(/\/+$/, '')
  const url = (v: string | null | undefined, base: string) => {
    if (!v?.trim()) return null
    return /^https?:\/\//i.test(v.trim()) ? v.trim() : `${base}${handle(v)}`
  }
  return [
    { key: 'website', label: 'Website', href: url(p.website_url, 'https://') },
    { key: 'instagram', label: 'Instagram', href: url(p.instagram, 'https://instagram.com/') },
    { key: 'linkedin', label: 'LinkedIn', href: url(p.linkedin, 'https://www.linkedin.com/in/') },
    { key: 'twitter', label: 'X / Twitter', href: url(p.twitter, 'https://x.com/') },
  ].filter((l): l is { key: string; label: string; href: string } => !!l.href)
}

/**
 * City, country and kinds of people open at joining member (decision #71; migration
 * 20261226000000_newcomer_access.sql). No signed-in query may name them, nor ask for `*`:
 * read them with `loadProfileDetails`, which returns only what the person may see
 * (everyone's for joining members and up, your own for anyone, nothing for visitors).
 */
export type ProfileDetails = { city: string | null; country: string | null; user_types: string[] | null }

const NO_DETAILS: ProfileDetails = { city: null, country: null, user_types: null }

export async function loadProfileDetails(supabase: SupabaseClient, ids: (string | null | undefined)[]): Promise<Map<string, ProfileDetails>> {
  const want = [...new Set(ids.filter((x): x is string => !!x))]
  if (!want.length) return new Map()
  const { data, error } = await supabase.rpc('profile_details', { p_ids: want })
  let rows = (data ?? []) as ({ id: string } & ProfileDetails)[]
  // Before the migration is applied the function doesn't exist yet and the columns are still readable
  if (error?.code === 'PGRST202') {
    const old = await supabase.from('user_profiles').select('id, city, country, user_types').in('id', want)
    rows = (old.data ?? []) as typeof rows
  }
  return new Map(rows.map(r => [r.id, { city: r.city ?? null, country: r.country ?? null, user_types: r.user_types ?? null }]))
}

/** Adds each row's city, country and kinds of people, or nulls where the reader may not see them. */
export async function withProfileDetails<T extends { id: string }>(supabase: SupabaseClient, rows: T[] | null | undefined): Promise<(T & ProfileDetails)[]> {
  const list = rows ?? []
  const details = await loadProfileDetails(supabase, list.map(r => r.id))
  return list.map(r => ({ ...r, ...(details.get(r.id) ?? NO_DETAILS) }))
}

/** One person's details, e.g. your own: `{ city, country, user_types }`, nulls when hidden. */
export async function profileDetailsOf(supabase: SupabaseClient, id: string | null | undefined): Promise<ProfileDetails> {
  if (!id) return NO_DETAILS
  return (await loadProfileDetails(supabase, [id])).get(id) ?? NO_DETAILS
}
