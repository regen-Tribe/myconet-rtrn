import type { CalendarEvent } from '../types'
import { KIND_META } from './permissions'

/** An event takes its calendar's colour (Daily, Core, Community, Tasks); categories show as a dot */
export function eventColor(e: CalendarEvent): string {
  return KIND_META[e.kind]?.color ?? 'var(--m14)'
}

/** A steady colour per category name ("Food" is always the same colour); none clash with the calendars' */
const CATEGORY_COLORS = ['#d97706', '#0284c7', '#7c3aed', '#ca8a04', '#0d9488', '#9333ea']
export function categoryColor(category: string): string {
  const known: Record<string, string> = { food: '#d97706', movement: '#0284c7', 'focus hours': '#7c3aed', focus: '#7c3aed' }
  const key = category.trim().toLowerCase()
  if (known[key]) return known[key]
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return CATEGORY_COLORS[h % CATEGORY_COLORS.length]
}
