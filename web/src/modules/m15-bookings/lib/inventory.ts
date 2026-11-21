/**
 * Categories, permissions and formatting for the shared inventory.
 * Permissions mirror the `booking_items` / `bookings` RLS policies and the
 * `bookings_guard` trigger — the database has the final say.
 */

import { isJoiningOrAbove } from '@/core/lib/roles'
import type { IconName } from '@/core/components/v4/icons'
import type { Booking, BookingCategory, BookingItem, BookingStatus, PersonLite } from '../types'

export const CATEGORIES: BookingCategory[] = ['accommodation', 'tools', 'spaces']

export const CATEGORY_META: Record<BookingCategory, {
  label: string
  /** From the shared icon set (core/components/v4/icons.ts) */
  icon: IconName
  color: string
  /** Accommodation is booked by night (check-in/check-out dates); the rest by time. */
  unit: 'night' | 'time'
  suggestedTags: string[]
}> = {
  accommodation: { label: 'Accommodation', icon: 'bed', color: '#b45309', unit: 'night', suggestedTags: ['guest room', 'tent site', 'cabin', 'bunk', 'family'] },
  tools:         { label: 'Tools',         icon: 'wrench', color: '#0369a1', unit: 'time',  suggestedTags: ['power tools', 'garden', 'kitchen', 'vehicle', 'workshop'] },
  spaces:        { label: 'Spaces',        icon: 'building', color: '#7c3aed', unit: 'time',  suggestedTags: ['meeting room', 'kitchen', 'outdoor', 'studio', 'workshop'] },
}

export const STATUS_META: Record<BookingStatus, { label: string; color: string }> = {
  pending:   { label: 'Awaiting approval', color: '#d97706' },
  confirmed: { label: 'Confirmed',         color: '#16a34a' },
  declined:  { label: 'Declined',          color: '#dc2626' },
  cancelled: { label: 'Cancelled',         color: 'var(--ink-4)' },
}

/** The booking pages: accommodation on its own, everything else together, and with the v4 look
 *  one page for all of it, Amenities & tools (Sonia, 19 Nov). */
export type BookingScope = 'stays' | 'resources' | 'amenities'

export const SCOPE_META: Record<BookingScope, {
  num: string; label: string; heading: string; path: string; accent: string; categories: BookingCategory[]
}> = {
  stays:     { num: '15', label: 'Accommodation', heading: 'Stay in the community', path: '/accommodation',    accent: 'var(--m15)', categories: ['accommodation'] },
  resources: { num: '16', label: 'Resources',     heading: 'Community resources',   path: '/resources', accent: 'var(--m16)', categories: ['tools', 'spaces'] },
  amenities: { num: '',   label: 'Amenities & tools', heading: 'Amenities & tools', path: '/amenities', accent: 'var(--m15)', categories: ['accommodation', 'tools', 'spaces'] },
}

export const scopeForCategory = (c: BookingCategory): BookingScope => (c === 'accommodation' ? 'stays' : 'resources')

export const isCategory = (v: string | undefined): v is BookingCategory =>
  !!v && (CATEGORIES as string[]).includes(v)

/** Admins and circle leads add items to the inventory. */
export function canAddItems(role: string): boolean {
  return role === 'admin' || role === 'circle_lead'
}

/** Admin, or a circle lead when the item has no circle, is in their circles, or they added it. */
export function canManageItem(item: Pick<BookingItem, 'circle' | 'created_by'>, userId: string | null, role: string, leadCircles: string[]): boolean {
  if (!userId) return false
  if (role === 'admin') return true
  return role === 'circle_lead' && (!item.circle || leadCircles.includes(item.circle) || item.created_by === userId)
}

export const canBook = (role: string) => isJoiningOrAbove(role)

/** Pending and confirmed bookings hold the item. */
export const isHolding = (b: Booking) => b.status === 'pending' || b.status === 'confirmed'

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd
}

export function personName(p: PersonLite | null): string {
  return p?.first_name ?? p?.username ?? 'A member'
}

const day = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const time = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

/** "Thu, Nov 5 → Sun, Nov 8 · 3 nights" or "Thu, Nov 5 · 2:00 PM – 5:00 PM". Local time — call after mount. */
export function fmtBookingRange(b: Pick<Booking, 'starts_at' | 'ends_at'>, category: BookingCategory): string {
  const s = new Date(b.starts_at), e = new Date(b.ends_at)
  if (CATEGORY_META[category].unit === 'night') {
    const nights = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000))
    return `${day(s)} → ${day(e)} · ${nights} night${nights === 1 ? '' : 's'}`
  }
  return s.toDateString() === e.toDateString()
    ? `${day(s)} · ${time(s)} – ${time(e)}`
    : `${day(s)} ${time(s)} → ${day(e)} ${time(e)}`
}

/** Local "YYYY-MM-DD" / "YYYY-MM-DDTHH:MM" input values. */
export function localDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export function localDateTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${localDateInput(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Turn a Postgres / PostgREST error into something a member can act on. */
export function bookingErrorMessage(err: { code?: string; message: string }): string {
  if (err.code === '23P01') return 'That time overlaps an existing booking. Pick another time.'
  if (err.code === '42501') return 'You don’t have permission to do that.'
  return err.message
}
