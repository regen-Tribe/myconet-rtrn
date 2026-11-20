import { renderBookings } from '@/modules/m15-bookings/BookingsPage'

/** Admin › Bookings (v4 menu): booking requests and the shared inventory, for circle leads and admins. */
export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { item } = await searchParams
  return renderBookings('amenities', { tab: 'manage', item }, { admin: true })
}
