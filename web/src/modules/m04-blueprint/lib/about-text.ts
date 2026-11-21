/** Short forms of Blueprint answers, shared by About (AboutV4) and the Blueprint wizard's dashboard. */

const NUM: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20', thirty: '30', forty: '40', fifty: '50', hundred: '100' }

/** A fact for the strip, as short as the prototype's ("14 hectares", "30 people at a time"): the first clause
 *  without its lead-in ("Our property is…", "We are in…"), number words as digits. */
export function fact(text: string | null): string | null {
  if (!text) return null
  const t = text.replace(/\s+/g, ' ').trim()
  let clause = t.split(/[,;.(]| — | – /)[0].trim()
  clause = clause.replace(/^(?:our [\w-]+ (?:is|are)|we (?:are|currently have|have)(?: in| a| an)?|about|it is|it's|there (?:is|are))\s+/i, '')
  clause = clause.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|hundred)\b/gi, w => NUM[w.toLowerCase()])
  // Long clauses lose their place ("… in the hills of La Cabanga") and, when they count things, their second half
  if (clause.length > 36) clause = clause.replace(/\s+in (?:the |a )?[\p{L} ,'-]+$/u, '')
  if (clause.length > 30 && /\d/.test(clause) && / and /.test(clause)) clause = clause.slice(0, clause.indexOf(' and '))
  clause = clause.replace(/^\p{Ll}/u, c => c.toUpperCase())
  return clause.length > 44 ? clause.slice(0, clause.lastIndexOf(' ', 42)) + '…' : clause
}

/** "Protopia Community — a regenerative farm…" → { name: 'Protopia', tagline: 'A regenerative farm…' } */
export function splitName(projectName: string | null, fallback: string) {
  if (!projectName) return { name: fallback, tagline: null as string | null }
  const m = projectName.match(/^(.{2,40}?)\s+[—–-]\s+([\s\S]+)$/)
  if (m) return { name: m[1].replace(/\s+Community$/i, '').trim(), tagline: m[2].trim().replace(/^\p{Ll}/u, c => c.toUpperCase()) }
  return projectName.length <= 40 ? { name: projectName, tagline: null } : { name: fallback, tagline: projectName }
}


/** A tile at a glance: a label, a figure you can take in at once, one line that says what it means, and where
 *  the whole answer is on the page. */
export type GlanceTone = 'green' | 'violet' | 'blue' | 'yellow' | 'red'
export type GlanceTile = { label: string; value: string; note: string | null; target: string; tone: GlanceTone }

const digits = (w: string) => NUM[w.toLowerCase()] ?? w
const COUNT = '(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)'

/**
 * The tiles under the About photo, read from the Blueprint (Sonia, 20 Nov: tiles, but "make it make sense for
 * the content"). Each one leads with a figure (14 ha, ~30, 22–30°C, 2019) and says what it is in a line; a tile
 * whose answer has no figure shows the answer's short form, and one with no answer is left out.
 */
export function glance(s: (k: string) => string | null): GlanceTile[] {
  const tiles: GlanceTile[] = []
  // Each tile has its own soft colour (Sonia, 20 Nov), by what it is about: land and power green, people violet,
  // sleeping blue, climate yellow, the year red
  const TONE: Record<string, GlanceTone> = { 'The land': 'green', People: 'violet', 'Places to sleep': 'blue', Homes: 'blue', Climate: 'yellow', Since: 'red', 'Off-grid': 'green' }
  const add = (label: string, value: string | null | undefined, note: string | null, target: string) => { if (value) tiles.push({ label, value, note, target, tone: TONE[label] ?? 'blue' }) }

  // The land: its size, and how much of it is forest
  const land = s('land_size'), dev = s('land_dev_pct')
  const size = land?.match(/(\d[\d.,]*)[\s-]*(hectares?|ha\b|acres?)/i)
  const forest = dev?.match(/(\d+)\s*%[^.;]*?primary forest/i)?.[1], refo = dev?.match(/reforested\s+(\d+)\s*%|(\d+)\s*%\s+(?:is\s+)?reforested/i)
  const forestNote = [forest && `${forest}% primary forest`, refo && `${refo[1] ?? refo[2]}% reforested`].filter(Boolean).join(' · ') || null
  if (land) add('The land', size ? `${size[1]} ${/^h/i.test(size[2]) ? 'ha' : 'acres'}` : fact(land), forestNote, 'fact-land_size')

  // People: how many at a time (the label already says people, so the line is the rest: "at a time")
  const ppl = s('community_size') ?? s('density_target')
  const p = ppl?.match(/\b(about|around|roughly|up to)?\s*(\d+(?:\s*[–-]\s*\d+)?)\s+(people|members|residents)\b([^.,;:(]*)/i)
  if (ppl) add('People', p ? `${p[1] && !/up to/i.test(p[1]) ? '~' : ''}${p[2].replace(/\s+/g, '')}` : fact(ppl), p ? (p[4].replace(/\s+/g, ' ').trim() || p[3].toLowerCase()) : null, s('community_size') ? 'fact-community_size' : 'live')

  // Homes: what you can sleep in (rooms, cabins, dorms…), the first as the figure, the rest in the line
  const homesText = [s('community_size'), s('planned_homes')].filter(Boolean).join(' ')
  const seen = new Set<string>(), kinds: string[] = []
  for (const m of homesText.matchAll(new RegExp(`\\b${COUNT}\\s+(?:private\\s+|small\\s+)?(rooms?|cabins?|dorms?|dormitories|dormitory|houses?|homes?|tiny homes?|apartments?)\\b(?:\\s+with\\s+${COUNT}\\s+beds\\s+each)?`, 'gi'))) {
    const noun = m[2].toLowerCase().replace(/^dormitor(?:y|ies)$/, 'dorms').replace(/^dorm$/, 'dorms')
    const key = noun.replace(/s$/, '')
    if (seen.has(key)) continue
    seen.add(key)
    const n = digits(m[1]), one = n === '1'
    kinds.push(`${n} ${one ? noun.replace(/s$/, '') : noun.replace(/([^s])$/, '$1s')}${m[3] ? ` of ${digits(m[3])} beds` : ''}`)
  }
  if (kinds.length) add('Places to sleep', kinds[0], kinds.slice(1).join(' · ') || null, s('planned_homes') ? 'fact-planned_homes' : 'fact-community_size')
  else if (s('planned_homes')) add('Homes', fact(s('planned_homes')), null, 'fact-planned_homes')

  // Climate: the temperature range, and what it feels like
  const cl = s('climate')
  const temp = cl?.match(/(\d+\s*[–-]\s*\d+)\s*°\s*([CF])/)
  const feel = cl?.match(/\b(?:is|are|:)\s+((?:[a-z]+,\s+)*[a-z]+\s+and\s+[a-z]+)\b/)?.[1]
  if (cl) add('Climate', temp ? `${temp[1].replace(/\s+/g, '').replace('-', '–')}°${temp[2]}` : fact(cl), temp ? (feel ?? null) : null, 'fact-climate')

  // Since: the year it began
  const began = [land, s('why_now'), s('dream_origin')].find(t => t && /\b(19|20)\d{2}\b/.test(t))
  const year = began?.match(/\b(?:19|20)\d{2}\b/)?.[0]
  if (year) add('Since', year, /bought|purchased/i.test(began!) ? 'when we bought the land' : 'when it began', 'story')

  // Off the grid: power and water of our own
  const en = s('energy_source'), wa = s('water_fresh')
  const panels = en?.match(new RegExp(`\\b${COUNT}\\s+(?:installed\\s+)?solar panels`, 'i'))
  const spring = wa && /spring/i.test(wa)
  if (en && /off-grid|independent/i.test(en + (wa ?? ''))) add('Off-grid', 'Solar', [panels && `${digits(panels[1])} panels`, spring && 'spring water'].filter(Boolean).join(' · ') || null, 'land')

  return tiles
}
