/**
 * What logged-out visitors may read about a person (the database grants only these
 * columns to visitors; see migration 20261115000100_public_profiles.sql). Signed-in
 * people read every column. Ask for `profileColumns(signedIn, full)` so a visitor's
 * query never names a hidden column, which the database would refuse.
 */
export const PUBLIC_PROFILE_COLUMNS =
  'id, username, first_name, last_name, avatar_url, headline, public_bio, website_url, instagram, linkedin, twitter, created_at'

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
