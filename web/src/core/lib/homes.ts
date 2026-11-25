/**
 * "Where do you call home?" can hold more than one place (Sonia, 25 Nov; decision #97). They live in the existing
 * user_profiles.city and .country, paired in order and joined with " · " ("Lisbon · Barcelona", "Portugal · Spain"),
 * so no database change is needed and matching (fuzzy, by town and country) still finds each of them.
 */
export interface Home { city: string; country: string }

export const HOME_SEP = ' · '

export function homesOf(city: string | null | undefined, country: string | null | undefined): Home[] {
  const cities = (city ?? '').split(HOME_SEP).map(s => s.trim())
  const countries = (country ?? '').split(HOME_SEP).map(s => s.trim())
  const n = Math.max(cities.length, countries.length)
  const out: Home[] = []
  for (let i = 0; i < n; i++) {
    // An older single country goes with every town ("Lisbon · Porto", "Portugal")
    const c = cities[i] ?? '', k = countries[i] ?? (countries.length === 1 ? countries[0] : '')
    if (c || k) out.push({ city: c, country: k })
  }
  return out
}

export function homesToFields(homes: Home[]): { city: string | null; country: string | null } {
  const list = homes.filter(h => h.city.trim() || h.country.trim())
  if (!list.length) return { city: null, country: null }
  return { city: list.map(h => h.city.trim()).join(HOME_SEP) || null, country: list.map(h => h.country.trim()).join(HOME_SEP) || null }
}

/** "Lisbon, Portugal · Barcelona, Spain" */
export function homesLabel(city: string | null | undefined, country: string | null | undefined): string {
  return homesOf(city, country).map(h => [h.city, h.country].filter(Boolean).join(', ')).join(HOME_SEP)
}
