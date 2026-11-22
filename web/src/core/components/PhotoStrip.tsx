'use client'

import { useRef, useState } from 'react'
import { Icon } from '@/core/components/v4'

/**
 * One photo, or several you swipe through (scroll-snap; arrows on desktop). Used by the item's window in
 * Amenities & tools and the place's card on the Map: the cover first, then the rest.
 */
export function PhotoStrip({ photos, alt, className = '' }: { photos: string[]; alt: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState(0)
  if (photos.length === 0) return null
  if (photos.length === 1) return <img className={`v4-strip__one ${className}`} src={photos[0]} alt={alt} loading="lazy" />
  const go = (d: number) => {
    const el = ref.current
    if (el) el.scrollTo({ left: el.clientWidth * Math.max(0, Math.min(photos.length - 1, at + d)), behavior: 'smooth' })
  }
  return (
    <div className={`v4-strip ${className}`}>
      <div className="v4-strip__track" ref={ref}
        onScroll={e => { const el = e.currentTarget; setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))) }}>
        {photos.map((p, i) => <img key={p} src={p} alt={i === 0 ? alt : ''} loading={i === 0 ? 'eager' : 'lazy'} />)}
      </div>
      {at > 0 && <button type="button" className="v4-strip__nav v4-strip__nav--prev" aria-label="Previous photo" onClick={() => go(-1)}><Icon name="left" size={16} /></button>}
      {at < photos.length - 1 && <button type="button" className="v4-strip__nav v4-strip__nav--next" aria-label="Next photo" onClick={() => go(1)}><Icon name="right" size={16} /></button>}
      <span className="v4-strip__count" aria-hidden="true">{at + 1} / {photos.length}</span>
    </div>
  )
}
