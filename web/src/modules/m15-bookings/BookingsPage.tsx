import { redirect } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/server'
import BookingsClient from './BookingsClient'
import { canAddItems, isCategory, SCOPE_META, type BookingScope } from './lib/inventory'
import { BOOKING_SELECT, ITEM_SELECT, toBooking, toItem } from './lib/queries'
import type { AroundPlace, BookingsTab } from './types'
import { NEAR } from '@/modules/m19-map/lib/places'

const TABS: BookingsTab[] = ['browse', 'mine', 'manage']

export type BookingsSearchParams = { tab?: string; category?: string; item?: string }

/** Shared loader for both booking modules; the scope picks which categories show. */
export async function renderBookings(scope: BookingScope, sp: BookingsSearchParams, opts: { admin?: boolean } = {}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role = 'explorer'
  let leadCircles: string[] = []
  let me: { first_name: string | null; username: string | null } | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, lead_circles, first_name, username')
      .eq('id', user.id)
      .maybeSingle()
    role = profile?.role ?? 'explorer'
    leadCircles = profile?.lead_circles ?? []
    me = { first_name: profile?.first_name ?? null, username: profile?.username ?? null }
  }

  // Admin › Bookings is for the people who answer booking requests
  if (opts.admin && !user) redirect('/auth/login')
  if (opts.admin && !canAddItems(role)) redirect('/dashboard')

  // RLS: everyone sees active items (leads also see archived); joining+ see the
  // whole schedule, explorers only their own bookings, visitors none
  const since = new Date(Date.now() - 90 * 86400000).toISOString()
  const [itemsRes, bookingsRes] = await Promise.all([
    supabase.from('booking_items').select(ITEM_SELECT).order('name'),
    user
      ? supabase.from('bookings').select(BOOKING_SELECT).gte('ends_at', since).order('starts_at')
      : Promise.resolve({ data: [] }),
  ])
  // The Amenities map (v4.43.0): read on their own, so a community that hasn't applied the
  // migration yet still gets its bookings page (just without the map)
  const [pinsRes, mapRes, placesRes] = await Promise.all([
    supabase.from('booking_items').select('id, map_x, map_y').not('map_x', 'is', null),
    supabase.from('community_settings').select('site_map_url').maybeSingle(),
    supabase.from('places').select('slug, name, photo_url, map_x, map_y').not('map_x', 'is', null),
  ])
  // Items' own photos (v4.76.0), read on their own for communities without the column yet
  const photosRes = await supabase.from('booking_items').select('id, photo_url').not('photo_url', 'is', null)
  const photos = new Map(((photosRes.error ? [] : photosRes.data) ?? []).map(p => [p.id as string, p.photo_url as string]))
  // More photos per item and per place (v4.109.0), also read on their own
  const [morePhotosRes, placePhotosRes] = await Promise.all([
    supabase.from('booking_items').select('id, photos'),
    supabase.from('places').select('slug, photos'),
  ])
  const more = new Map(((morePhotosRes.error ? [] : morePhotosRes.data) ?? []).map(p => [p.id as string, (p.photos as string[] | null) ?? []]))
  const placeMore = new Map(((placePhotosRes.error ? [] : placePhotosRes.data) ?? []).map(p => [p.slug as string, (p.photos as string[] | null) ?? []]))
  const pins = new Map(((pinsRes.error ? [] : pinsRes.data) ?? []).map(p => [p.id as string, p as { map_x: number; map_y: number }]))
  const siteMapUrl = mapRes.error ? null : ((mapRes.data as { site_map_url: string | null } | null)?.site_map_url ?? null)
  // Each item belongs to the place its pin sits in (the Map page, v4.70.0): the card shows that place's photo
  const places = ((placesRes.error ? [] : placesRes.data) ?? []) as { slug: string; name: string; photo_url: string | null; map_x: number; map_y: number }[]
  const placeAt = (x: number | null | undefined, y: number | null | undefined) => {
    if (x == null || y == null) return null
    let best: (typeof places)[number] | null = null
    let bestD = NEAR
    for (const p of places) {
      const d = Math.hypot(p.map_x - x, p.map_y - y)
      if (d <= bestD) { best = p; bestD = d }
    }
    return best ? { slug: best.slug, name: best.name, photo_url: best.photo_url, photos: placeMore.get(best.slug) ?? [] } : null
  }
  const items = (itemsRes.data ?? []).map(toItem).map(i => {
    const map_x = pins.get(i.id)?.map_x ?? null
    const map_y = pins.get(i.id)?.map_y ?? null
    return { ...i, map_x, map_y, photo_url: photos.get(i.id) ?? null, photos: more.get(i.id) ?? [], place: placeAt(map_x, map_y) }
  })
  // Places from the Map with no bookable thing of their own (v4.113.0): shown under Spaces, so the page lists
  // everything shared, not only what you book. One source: the `places` table, never a copy in booking_items.
  const aroundRes = scope === 'amenities' && !opts.admin
    ? await supabase.from('places').select('slug, name, kind, description, photo_url, map_x, map_y, sort_order').order('sort_order').order('name')
    : { data: [], error: null }
  const activeNames = new Set(items.filter(i => i.is_active).map(i => i.name.toLowerCase()))
  const around: AroundPlace[] = ((aroundRes.error ? [] : aroundRes.data) ?? [])
    // Only places with a picture: a card without one says little here (they are still on the Map)
    .filter(p => p.photo_url)
    .filter(p => !activeNames.has((p.name as string).toLowerCase()))
    .filter(p => !items.some(i => i.is_active && i.place?.slug === p.slug))
    .map(p => ({ slug: p.slug as string, name: p.name as string, kind: p.kind as string, description: (p.description as string | null) ?? null, photo_url: (p.photo_url as string | null) ?? null }))
  const inScope = (id: string | undefined) => items.some(i => i.id === id && SCOPE_META[scope].categories.includes(i.category))

  return (
    <BookingsClient
      scope={scope}
      initialItems={items}
      initialBookings={((bookingsRes as { data: unknown[] | null }).data ?? []).map(toBooking)}
      userId={user?.id ?? null}
      me={me}
      role={role}
      leadCircles={leadCircles}
      initialTab={TABS.find(t => t === sp.tab) ?? 'browse'}
      initialCategory={isCategory(sp.category) && SCOPE_META[scope].categories.includes(sp.category) ? sp.category : null}
      initialItemId={inScope(sp.item) ? sp.item! : null}
      admin={opts.admin}
      siteMapUrl={siteMapUrl}
      around={around}
    />
  )
}
