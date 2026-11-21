import type { GlanceTile } from './lib/about-text'

/**
 * At a glance, under the About photo: a tile per fact, a figure you take in at once (14 ha, ~30, 22–30°C) and
 * one line that says what it means (Sonia, 20 Nov: tiles, but "make it make sense for the content"). A tile
 * never opens in place: it jumps to the whole answer, which lives once, in its chapter.
 */
export default function AboutFacts({ tiles }: { tiles: GlanceTile[] }) {
  return (
    <nav className="ab-facts" aria-label="At a glance" style={{ '--n': tiles.length, '--half': Math.ceil(tiles.length / 2) } as React.CSSProperties}>
      {tiles.map(t => (
        <a key={t.label} href={`#${t.target}`} className={`ab-fact ab-fact--${t.tone}`}>
          <span>{t.label}</span>
          <b>{t.value}</b>
          {t.note && <small>{t.note}</small>}
        </a>
      ))}
    </nav>
  )
}
