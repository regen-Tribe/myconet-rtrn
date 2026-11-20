'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/core/components/v4'

/**
 * About's sticky heading: the community's name once the photo has scrolled away, the chapters with the one
 * you're reading lit soft blue (and kept in view on a phone), and Edit for those who may edit.
 */
export default function AboutNav({ name, chapters, canEdit }: { name: string; chapters: [id: string, label: string][]; canEdit: boolean }) {
  const [current, setCurrent] = useState<string | null>(null)
  const [stuck, setStuck] = useState(false)
  const bar = useRef<HTMLElement>(null)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // The name shows once the bar sticks (the sentinel just above it has left the screen)
    const s = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 200), { threshold: 0 })
    if (sentinel.current) s.observe(sentinel.current)
    // The chapter whose top crossed the upper third of the screen last is the one being read
    const seen = new Map<string, boolean>()
    const o = new IntersectionObserver(entries => {
      entries.forEach(e => seen.set(e.target.id, e.isIntersecting))
      const on = chapters.find(([id]) => seen.get(id))
      if (on) setCurrent(on[0])
    }, { rootMargin: '-140px 0px -55% 0px' })
    chapters.forEach(([id]) => { const el = document.getElementById(id); if (el) o.observe(el) })
    return () => { s.disconnect(); o.disconnect() }
  }, [chapters])

  useEffect(() => {
    const chip = current ? bar.current?.querySelector<HTMLElement>(`[data-ch="${current}"]`) : null
    const row = chip?.parentElement
    if (chip && row) row.scrollTo({ left: chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' })
  }, [current])

  return (
    <>
      <div ref={sentinel} aria-hidden />
      <nav ref={bar} className={`ab-nav${stuck ? ' ab-nav--stuck' : ''}`} aria-label="Chapters">
        <a href="#top" className="ab-nav__name" tabIndex={stuck ? 0 : -1}>{name}</a>
        <div className="v4-chiprow ab-nav__chips">
          {chapters.map(([id, label]) => (
            <a key={id} href={`#${id}`} data-ch={id} className="v4-chip" aria-current={current === id ? 'location' : undefined}>{label}</a>
          ))}
        </div>
        {canEdit && <Button variant="secondary" size="sm" href="/about?edit=1" icon="pencil" className="ab-nav__edit">Edit</Button>}
      </nav>
    </>
  )
}
