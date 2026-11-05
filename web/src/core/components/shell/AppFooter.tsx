import Link from 'next/link'
import { VERSION } from '@/core/lib/version'
import { COMMUNITY_NAME } from '@/core/lib/instance'

export default function AppFooter() {
  return (
    <footer style={{
      borderTop: '1px solid var(--rule)',
      padding: '12px 22px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      background: 'var(--bg)',
      flexShrink: 0,
    }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>
        {COMMUNITY_NAME} · MyCoNet
      </span>
      <Link href="/changelog" style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700,
        color: 'var(--ink-3)', textDecoration: 'none',
        background: 'var(--bg-2)', border: '1px solid var(--rule)',
        borderRadius: 5, padding: '2px 8px',
        transition: 'color 120ms, border-color 120ms',
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.color = 'var(--ink)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-3)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.color = 'var(--ink-3)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--rule)'
        }}
      >
        {VERSION} · Changelog ↗
      </Link>
    </footer>
  )
}
