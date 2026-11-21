'use client'
/**
 * A circle's seal: its colour as a hand-drawn round with its glyph stamped on it in cream
 * (DESIGN-SYSTEM.md › v4 › Circles). Circles are the only coloured icons in the app, so a
 * seal always means "this belongs to a circle". Without a glyph it shows the circle's initial.
 */
import type { CSSProperties } from 'react'
import { useCircles } from '@/core/components/CirclesProvider'
import { CIRCLE_GLYPHS, SEAL_INK, SEAL_PATH, isCircleGlyph } from './circle-glyphs'

/** The seal for a colour and a glyph you already have (the pickers, /design). Pages use `CircleSeal`. */
export function Seal({ color, glyph, name = 'Circle', size = 20, className, title }: {
  color: string; glyph?: string | null; name?: string; size?: number; className?: string; title?: boolean
}) {
  const art = isCircleGlyph(glyph) ? CIRCLE_GLYPHS[glyph] : null
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={['v4-seal', className].filter(Boolean).join(' ')}
      style={{ '--seal': color } as CSSProperties}
      role={title ? 'img' : undefined} aria-label={title ? name : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{name}</title>}
      <path d={SEAL_PATH} fill={color} />
      {art
        ? <g className="v4-seal__art" transform="translate(8.3 8.3) scale(.975)" fill={SEAL_INK} stroke={SEAL_INK} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: art }} />
        : <text x="20" y="26.5" textAnchor="middle" fill={SEAL_INK} fontSize="17" fontWeight="700" fontFamily="var(--display), sans-serif">{name.trim().charAt(0).toUpperCase()}</text>}
    </svg>
  )
}

export function CircleSeal({ slug, size = 20, className, title }: { slug: string | null | undefined; size?: number; className?: string; title?: boolean }) {
  const circles = useCircles()
  const c = slug ? circles.get(slug) : undefined
  return <Seal color={c?.color ?? '#8a8f9c'} glyph={c?.icon} name={c?.name ?? slug ?? 'Circle'} size={size} className={className} title={title} />
}
