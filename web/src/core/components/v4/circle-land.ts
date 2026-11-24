// Circle seals "Of this land" (design/decisions.md #32–#33; design/icons.md › Circle seals). Plants, fire and water
// from Protopia instead of everyday objects, drawn bigger on the seal. Shown in place of the stamps in
// circle-glyphs.ts while the design review is on (CircleSeal.tsx); a circle keeps its `circles.icon` key, so the
// key names the old object (`pot`) and the art here is what that circle gets now (papaya).
//
// How to draw one: 100×100, centre 50 50; the seal clips anything past its edge. Shapes are solid cream; a cut in
// the circle's colour is a fill (`c`) or a 2.2–3 line (`cs`); a cream line (`ks`) is 4–7.5 wide so it survives
// 16px. Check every one at 16px inside a tag (design/seals/land-sheet.mjs). No imports here, so that script can
// read this file with plain node.

const K = '#F3EAD7'
const RL = 'stroke-linecap="round" stroke-linejoin="round"'
/** cream shape */
const k = (d: string, x = '') => `<path d="${d}" fill="${K}"${x}/>`
/** cream line */
const ks = (d: string, w: number) => `<path d="${d}" fill="none" stroke="${K}" stroke-width="${w}" ${RL}/>`
/** shape cut out in the circle's colour */
const c = (d: string) => `<path d="${d}" style="fill:var(--seal)"/>`
/** line cut out in the circle's colour */
const cs = (d: string, w: number) => `<path d="${d}" style="fill:none;stroke:var(--seal)" stroke-width="${w}" ${RL}/>`
/** cream shape with a cut edge in the circle's colour, so touching shapes stay apart */
const ke = (d: string, w: number, x = '') => `<path d="${d}" fill="${K}" style="stroke:var(--seal)" stroke-width="${w}" stroke-linejoin="round"${x}/>`
const dot = (x: number, y: number, r: number, cut = false) => cut
  ? `<circle cx="${x}" cy="${y}" r="${r}" style="fill:var(--seal)"/>`
  : `<circle cx="${x}" cy="${y}" r="${r}" fill="${K}"/>`
const turn = (n: number, f: (a: number) => string) => Array.from({ length: n }, (_, i) => f(i * 360 / n)).join('')

const FLAME = 'M50 10C58 25 73 33 73 52A23 23 0 0 1 27 52C27 42 33 37 37 29C39 37 43 40 46 40C44 30 46 19 50 10Z'
const CORE = 'M50 45C56 52 61 56 61 63A11 11 0 0 1 39 63C39 56 45 53 50 45Z'

/** Keyed like CIRCLE_GLYPHS (circles.icon). */
export const LAND_GLYPHS = {
  /** Vision / Strategy: a fern unrolling */
  spiral: ks('M56 90C56 70 74 62 74 44A22 22 0 0 0 30 44A15 15 0 0 0 60 44A9 9 0 0 0 42 44A4.5 4.5 0 0 0 51 44', 7.5)
    + `<ellipse cx="76" cy="66" rx="7.5" ry="3.4" fill="${K}" transform="rotate(-28 76 66)"/><ellipse cx="69" cy="78" rx="7.5" ry="3.4" fill="${K}" transform="rotate(-20 69 78)"/><ellipse cx="50" cy="76" rx="6.5" ry="3.2" fill="${K}" transform="rotate(200 50 76)"/>`,
  /** Farming: a leaf, torn by the weather */
  wheat: `<g transform="rotate(28 50 50)">${k('M50 8C74 24 78 58 50 86C22 58 26 24 50 8Z')}${ks('M50 84V97', 5.5)}${cs('M50 16V84', 2.6)}`
    + [32, 44, 56, 68].map(y => cs(`M50 ${y}L${y < 40 ? 64 : 69} ${y - 11}M50 ${y}L${y < 40 ? 36 : 31} ${y - 11}`, 2.2)).join('')
    + `${c('M73 47l-10 2 9 4zM28 58l10-3-8-4z')}</g>`,
  /** Infrastructure: bamboo, what Protopia builds with */
  hammer: `<g transform="rotate(-9 50 50)">`
    + [[29, 30], [50, 14], [71, 34]].map(([x, top]) =>
      k(`M${x - 6} ${top + 6}A6 6 0 0 1 ${x + 6} ${top + 6}V98H${x - 6}Z`)
      + cs([top + 26, top + 54].filter(y => y < 90).map(y => `M${x - 7} ${y}H${x + 7}`).join(''), 3.2)).join('')
    + k('M60 22C68 13 80 10 92 13C84 22 72 25 60 22Z') + k('M27 34C20 27 10 26 2 30C9 37 19 38 27 34Z') + `</g>`,
  /** Kitchen: a papaya, cut open */
  pot: `<g transform="rotate(-18 50 50)">${k('M50 9C61 9 65 24 70 39C77 58 71 87 50 89C29 87 23 58 30 39C35 24 39 9 50 9Z')}${c('M50 33C59 38 63 52 61 64C59 77 41 77 39 64C37 52 41 38 50 33Z')}`
    + [[50, 45], [45.5, 53], [54.5, 53], [50, 60], [44.5, 65], [55.5, 65], [50, 70]].map(([x, y]) => dot(x, y, 2.5)).join('') + `</g>`,
  /** Hospitality: a hibiscus, the welcome flower */
  key: turn(5, a => ke('M50 50C35 40 33 20 50 11C67 20 65 40 50 50Z', 2.2, ` transform="rotate(${a} 50 50)"`))
    + dot(50, 50, 5.5, true) + cs('M50 50V25', 2.6) + dot(50, 23, 2.6, true) + dot(45.5, 27, 2.2, true) + dot(54.5, 27, 2.2, true),
  /** Community Hosting: a bonfire */
  fire: k(FLAME) + c(CORE) + ks('M27 80L73 90M73 80L27 90', 7),
  /** Marketing and communications: a trumpet flower (floripondio), the land's own horn */
  megaphone: ks('M22 9C36 7 48 12 50 24', 5) + k('M20 12C12 6 4 8 0 14C8 20 15 19 20 12Z')
    + k('M43.5 22H56.5L55 38H45Z')
    + k('M44 36C44 52 38 63 25 77L33 80L41 76L50 85L59 76L67 80L75 77C62 63 56 52 56 36Z')
    + cs('M50 42V78M47 48C46 60 42 68 36 76M53 48C54 60 58 68 64 76', 2.4),
  /** Finance: a cacao pod (cacao beans were money here) */
  coins: `<g transform="translate(50 52) scale(.84) translate(-50 -50) rotate(-25 50 50)">${k('M50 10C66 15 73 34 73 52C73 74 63 89 50 93C37 89 27 74 27 52C27 34 34 15 50 10Z')}${cs('M41 19C35 40 35 68 42 86M59 19C65 40 65 68 58 86M50 12V91', 2.4)}${ks('M50 10V1', 5)}</g>`,
  /** Cleaning: clean water */
  broom: k('M48 12C60 30 74 45 74 62A26 26 0 0 1 22 62C22 45 36 30 48 12Z') + cs('M33 62A15 15 0 0 0 45 77', 4)
    + k('M76 14C80 21 84 25 84 30A8 8 0 0 1 68 30C68 25 72 21 76 14Z'),
  /** Art: a feather */
  brush: `<g transform="rotate(-32 50 50)">${k('M52 4C62 18 62 40 56 60C53 70 52 76 52 80H48C48 76 47 70 44 60C38 40 40 18 52 4Z')}${ks('M50 78V98', 4.5)}${cs('M51 12C51 40 50 60 50 82', 2.2)}`
    + [22, 31, 40, 49, 58].map(y => cs(`M51 ${y + 7}L58 ${y}M50.5 ${y + 9}L44 ${y + 2}`, 1.8)).join('')
    + `${c('M43 46l9 5-8 2z')}</g>`,
  /** Community management: the ceiba, the gathering tree */
  ring: k('M45 94C47 82 48 66 48 50H52C52 66 53 82 55 94Z') + ks('M45 94C40 91 32 91 26 94M55 94C60 91 68 91 74 94M50 58L38 48M50 62L63 50', 4)
    + [[28, 42, 13], [50, 30, 17], [72, 42, 13], [39, 48, 11], [61, 48, 11], [38, 30, 11], [62, 30, 11]].map(([x, y, r]) => dot(x, y, r)).join(''),
  /** Incubator: a seed opening */
  egg: k('M50 94C33 94 25 82 27 68C29 56 39 50 50 50C61 50 71 56 73 68C75 82 67 94 50 94Z') + cs('M50 52L45 64L55 74L48 92', 3)
    + ks('M50 52V30', 5) + k('M50 38C39 38 29 31 27 18C40 17 49 25 50 38Z') + k('M50 31C59 29 67 20 68 9C57 9 50 18 50 31Z'),
  /** Shop: a basket of fruit from the land */
  bag: [[35, 42, 11], [66, 44, 10], [51, 36, 12]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${K}" style="stroke:var(--seal)" stroke-width="2.4"/>`).join('')
    + k('M51 24C52 16 58 11 66 11C64 19 58 23 51 24Z')
    + ke('M16 50H84L75 85C74 89 71 91 67 91H33C29 91 26 89 25 85Z', 2.4) + cs('M21 63H79M24 76H76', 3),
} as const

/** What each seal shows, for the pickers and /design. */
export const LAND_LABEL: Record<keyof typeof LAND_GLYPHS, string> = {
  spiral: 'Fern', wheat: 'Torn leaf', hammer: 'Bamboo', pot: 'Papaya', key: 'Hibiscus', fire: 'Bonfire',
  megaphone: 'Trumpet flower', coins: 'Cacao pod', broom: 'Water', brush: 'Feather', ring: 'Ceiba tree',
  egg: 'Seed opening', bag: 'Basket of fruit',
}
