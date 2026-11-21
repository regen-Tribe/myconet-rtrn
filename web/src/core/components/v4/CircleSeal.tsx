'use client'
/**
 * A circle's seal: its colour as a hand-drawn round with its glyph in a cream line
 * (DESIGN-SYSTEM.md › v4 › Circles). Circles are the only coloured icons in the app, so a
 * seal always means "this belongs to a circle". Without a glyph it shows the circle's initial.
 */
import { useCircles } from '@/core/components/CirclesProvider'
import { CIRCLE_GLYPHS, SEAL_INK, SEAL_PATH, isCircleGlyph } from './circle-glyphs'

export function CircleSeal({ slug, size = 20, className, title }: { slug: string | null | undefined; size?: number; className?: string; title?: boolean }) {
  const circles = useCircles()
  const c = slug ? circles.get(slug) : undefined
  const color = c?.color ?? '#8a8f9c'
  const name = c?.name ?? slug ?? 'Circle'
  const glyph = isCircleGlyph(c?.icon) ? CIRCLE_GLYPHS[c.icon] : null
  // A thicker line when small, so the glyph stays readable at 16px
  const sw = size < 24 ? 2.6 : size < 40 ? 2.3 : 2
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={['v4-seal', className].filter(Boolean).join(' ')}
      role={title ? 'img' : undefined} aria-label={title ? name : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{name}</title>}
      <path d={SEAL_PATH} fill={color} />
      {glyph
        ? <g transform="translate(8.6 8.6) scale(.95)" fill="none" stroke={SEAL_INK} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: glyph }} />
        : <text x="20" y="26.5" textAnchor="middle" fill={SEAL_INK} fontSize="17" fontWeight="700" fontFamily="var(--display), sans-serif">{name.trim().charAt(0).toUpperCase()}</text>}
    </svg>
  )
}
