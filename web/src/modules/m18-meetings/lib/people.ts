/**
 * Matching a name said in a meeting ("Ana", "Ana López", "ana_l") to a portal member.
 * Not everyone has an account yet, so no match is normal: the task keeps the name in its title
 * and the notes email lists them as "not on MyCoNet yet".
 */

export interface PersonProfile {
  id: string
  first_name: string | null
  last_name: string | null
  username: string | null
}

export interface PersonMatch { id: string; name: string }

const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

export const displayName = (p: PersonProfile) =>
  [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username || 'Member'

/** Full name, then username, then a first name only one member has. Ambiguous → null. */
export function matchPerson(name: string | null | undefined, people: PersonProfile[]): PersonMatch | null {
  const n = norm(name)
  if (!n) return null
  const hit = (p: PersonProfile) => ({ id: p.id, name: displayName(p) })

  const full = people.filter(p => norm(`${p.first_name ?? ''} ${p.last_name ?? ''}`) === n)
  if (full.length === 1) return hit(full[0])
  const user = people.filter(p => norm(p.username) === n || norm(p.username?.replace(/[._-]+/g, ' ')) === n)
  if (user.length === 1) return hit(user[0])

  const first = n.split(' ')[0]
  const byFirst = people.filter(p => norm(p.first_name).split(' ')[0] === first)
  if (byFirst.length === 1) return hit(byFirst[0])
  return null
}

/** The key that stops one task being added twice for a meeting: its title, normalised */
export const itemKey = (title: string) => norm(title).slice(0, 200)
