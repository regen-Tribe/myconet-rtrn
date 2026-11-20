import Link from 'next/link'
import type { GlanceTile } from './lib/at-a-glance'

/** Tiles that explain the community in a few seconds. Used on `/` and `/home`. */
export function CommunityGlance({ name, tiles }: { name: string; tiles: GlanceTile[] }) {
  if (tiles.length === 0) return null
  return (
    <div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>
        The community at a glance
      </div>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(22px, 3vw, 32px)', color: 'var(--ink)', lineHeight: 1.15, letterSpacing: '-0.015em', margin: '0 0 20px', maxWidth: '28ch' }}>
        {name}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {tiles.map(t => (
          <Link key={t.label} href={t.href} className="glance-tile" style={{
            display: 'flex', flexDirection: 'column', gap: 6, textDecoration: 'none',
            background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 16px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden>{t.emoji}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{t.label}</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink)', margin: 0 }}>{t.text}</p>
          </Link>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <Link href="/blueprint" style={{ fontSize: 13, fontWeight: 600, color: 'var(--m4)', textDecoration: 'none' }}>
          Open Blueprint →
        </Link>
      </div>
    </div>
  )
}
