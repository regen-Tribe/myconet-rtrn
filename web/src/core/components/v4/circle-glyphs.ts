// Circle glyphs for the circle seals (DESIGN-SYSTEM.md › v4 › Circles): drawn in the marker line,
// 24×24, stroke only, cream on the circle's colour. A circle picks one in `circles.icon`; the
// Blueprint and admin pickers list them all. Add a glyph here, never an emoji.

/** The seal itself: a hand-drawn round, 40×40. */
export const SEAL_PATH = 'M20 2.6C30.6 2.2 37.9 9.7 37.5 20.4 37.1 30.7 29.7 37.7 19.5 37.5 9.3 37.3 2.3 30.1 2.5 19.7 2.7 9.5 9.9 3 20 2.6Z'

/** The cream of the line. */
export const SEAL_INK = '#F3EAD7'

export const CIRCLE_GLYPHS = {
  /** a spiral (vision, the whole) */
  spiral: "<path d=\"M11.7 12L11.5 11.9L11.4 11.7L11.4 11.5L11.5 11.3L11.6 11L11.8 10.8L12.2 10.7L12.5 10.6L13 10.7L13.4 10.8L13.8 11.1L14.1 11.5L14.3 12L14.4 12.5L14.3 13.1L14.1 13.7L13.7 14.3L13.1 14.7L12.4 15L11.7 15.2L10.8 15.1L10 14.9L9.2 14.5L8.6 13.8L8.1 13L7.8 12.1L7.7 11.1L7.9 10.1L8.4 9.1L9.2 8.2L10.1 7.6L11.3 7.1L12.5 7L13.8 7.1L15 7.5L16.2 8.2L17.1 9.2L17.8 10.4L18.2 11.8L18.2 13.3L17.8 14.7L17.1 16.1L16 17.2L14.7 18.1L13.1 18.7L11.4 18.9L9.6 18.7L8 18.1L6.5 17.1L5.2 15.8L4.4 14.1L3.9 12.3L3.9 10.4L4.4 8.6L5.3 6.8L6.7 5.3L8.5 4.2L10.5 3.5L12.7 3.2L14.9 3.5\"/>",
  /** a wheat stalk (farming) */
  wheat: "<path d=\"M12 21.5V7.5\"/><path d=\"M12 7.5c-1.1-1.3-1.1-3.2 0-4.8 1.1 1.6 1.1 3.5 0 4.8z\"/><path d=\"M12 11.5c-2.6-.2-4-2-4.2-4.3 2.6.2 4 2 4.2 4.3zM12 11.5c2.6-.2 4-2 4.2-4.3-2.6.2-4 2-4.2 4.3z\"/><path d=\"M12 15.8c-2.6-.2-4-2-4.2-4.3 2.6.2 4 2 4.2 4.3zM12 15.8c2.6-.2 4-2 4.2-4.3-2.6.2-4 2-4.2 4.3z\"/>",
  /** a hammer (building, repair) */
  hammer: "<rect x=\"4\" y=\"5.2\" width=\"11\" height=\"5\" rx=\"1.6\" transform=\"rotate(-45 9.5 7.7)\"/><path d=\"M11.6 9.8 19.8 18.4\"/>",
  /** a pot with steam (kitchen) */
  pot: "<path d=\"M5 11h14v5.5a3.5 3.5 0 0 1-3.5 3.5h-7A3.5 3.5 0 0 1 5 16.5z\"/><path d=\"M5 13.5H3M19 13.5h2M7.5 11c0-1.7 2-2.6 4.5-2.6s4.5.9 4.5 2.6\"/><path d=\"M10 6c-.7-.9.7-1.8 0-2.8M14 6c-.7-.9.7-1.8 0-2.8\"/>",
  /** a key (arrivals, rooms) */
  key: "<circle cx=\"8\" cy=\"8.5\" r=\"4.5\"/><path d=\"M11.3 11.8 20 20.5M16.3 16.8l2.2-2.2M18.4 18.9l1.8-1.8\"/>",
  /** a fire (gatherings) */
  fire: "<path d=\"M12 3c3 2.8 4.6 5.4 4.6 8a4.6 4.6 0 0 1-9.2 0c0-1.6.6-2.9 1.6-3.9.3 1.3 1 2 2 2.3-.4-2.5 0-4.6 1-6.4z\"/><path d=\"M4 21l16-3.6M20 21 4 17.4\"/>",
  /** a megaphone (telling the story) */
  megaphone: "<path d=\"M4 10v4h3l8 4.5V5.5L7 10z\"/><path d=\"M18.5 9.5a3.5 3.5 0 0 1 0 5M7 14l1.5 5.5\"/>",
  /** a stack of coins (money) */
  coins: "<ellipse cx=\"12\" cy=\"6.5\" rx=\"6.5\" ry=\"2.6\"/><path d=\"M5.5 6.5v11c0 1.4 2.9 2.6 6.5 2.6s6.5-1.2 6.5-2.6v-11M5.5 10.2c0 1.4 2.9 2.6 6.5 2.6s6.5-1.2 6.5-2.6M5.5 13.9c0 1.4 2.9 2.6 6.5 2.6s6.5-1.2 6.5-2.6\"/>",
  /** a broom (cleaning) */
  broom: "<path d=\"M20 3.5 13 10.5\"/><path d=\"M10.6 8.6l4.3 4.3-1.4 1.4c-2.1 2.1-5.2 4.6-9.5 5.2.6-4.3 3.1-7.4 5.2-9.5z\"/><path d=\"M8.2 15.3 5.6 17.9M10.4 16.8l-2 2\"/>",
  /** a loaded brush (art) */
  brush: "<path d=\"M20.5 3.5 11.8 12.2\"/><path d=\"M10 10.5l3.5 3.5\"/><path d=\"M10.6 12.6c-1.6-1.4-4-1-5 .6-1.1 1.8-.4 3.6-2.1 6.3 3.5.4 6.3-.6 7.5-2.5 1-1.5 1.1-3.1-.4-4.4z\"/>",
  /** people in a ring (community) */
  ring: "<circle cx=\"12\" cy=\"5.5\" r=\"2.3\"/><circle cx=\"5\" cy=\"16.5\" r=\"2.3\"/><circle cx=\"19\" cy=\"16.5\" r=\"2.3\"/><path d=\"M8.2 6.8a8 8 0 0 0-3.6 6.2M15.8 6.8a8 8 0 0 1 3.6 6.2M8.3 20a8 8 0 0 0 7.4 0\"/>",
  /** an egg hatching (new ideas) */
  egg: "<path d=\"M12 21c-3.7 0-6.2-2.7-6.2-6.4 0-4.4 2.8-8.6 6.2-8.6s6.2 4.2 6.2 8.6c0 3.7-2.5 6.4-6.2 6.4z\"/><path d=\"M6.3 13.6l2.3 1.4 1.8-1.8 1.8 1.8 1.8-1.8 1.8 1.8 2-1.3\"/><path d=\"M12 6V3\"/><path d=\"M12 4.2c.9-1.5 2.4-2 4-1.6-.6 1.5-2.1 2-4 1.6z\"/>",
  /** a shopping bag (shop) */
  bag: "<path d=\"M5 9h14l-1.2 10.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3z\"/><path d=\"M9 11.5V7a3 3 0 0 1 6 0v4.5\"/>",
} as const

export type CircleGlyph = keyof typeof CIRCLE_GLYPHS

export function isCircleGlyph(v: unknown): v is CircleGlyph {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(CIRCLE_GLYPHS, v)
}
