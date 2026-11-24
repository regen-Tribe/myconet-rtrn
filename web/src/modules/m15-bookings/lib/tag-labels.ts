/**
 * What an item's tag says on screen (design review, decision #23). Tags are stored as slugs (`dorm-1`,
 * `private-room`, `female`); people read plain words. This is the one place that maps them: the Filter, the
 * cards, the item's page and the inventory all call `tagLabel`. Words: LEXICON.md › Places and things.
 */
const TAG_LABEL: Record<string, string> = {
  'dorm-1': 'Dorm 1',
  'dorm-2': 'Dorm 2',
  'dorm-bed': 'Dorm bed',
  'main-space': 'Main space',
  'private-room': 'Private room',
  female: 'Women only',
  male: 'Men only',
}

/** A tag in plain words: the mapped label, else the slug sentence-cased ("outdoor-kitchen" → "Outdoor kitchen"). */
export function tagLabel(slug: string): string {
  const known = TAG_LABEL[slug.toLowerCase()]
  if (known) return known
  const words = slug.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  return words ? words[0].toUpperCase() + words.slice(1) : slug
}
