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

