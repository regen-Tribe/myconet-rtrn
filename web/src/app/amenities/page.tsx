import { renderBookings, type BookingsSearchParams } from '@/modules/m15-bookings/BookingsPage'

/** Amenities & tools (v4 menu): Accommodation and Resources on one page, all categories. */
export default async function AmenitiesPage({ searchParams }: { searchParams: Promise<BookingsSearchParams> }) {
  return renderBookings('amenities', await searchParams)
}
