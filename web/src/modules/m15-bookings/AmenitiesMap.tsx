'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Icon } from '@/core/components/v4'
import type { BookingItem } from './types'
import { CATEGORY_ICON } from './BookingsV4'
import { CATEGORY_META } from './lib/inventory'

/**
 * The Amenities map (v4.43.0, interactive since v4.44.0): the community's picture of the land with a pin
 * for each bookable thing that has one. Pins sit at a percent of the picture, so they stay put at any size.
 *
 * - Zoom with + / −, a double click, ⌘/Ctrl + scroll or a trackpad pinch; drag to move around; two
 *   fingers on a phone. Pins keep their size while zooming.
 * - A pin opens a small card (what it is, where, free now, "See and book"); the list beside the map lights
 *   up its pin, and clicking a name flies to it.
 * - With `placing`, a click on the picture says where that item goes (Admin › Bookings › Map).
 */
const MIN = 1
const MAX = 5

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
  const viewport = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const [view, setView] = useState({ s: 1, x: 0, y: 0 })
  const [picked, setPicked] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [cardH, setCardH] = useState(150)
  const measure = useCallback((el: HTMLDivElement | null) => { if (el && Math.abs(el.offsetHeight - cardH) > 2) setCardH(el.offsetHeight) }, [cardH])
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ moved: boolean; startX: number; startY: number; pinch?: number } | null>(null)

  const size = () => {
    const r = viewport.current?.getBoundingClientRect()
    return { w: r?.width ?? 1, h: r?.height ?? 1, left: r?.left ?? 0, top: r?.top ?? 0 }
  }
  // Keep the picture covering the frame: no empty edges when zoomed in
  const clamp = useCallback((v: { s: number; x: number; y: number }) => {
    const { w, h } = size()
    const s = Math.min(MAX, Math.max(MIN, v.s))
    return { s, x: Math.min(0, Math.max(w - w * s, v.x)), y: Math.min(0, Math.max(h - h * s, v.y)) }
  }, [])
  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    setView(v => {
      const { w, h } = size()
      const px = cx ?? w / 2, py = cy ?? h / 2
      const s = Math.min(MAX, Math.max(MIN, v.s * factor))
      const k = s / v.s
      return clamp({ s, x: px - (px - v.x) * k, y: py - (py - v.y) * k })
    })
  }, [clamp])
  const flyTo = useCallback((item: BookingItem) => {
    const { w, h } = size()
    setView(v => {
      const s = Math.max(v.s, 2.2)
      return clamp({ s, x: w / 2 - s * (item.map_x! / 100) * w, y: h / 2 - s * (item.map_y! / 100) * h })
    })
    setPicked(item.id)
  }, [clamp])

  // ⌘/Ctrl + scroll and trackpad pinches zoom; a plain scroll still scrolls the page
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY / 300), e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  // The frame's size, to keep the card inside it
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Escape closes the card
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPicked(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function down(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('button, a')) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    viewport.current?.setPointerCapture(e.pointerId)
    const pts = [...pointers.current.values()]
    drag.current = { moved: false, startX: e.clientX, startY: e.clientY, pinch: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : undefined }
  }
  function move(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId)
    if (!prev || !drag.current) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (Math.hypot(e.clientX - drag.current.startX, e.clientY - drag.current.startY) > 4) drag.current.moved = true
    const pts = [...pointers.current.values()]
    if (pts.length === 2) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (drag.current.pinch) {
        const { left, top } = size()
        zoomAt(d / drag.current.pinch, (pts[0].x + pts[1].x) / 2 - left, (pts[0].y + pts[1].y) / 2 - top)
      }
      drag.current.pinch = d
      return
    }
    setView(v => clamp({ ...v, x: v.x + e.clientX - prev.x, y: v.y + e.clientY - prev.y }))
  }
  function up(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId)
    const d = drag.current
    if (pointers.current.size === 0) drag.current = null
    if (!d || d.moved || (e.target as HTMLElement).closest('button, a')) return
    // A click (not a drag) on the picture: place the pin being placed, or close the card
    if (placing && onPlace && img.current) {
      const r = img.current.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width) * 100
      const y = ((e.clientY - r.top) / r.height) * 100
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) onPlace(x, y)
    } else setPicked(null)
  }

  const card = picked ? pinned.find(i => i.id === picked) ?? null : null
  const lit = selectedId ?? hover ?? picked

  // The card: beside its pin inside the frame on wide screens (above it when the pin is low, never past
  // an edge); under the map on narrow or short frames, where it wouldn't fit beside the pin
  const docked = box.w < 560 || box.h < cardH + 60
  const cardPos = (() => {
    if (!card) return { left: 0, top: 0 }
    const px = view.x + view.s * (card.map_x! / 100) * box.w
    const py = view.y + view.s * (card.map_y! / 100) * box.h
    const half = 112
    const left = Math.min(Math.max(px, half + 8), Math.max(half + 8, box.w - half - 8))
    const want = py > box.h / 2 ? py - 22 - cardH : py + 22
    return { left, top: Math.min(Math.max(want, 8), Math.max(8, box.h - cardH - 8)) }
  })()
  const avail = card ? availability?.(card) : null
  const cardBody = card && (
    <>
      <b>{card.name}</b>
      <small>{[CATEGORY_META[card.category].label, card.location, card.capacity ? `up to ${card.capacity}` : null].filter(Boolean).join(' · ')}</small>
      {avail && <span className={`v4-avail${avail.text.startsWith('In use') ? ' v4-avail--busy' : ''}`}>{avail.text}</span>}
      {card.requires_approval && <small>Needs a lead’s approval</small>}
      {onOpen && <Button size="sm" onClick={() => onOpen(card.id)}>See and book</Button>}
    </>
  )

  return (
    <div className={`v4-mapwrap${showList ? ' v4-mapwrap--list' : ''}`}>
      <div
        ref={viewport}
        className={`v4-map${placing ? ' v4-map--placing' : ''}${view.s > 1 ? ' v4-map--zoomed' : ''}`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onDoubleClick={e => { if ((e.target as HTMLElement).closest('button')) return; const { left, top } = size(); zoomAt(1.8, e.clientX - left, e.clientY - top) }}
      >
        <div className="v4-map__stage" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
          <img ref={img} src={url} alt="Map of the land" className="v4-map__img" draggable={false} />
          {pinned.map(i => {
            const ci = CATEGORY_ICON[i.category]
            return (
              <button
                key={i.id} type="button"
                className={`v4-pin no-min-height v4-pin--${ci.tone}${lit === i.id ? ' v4-pin--on' : ''}`}
                style={{ left: `${i.map_x}%`, top: `${i.map_y}%`, ['--k' as string]: 1 / view.s }}
                onClick={() => { if (!placing) setPicked(picked === i.id ? null : i.id) }}
                aria-label={i.name} aria-expanded={picked === i.id}
              >
                <Icon name={ci.icon} size={14} />
                <span className="v4-pin__label">{i.name}</span>
              </button>
            )
          })}
        </div>

        {card && !placing && !docked && (
          <div ref={measure} className="v4-mapcard" role="dialog" aria-label={card.name} style={{ left: cardPos.left, top: cardPos.top }}>{cardBody}</div>
        )}

        <div className="v4-map__zoom" role="group" aria-label="Zoom the map">
          <button type="button" onClick={() => zoomAt(1.5)} disabled={view.s >= MAX} aria-label="Zoom in"><Icon name="plus" size={16} /></button>
          <button type="button" onClick={() => zoomAt(1 / 1.5)} disabled={view.s <= MIN} aria-label="Zoom out"><span aria-hidden>−</span></button>
          {view.s > 1 && <button type="button" onClick={() => { setView({ s: 1, x: 0, y: 0 }); setPicked(null) }} aria-label="Show the whole map"><Icon name="undo" size={15} /></button>}
        </div>
        {placing && <div className="v4-map__hint">Click where {placing.name} is</div>}
      </div>

      {card && !placing && docked && <div className="v4-mapcard v4-mapcard--docked" role="dialog" aria-label={card.name}>{cardBody}</div>}

      {showList && (
        <ul className="v4-maplist" aria-label="On the map">
          {pinned.map(i => {
            const ci = CATEGORY_ICON[i.category]
            const a = availability?.(i)
            return (
              <li key={i.id}>
                <button type="button" className={lit === i.id ? 'on' : ''} onMouseEnter={() => setHover(i.id)} onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i.id)} onBlur={() => setHover(null)} onClick={() => flyTo(i)}>
                  <span className={`v4-tile v4-tile--${ci.tone}`}><Icon name={ci.icon} size={15} /></span>
                  <span><b>{i.name}</b><small>{a?.text ?? CATEGORY_META[i.category].label}</small></span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
