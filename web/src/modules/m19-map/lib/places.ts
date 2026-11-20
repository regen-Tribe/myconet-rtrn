import type { IconName } from '@/core/components/v4'
import type { PinTone } from '@/core/components/v4/SiteMap'

/**
 * A place on the Map page (v4.70.0; table `places`). The shape is kept simple so a list from the second
 * brain drops in: slug, name, kind, map_x/map_y (percent of the picture), photo_url, description.
 */
export type PlaceKind = 'stay' | 'space' | 'amenity' | 'garden' | 'water' | 'nature' | 'gathering' | 'other'

export interface Place {
  id: string
  slug: string
  name: string
  kind: PlaceKind
  description: string | null
  photo_url: string | null
  map_x: number | null
  map_y: number | null
  circle: string | null
  project_id: string | null
  sort_order: number
}

export const PLACE_SELECT = 'id, slug, name, kind, description, photo_url, map_x, map_y, circle, project_id, sort_order'

/** Label, icon and pin colour per kind, in the order the filter shows them */
export const KIND_META: Record<PlaceKind, { label: string; icon: IconName; tone: PinTone }> = {
  stay: { label: 'Accommodation', icon: 'bed', tone: 'yellow' },
  space: { label: 'Shared spaces', icon: 'building', tone: 'violet' },
  amenity: { label: 'Amenities', icon: 'wrench', tone: 'blue' },
  garden: { label: 'Food & gardens', icon: 'sprout', tone: 'green' },
  water: { label: 'Water', icon: 'drop', tone: 'blue' },
  nature: { label: 'Forest & trails', icon: 'tree', tone: 'green' },
  gathering: { label: 'Gathering spots', icon: 'users', tone: 'red' },
  other: { label: 'Other', icon: 'pin', tone: 'grey' },
}
export const KINDS = Object.keys(KIND_META) as PlaceKind[]

export const isKind = (k: unknown): k is PlaceKind => typeof k === 'string' && k in KIND_META

/** "Honey house" → "honey-house" (the place's stable key) */
export const slugify = (name: string) =>
  name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'place'

/** A bookable thing whose pin sits this close (percent of the picture) belongs to the place's card */
export const NEAR = 3

export const near = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y) <= NEAR

/** Who may change a place: admins, and circle leads for places of circles they lead (as the database says) */
export function canEditPlace(place: Pick<Place, 'circle'> | null, role: string, leadCircles: string[]) {
  if (role === 'admin') return true
  if (role !== 'circle_lead') return false
  return place === null ? leadCircles.length > 0 : !!place.circle && leadCircles.includes(place.circle)
}
