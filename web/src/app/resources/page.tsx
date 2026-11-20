import { redirect } from 'next/navigation'
import { renderBookings, type BookingsSearchParams } from '@/modules/m15-bookings/BookingsPage'

/** M16 Resources — tools, spaces and everything else. Accommodation lives at /accommodation (M15). */
export default async function ResourcesPage({ searchParams }: { searchParams: Promise<BookingsSearchParams> }) {
  const sp = await searchParams
  // Old links like /resources?category=accommodation belong on the Accommodation page
  if (sp.category === 'accommodation') redirect(`/accommodation${sp.item ? `?item=${sp.item}` : ''}`)
  return renderBookings('resources', sp)
}
