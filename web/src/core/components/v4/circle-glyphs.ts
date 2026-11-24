import { DESIGN_REVIEW } from '@/core/lib/instance'
import { LAND_LABEL } from './circle-land'

// Circle glyphs for the circle seals (DESIGN-SYSTEM.md › v4 › Circles). They are stamps, not line icons:
// solid cream shapes on the circle's colour, with details cut out in that colour. That keeps them apart
// from the interface icons (icons.ts), which are thin ink lines. 24×24. A circle picks one in
// `circles.icon`; the Blueprint and Circles pickers list them all. Add a glyph here, never an emoji.
//
// How to draw one: every shape is solid cream by default (the seal fills and outlines it with a round
// 1.4 line, which softens the corners). `class="l"` is a cream line (a handle, steam, a stem);
// `class="c"` is a line cut out in the circle's colour; `class="h"` is a hole in the circle's colour.

/** The seal itself: a hand-drawn round, 40×40. */
export const SEAL_PATH = 'M20 2.6C30.6 2.2 37.9 9.7 37.5 20.4 37.1 30.7 29.7 37.7 19.5 37.5 9.3 37.3 2.3 30.1 2.5 19.7 2.7 9.5 9.9 3 20 2.6Z'

/** The cream of the stamp. */
export const SEAL_INK = '#F3EAD7'

export const CIRCLE_GLYPHS = {
  /** a spiral (vision, the whole) */
  spiral: "<path class=\"l\" stroke-width=\"2.7\" d=\"M12.5 12a1.5 1.5 0 0 1-3 0 3.5 3.5 0 0 1 7 0 5.5 5.5 0 0 1-11 0 7.5 7.5 0 0 1 13.4-4.6\"/>",
  /** a wheat ear (farming) */
  wheat: "<path class=\"l\" stroke-width=\"2\" d=\"M12 22v-9\"/><path d=\"M12 7.6c-1.7-1.9-1.7-4.2 0-6.1 1.7 1.9 1.7 4.2 0 6.1z\"/><path d=\"M11.4 12.4c-3-.1-4.9-2-5.2-5 3 .1 4.9 2 5.2 5zM12.6 12.4c3-.1 4.9-2 5.2-5-3 .1-4.9 2-5.2 5z\"/><path d=\"M11.4 17.6c-3-.1-4.9-2-5.2-5 3 .1 4.9 2 5.2 5zM12.6 17.6c3-.1 4.9-2 5.2-5-3 .1-4.9 2-5.2 5z\"/>",
  /** a hammer (building, repair) */
  hammer: "<g transform=\"rotate(-45 12 12)\"><path d=\"M5.5 3.2h10.2c1.9 0 3.3 1.4 3.3 3.2v1.8h-3.6V10H5.5z\"/><path class=\"l\" stroke-width=\"3\" d=\"M10.4 10.5v11.3\"/></g>",
  /** a pot with steam (kitchen) */
  pot: "<path d=\"M4.5 10.5h15V16a4.5 4.5 0 0 1-4.5 4.5H9A4.5 4.5 0 0 1 4.5 16z\"/><path class=\"l\" stroke-width=\"2.2\" d=\"M4.5 13.2H2.4M19.5 13.2h2.1\"/><path class=\"c\" d=\"M7.2 13.6h9.6\"/><path class=\"l\" stroke-width=\"1.9\" d=\"M9.6 7.4c-1-1.2 1-2.2 0-3.7M14.4 7.4c-1-1.2 1-2.2 0-3.7\"/>",
  /** a key (arrivals, rooms) */
  key: "<circle cx=\"8.2\" cy=\"8.2\" r=\"5\"/><circle class=\"h\" cx=\"7\" cy=\"7\" r=\"1.7\"/><path class=\"l\" stroke-width=\"2.7\" d=\"M11.8 11.8l8.4 8.4\"/><path class=\"l\" stroke-width=\"2.3\" d=\"M16 16l2.4-2.4M19.2 19.2l1.9-1.9\"/>",
  /** a fire (gatherings) */
  fire: "<path d=\"M12 2.2c3.5 3 5.4 5.9 5.4 8.8a5.4 5.4 0 0 1-10.8 0c0-1.8.7-3.3 1.9-4.4.3 1.4 1 2.2 2.1 2.6-.4-2.7.1-5 1.4-7z\"/><path class=\"h\" d=\"M12 14.3c1.1 0 1.9-.8 1.9-1.9 0-1-.7-1.9-1.9-3-1.2 1.1-1.9 2-1.9 3 0 1.1.8 1.9 1.9 1.9z\"/><path class=\"l\" stroke-width=\"2.4\" d=\"M4.6 21.6l14.8-3.2M19.4 21.6 4.6 18.4\"/>",
  /** a megaphone (telling the story) */
  megaphone: "<path d=\"M3.2 9.6v4.8h3.6l8.4 5V4.6l-8.4 5z\"/><path class=\"c\" d=\"M7 10v4\"/><path class=\"l\" stroke-width=\"2.4\" d=\"M7.4 15.4l1.2 4.8\"/><path class=\"l\" stroke-width=\"2.1\" d=\"M18.6 9a4.4 4.4 0 0 1 0 6\"/>",
  /** a stack of coins (money) */
  coins: "<path d=\"M5 7.2c0-1.8 3.1-3.2 7-3.2s7 1.4 7 3.2v9.6c0 1.8-3.1 3.2-7 3.2s-7-1.4-7-3.2z\"/><path class=\"c\" d=\"M5.2 8c.6 1.5 3.4 2.6 6.8 2.6s6.2-1.1 6.8-2.6M5.2 11.8c.6 1.5 3.4 2.6 6.8 2.6s6.2-1.1 6.8-2.6M5.2 15.6c.6 1.5 3.4 2.6 6.8 2.6s6.2-1.1 6.8-2.6\"/>",
  /** a broom (cleaning) */
  broom: "<g transform=\"rotate(45 12 12)\"><path class=\"l\" stroke-width=\"2.5\" d=\"M12 1.6v8.4\"/><path d=\"M9.2 10.2h5.6l2.4 9.2H6.8z\"/><path class=\"c\" d=\"M8.6 12.9h6.8M10.2 15.4l-.5 4M13.8 15.4l.5 4\"/></g>",
  /** a loaded brush (art) */
  brush: "<path class=\"l\" stroke-width=\"2.7\" d=\"M20.6 3.4 12.8 11.2\"/><path d=\"M11.2 12.2c-1.8-1.6-4.4-1.1-5.5.7-1.2 2-.5 3.9-2.3 6.8 3.8.5 6.9-.6 8.2-2.7 1.1-1.7 1.2-3.4-.4-4.8z\"/><circle cx=\"18\" cy=\"16.6\" r=\"1.5\"/><circle cx=\"15.4\" cy=\"20.2\" r=\"1\"/>",
  /** people in a ring (community) */
  ring: "<circle cx=\"12\" cy=\"5.6\" r=\"2.9\"/><circle cx=\"5.2\" cy=\"16.8\" r=\"2.9\"/><circle cx=\"18.8\" cy=\"16.8\" r=\"2.9\"/><path class=\"l\" stroke-width=\"2.1\" d=\"M7.6 7.4a8 8 0 0 0-3 5.2M16.4 7.4a8 8 0 0 1 3 5.2M9 19.8a8 8 0 0 0 6 0\"/>",
  /** an egg hatching (new ideas) */
  egg: "<path d=\"M12 21.6c-3.9 0-6.5-2.8-6.5-6.7 0-4.6 2.9-8.7 6.5-8.7s6.5 4.1 6.5 8.7c0 3.9-2.6 6.7-6.5 6.7z\"/><path class=\"c\" d=\"M5.6 13.9l2.7 1.5 1.85-1.9L12 15.4l1.85-1.9 1.85 1.9 2.7-1.5\"/><path class=\"l\" stroke-width=\"1.9\" d=\"M12 6.2V3\"/><path d=\"M12.4 4c1-1.6 2.6-2.1 4.3-1.7-.7 1.6-2.3 2.1-4.3 1.7z\"/>",
  /** a shopping bag (shop) */
  bag: "<path d=\"M4.6 9h14.8l-1.3 10.6a1.8 1.8 0 0 1-1.8 1.6H7.7a1.8 1.8 0 0 1-1.8-1.6z\"/><path class=\"l\" stroke-width=\"2\" d=\"M8.8 9V6.8a3.2 3.2 0 0 1 6.4 0V9\"/><circle class=\"h\" cx=\"8.8\" cy=\"12.4\" r=\"1.1\"/><circle class=\"h\" cx=\"15.2\" cy=\"12.4\" r=\"1.1\"/>",
} as const

export type CircleGlyph = keyof typeof CIRCLE_GLYPHS

/** What each glyph stands for, shown under it in the pickers. */
export const CIRCLE_GLYPH_LABEL: Record<CircleGlyph, string> = {
  spiral: 'Spiral', wheat: 'Wheat', hammer: 'Hammer', pot: 'Pot', key: 'Key', fire: 'Fire', megaphone: 'Megaphone',
  coins: 'Coins', broom: 'Broom', brush: 'Brush', ring: 'Ring of people', egg: 'Egg', bag: 'Bag',
}

/** The name shown for a glyph: with the design review on, what its "Of this land" seal draws (circle-land.ts). */
export function glyphLabel(g: CircleGlyph): string {
  return DESIGN_REVIEW ? LAND_LABEL[g] : CIRCLE_GLYPH_LABEL[g]
}

export function isCircleGlyph(v: unknown): v is CircleGlyph {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(CIRCLE_GLYPHS, v)
}

// First match wins, so the more specific words come first
const GLYPH_HINTS: [RegExp, CircleGlyph][] = [
  [/kitchen|cook|meal|food prep/, 'pot'],
  [/farm|food|garden|agri|land|ecolog|forest/, 'wheat'],
  [/build|infra|construct|repair|mainten|energy|water|workshop/, 'hammer'],
  [/hospital|guest|accommod|arrival|room|welcome|housing/, 'key'],
  [/host|gather|ceremon|ritual|space.?hold|event|culture/, 'fire'],
  [/shop|store|market.?place|trade|sales/, 'bag'],
  [/market|comm(unication)?s\b|communication|media|story|outreach/, 'megaphone'],
  [/financ|money|budget|econom|treasur|legal|fund/, 'coins'],
  [/clean|care.?tak|housekeep/, 'broom'],
  [/\bart|craft|creativ|design|music/, 'brush'],
  [/incubat|innovat|idea|learn|educat|school|research/, 'egg'],
  [/communit|member|people|wellbeing|care|social|governance/, 'ring'],
  [/vision|strateg|steward|core|council/, 'spiral'],
]

/** A fitting glyph for a new circle, from its name ("Kitchen" → pot); null when nothing fits (the initial shows). */
export function glyphFor(name: string): CircleGlyph | null {
  const n = name.toLowerCase()
  return GLYPH_HINTS.find(([re]) => re.test(n))?.[1] ?? null
}
