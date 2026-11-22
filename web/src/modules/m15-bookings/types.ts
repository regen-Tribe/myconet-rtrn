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
