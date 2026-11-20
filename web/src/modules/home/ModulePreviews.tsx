import Link from 'next/link'
import { useCircles } from '@/core/components/CirclesProvider'
import type { CircleDirectory } from '@/core/lib/ops-permissions'
import { modLabel } from '@/core/lib/module-label'

/**
 * Live previews of M15 Accommodation, M16 Resources and M17 Circles for the
 * landing page and /home. Each page wraps them in its own section heading.
 */

export interface PreviewItem {
  id: string
  name: string
  category: 'accommodation' | 'tools' | 'spaces'
  tags: string[]
  location: string | null
  capacity: number | null
}

export interface CirclesPreviewData {
  directory: CircleDirectory
  /** Teams per circle, e.g. { tech: ['Web team'] } */
  teams: Partial<Record<string, string[]>>
}

const CATEGORY_LOOK = {
  accommodation: { emoji: '🏡', label: 'Accommodation', color: '#b45309' },
  tools:         { emoji: '🔧', label: 'Tools',         color: '#0369a1' },
  spaces:        { emoji: '🏛', label: 'Spaces',        color: '#7c3aed' },
} as const

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, padding: 18,
  boxShadow: '0 4px 16px rgba(0,0,0,.06), 0 2px 4px rgba(0,0,0,.04)',
}
const head: React.CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 12,
}
const cta = (color: string): React.CSSProperties => ({
  display: 'inline-block', marginTop: 14, fontSize: 13, fontWeight: 700, color: '#fff', background: color,
  padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
})

function ItemRow({ item }: { item: PreviewItem }) {
  const look = CATEGORY_LOOK[item.category]
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: 'var(--bg-2)', borderLeft: `3px solid ${look.color}` }}>
      <span style={{ fontSize: 18, lineHeight: 1.2 }} aria-hidden>{look.emoji}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', overflowWrap: 'anywhere' }}>{item.name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
          {[item.location && `📍 ${item.location}`, item.capacity && `👥 ${item.capacity}`, ...item.tags.slice(0, 3).map(t => `#${t}`)].filter(Boolean).join(' · ') || look.label}
        </div>
      </div>
    </div>
  )
}

/** Shows the real inventory, or what kinds of things will live here while it's empty. */
function InventoryPreview({ title, items, emptyExamples, href, color, cta: ctaLabel }: {
  title: string; items: PreviewItem[]; emptyExamples: string[]; href: string; color: string; cta: string
}) {
  return (
    <div style={card}>
      <div style={head}>{title}</div>
      {items.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.slice(0, 4).map(i => <ItemRow key={i.id} item={i} />)}
          {items.length > 4 && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>+ {items.length - 4} more</div>}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 10px' }}>Being stocked now. Things you’ll be able to book:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {emptyExamples.map(e => (
              <span key={e} style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--bg-2)', border: '1px dashed var(--rule)', borderRadius: 20, padding: '3px 10px' }}>{e}</span>
            ))}
          </div>
        </div>
      )}
      <Link href={href} style={cta(color)}>{ctaLabel} →</Link>
    </div>
  )
}

export function StaysPreview({ items }: { items: PreviewItem[] }) {
  return (
    <InventoryPreview
      title={modLabel('15', 'Places to stay')}
      items={items.filter(i => i.category === 'accommodation')}
      emptyExamples={['🏡 Guest rooms', '🛖 Cabins', '⛺ Tent sites', '🛏 Bunks for work weeks']}
      href="/accommodation"
      color="var(--m15)"
      cta="See places to stay"
    />
  )
}

export function ResourcesPreview({ items }: { items: PreviewItem[] }) {
  return (
    <InventoryPreview
      title={modLabel('16', 'Shared tools & spaces')}
      items={items.filter(i => i.category !== 'accommodation')}
      emptyExamples={['🔧 Power tools', '🚐 Community van', '🍳 Commercial kitchen', '🏛 Great hall', '🎨 Art studio']}
      href="/resources"
      color="var(--m16)"
      cta="Browse resources"
    />
  )
}

export function CirclesPreview({ data }: { data: CirclesPreviewData }) {
  const circles = useCircles()
  return (
    <div style={card}>
      <div style={head}>{modLabel('17', 'Who leads what')}</div>
      {data.directory.admins.length > 0 && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>
          <strong style={{ color: 'var(--ink)' }}>Stewards</strong> · {data.directory.admins.map(a => a.name).join(', ')}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
        {circles.slugs.map(c => {
          const meta = circles.meta(c)
          const leads = data.directory.leads[c]
          const teams = data.teams[c] ?? []
          return (
            <div key={c} style={{ borderTop: `3px solid ${meta.color}`, background: 'var(--bg-2)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.emoji} {meta.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 3 }}>
                {leads.length ? `Led by ${leads.map(l => l.name).join(', ')}` : 'Lead wanted'}
              </div>
              {teams.length > 0 && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{teams.length} team{teams.length === 1 ? '' : 's'}: {teams.slice(0, 2).join(', ')}{teams.length > 2 ? '…' : ''}</div>}
            </div>
          )
        })}
      </div>
      <Link href="/circles" style={cta('var(--m17)')}>See all circles →</Link>
    </div>
  )
}
