'use client'

import { Button } from '@/core/components/v4'
import SiteMap, { type SitePin } from '@/core/components/v4/SiteMap'
import type { BookingItem } from './types'
import { CATEGORY_ICON } from './BookingsV4'
import { CATEGORY_META } from './lib/inventory'

/**
 * The Amenities map (v4.43.0, interactive since v4.44.0): the community's picture of the land with a pin
 * for each bookable thing that has one. The map itself (zoom, drag, pinch, the card, the list) is the
 * shared `SiteMap` (v4.70.0), also used by the Map page.
 *
 * - A pin opens a small card (what it is, where, free now, "See and book"); the list beside the map lights
 *   up its pin, and clicking a name flies to it.
 * - With `placing`, a click on the picture says where that item goes (Admin › Bookings › Map).
 */
export default function AmenitiesMap({ url, items, onOpen, placing, onPlace, selectedId, availability, showList = false }: {
  url: string
  items: BookingItem[]
  onOpen?: (id: string) => void
  placing?: BookingItem | null
  onPlace?: (x: number, y: number) => void
  selectedId?: string | null
  availability?: (item: BookingItem) => { text: string } | null
  showList?: boolean
}) {
  const pinned = items.filter(i => i.map_x != null && i.map_y != null)
  const pins: SitePin[] = pinned.map(i => ({
    id: i.id, name: i.name, x: i.map_x!, y: i.map_y!,
    icon: CATEGORY_ICON[i.category].icon, tone: CATEGORY_ICON[i.category].tone,
    sub: availability?.(i)?.text ?? CATEGORY_META[i.category].label,
  }))

  const renderCard = (id: string) => {
    const card = pinned.find(i => i.id === id)
    if (!card) return null
    const avail = availability?.(card)
    return (
      <>
        <b>{card.name}</b>
        <small>{[CATEGORY_META[card.category].label, card.location, card.capacity ? `up to ${card.capacity}` : null].filter(Boolean).join(' · ')}</small>
        {avail && <span className={`v4-avail${avail.text.startsWith('In use') ? ' v4-avail--busy' : ''}`}>{avail.text}</span>}
        {card.requires_approval && <small>Needs a lead’s approval</small>}
        {onOpen && <Button size="sm" onClick={() => onOpen(card.id)}>See and book</Button>}
      </>
    )
  }

  return (
    <SiteMap url={url} pins={pins} renderCard={renderCard} placing={placing} onPlace={onPlace}
      selectedId={selectedId} showList={showList} />
  )
}
