import { DESIGN_REVIEW } from '@/core/lib/instance'

/**
 * The design review's three icon sizes (design/icons.md › Sizes): 16 inline (beside words, in tags and
 * buttons), 20 in controls and list rows, 24 in tiles and headers. With "designReview" on, any number an
 * older screen passes snaps to the nearest of the three; without it, the number is kept. A size in text
 * units ("1.1em", InlineIcon) follows the text and is kept.
 */
export const ICON_SIZES = { inline: 16, control: 20, tile: 24 } as const

export function iconSize<T extends number | string>(size: T): T | number {
  if (!DESIGN_REVIEW || typeof size !== 'number') return size
  return size <= 17 ? ICON_SIZES.inline : size <= 21 ? ICON_SIZES.control : ICON_SIZES.tile
}
