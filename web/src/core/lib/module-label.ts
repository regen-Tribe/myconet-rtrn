import { DESIGN } from './instance'

/**
 * Module numbers ("M01 · Members", "Module 07 · Operations") show in the current look only.
 * The v4 look has none (DESIGN-SYSTEM.md › v4): there the label is just the name.
 * Number-only badges use the `mod-num` class instead, hidden under v4 in globals.css.
 */
export const SHOW_MODULE_NUMBERS = DESIGN !== 'v4'

export const modLabel = (num: string, text: string, prefix: 'M' | 'Module' = 'M'): string =>
  SHOW_MODULE_NUMBERS ? `${prefix === 'Module' ? 'Module ' : 'M'}${num} · ${text}` : text
