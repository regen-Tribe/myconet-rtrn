export type BookingCategory = 'accommodation' | 'tools' | 'spaces'
export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled'

export interface PersonLite {
  first_name: string | null
  username: string | null
}

export interface BookingItem {
  id: string
  name: string
  description: string | null
  category: BookingCategory
  tags: string[]
  circle: string | null
  location: string | null
  capacity: number | null
  requires_approval: boolean
  is_active: boolean
  created_by: string | null
  /** Pin on the Amenities map, percent of the picture (v4.43.0); null when not placed */
  map_x?: number | null
  map_y?: number | null
  /** The item's own photo (v4.76.0); without one the card shows its place's photo */
  photo_url?: string | null
  /** More photos after the cover (v4.109.0) */
  photos?: string[]
  /** The cover is a drawing standing in for a photo (v4.116.0): the card sorts last */
  photo_drawn?: boolean
  /** The place on the Map this item sits in (v4.74.0): its photo and slug, for the card and a link to /map */
  place?: { slug: string; name: string; photo_url: string | null; photos?: string[] } | null
}

export interface Booking {
  id: string
  item_id: string
  user_id: string
  starts_at: string
  ends_at: string
  status: BookingStatus
  note: string | null
  created_at: string
  person: PersonLite | null
}

export type BookingsTab = 'browse' | 'mine' | 'manage'

/** A place from the Map that has no bookable thing of its own, listed under Spaces (v4.113.0): a waterfall, the
 *  shared restrooms, the tree net. Not bookable; its card opens the place on the Map. */
export interface AroundPlace {
  slug: string
  name: string
  kind: string
  description: string | null
  photo_url: string | null
  photo_drawn?: boolean
}
