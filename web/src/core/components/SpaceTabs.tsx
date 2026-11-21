import Link from 'next/link'
import { Icon } from '@/core/components/v4'

/**
 * "The space" is one menu item with two pages (v4.102.0): what you can use and book, and where it is on the land.
 * Both pages show this switch under their heading.
 */
export function SpaceTabs({ on }: { on: 'amenities' | 'map' }) {
  return (
    <nav className="v4-seg v4-seg--links v4-spacetabs" aria-label="The space">
      <Link href="/amenities" aria-current={on === 'amenities' ? 'page' : undefined} className={on === 'amenities' ? 'on' : ''}><Icon name="grid" size={15} />Amenities &amp; tools</Link>
      <Link href="/map" aria-current={on === 'map' ? 'page' : undefined} className={on === 'map' ? 'on' : ''}><Icon name="map" size={15} />Map</Link>
    </nav>
  )
}
