import { redirect } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/server'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import MapV4, { type MapBookable } from './MapV4'
import { canEditPlace, isKind, PLACE_SELECT, type Place } from './lib/places'

/**
 * M19 Map (v4.70.0): the picture of the land with every place on it. Signed-in people only (the
 * `places` table is readable by authenticated users). Reads places, the bookable things that have a pin
 * (booking_items.map_x/map_y, the Amenities map) and the picture (community_settings.site_map_url).
 */
export default async function MapPage({ searchParams }: { searchParams: Promise<{ place?: string; kind?: string }> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=${encodeURIComponent('/map')}`)

  const [profileRes, placesRes, itemsRes, mapRes] = await Promise.all([
    supabase.from('user_profiles').select('role, lead_circles').eq('id', user.id).maybeSingle(),
    supabase.from('places').select(PLACE_SELECT).order('sort_order').order('name'),
    supabase.from('booking_items').select('id, name, category, map_x, map_y').eq('is_active', true).not('map_x', 'is', null),
    supabase.from('community_settings').select('site_map_url').maybeSingle(),
  ])
  const role = (profileRes.data?.role as string | undefined) ?? 'explorer'
  const leadCircles = (profileRes.data?.lead_circles as string[] | null) ?? []
  // A community that hasn't applied the places migration yet still gets the map of its bookable things
  const morePhotosRes = await supabase.from('places').select('id, photos')
  const morePhotos = new Map(((morePhotosRes.error ? [] : morePhotosRes.data) ?? []).map(p => [p.id as string, (p.photos as string[] | null) ?? []]))
  const places = ((placesRes.error ? [] : placesRes.data) ?? []).map(p => ({ ...p, photos: morePhotos.get(p.id as string) ?? [], kind: isKind(p.kind) ? p.kind : 'other' }) as Place)
  const bookables = ((itemsRes.error ? [] : itemsRes.data) ?? []) as MapBookable[]
  const mapUrl = mapRes.error ? null : ((mapRes.data as { site_map_url: string | null } | null)?.site_map_url ?? null)

  // Task titles for the places that link one (a place's "Task" button)
  const projectIds = [...new Set(places.map(p => p.project_id).filter((id): id is string => !!id))]
  const tasks = projectIds.length
    ? ((await supabase.from('projects').select('id, title').in('id', projectIds)).data ?? []) as { id: string; title: string }[]
    : []

  // The task a place links to is picked from the board (only people who can change places need the list)
  const taskOptions = canEditPlace(null, role, leadCircles)
    ? ((await supabase.from('projects').select('id, title').order('updated_at', { ascending: false }).limit(300)).data ?? []) as { id: string; title: string }[]
    : []

  return (
    <MapV4
      communityName={COMMUNITY_NAME}
      mapUrl={mapUrl}
      initialPlaces={places}
      bookables={bookables}
      tasks={tasks}
      taskOptions={taskOptions}
      role={role}
      leadCircles={leadCircles}
      initialPlace={sp.place ?? null}
      initialKind={isKind(sp.kind) ? sp.kind : null}
      placesReady={!placesRes.error}
    />
  )
}
