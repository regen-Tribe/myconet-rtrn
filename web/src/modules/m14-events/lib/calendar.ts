/**
 * Date math for the calendar views. Everything works in the viewer's local
 * time zone, so call these only after mount (the server renders in UTC).
 */

import type { CalendarEvent } from '../types'

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** Weeks run Monday to Sunday */
export const WEEK_LABELS = [...DAY_LABELS.slice(1), DAY_LABELS[0]]

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  return addDays(x, -((x.getDay() + 6) % 7))
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** "2026-11-05" in local time — used as a map key. */
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** 42 days (6 weeks) covering the month that contains `anchor`. */
export function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

function eventEnd(e: CalendarEvent): Date {
  return e.ends_at ? new Date(e.ends_at) : new Date(e.starts_at)
}

/** Every local day an event touches (multi-day events appear on each day). */
export function eventDayKeys(e: CalendarEvent): string[] {
  const keys: string[] = []
  let d = startOfDay(new Date(e.starts_at))
  const last = startOfDay(eventEnd(e))
  // Cap so a bad end date can't spin forever
  for (let i = 0; d <= last && i < 62; i++, d = addDays(d, 1)) keys.push(dayKey(d))
  return keys
}

export function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    for (const k of eventDayKeys(e)) {
      const list = map.get(k)
      if (list) list.push(e)
      else map.set(k, [e])
    }
  }
  for (const list of map.values()) list.sort(compareEvents)
  return map
}

/** All-day first, then by start time. */
export function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  if (a.all_day !== b.all_day) return a.all_day ? -1 : 1
  return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
}

export function isPast(e: CalendarEvent, now: Date): boolean {
  return eventEnd(e) < (e.all_day ? startOfDay(now) : now)
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function fmtDayLong(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function fmtMonthTitle(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function fmtWeekTitle(anchor: Date): string {
  const days = weekDays(anchor)
  const a = days[0], b = days[6]
  const sameMonth = a.getMonth() === b.getMonth()
  const left = a.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  // { day, year } alone prints "2026 (day: 22)" in some browsers, so the same-month end is written by hand
  const right = sameMonth ? `${b.getDate()}, ${b.getFullYear()}` : b.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${left} – ${right}`
}

/** "Thu, Nov 5 · 6:00 PM – 8:00 PM", "All day · Thu, Nov 5", or a multi-day range. */
export function fmtEventWhen(e: CalendarEvent): string {
  const start = new Date(e.starts_at)
  const end = e.ends_at ? new Date(e.ends_at) : null
  const day = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  if (e.all_day) {
    return end && !sameDay(start, end) ? `${day(start)} – ${day(end)} · All day` : `${day(start)} · All day`
  }
  if (!end) return `${day(start)} · ${fmtTime(e.starts_at)}`
  if (sameDay(start, end)) return `${day(start)} · ${fmtTime(e.starts_at)} – ${fmtTime(e.ends_at!)}`
  return `${day(start)} ${fmtTime(e.starts_at)} – ${day(end)} ${fmtTime(e.ends_at!)}`
}

/** ISO → value for <input type="datetime-local"> in local time. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** ISO → value for <input type="date"> in local time. */
export function toLocalDateInput(iso: string | null): string {
  return iso ? dayKey(new Date(iso)) : ''
}
