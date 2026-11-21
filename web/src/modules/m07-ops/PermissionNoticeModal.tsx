'use client'

import { InlineIcon } from '@/core/components/v4'
import Link from 'next/link'
import { useCircles } from '@/core/components/CirclesProvider'
import { type CircleDirectory, type PermissionNotice, type PersonRef } from '@/core/lib/ops-permissions'

function PeopleList({ people }: { people: PersonRef[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {people.map(p => (
        <Link
          key={p.id}
          href={p.username ? `/u/${p.username}` : '#'}
          style={{
            fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', textDecoration: 'none',
            background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 20, padding: '3px 10px',
          }}
        >
          {p.name}
        </Link>
      ))}
    </div>
  )
}

/** Explains why a project action was blocked, and who can do it instead. */
export function PermissionNoticeModal({
  notice, directory, onClose,
}: {
  notice: PermissionNotice | null
  directory: CircleDirectory
  onClose: () => void
}) {
  const circles = useCircles()
  if (!notice) return null
  const circleLeads = notice.circle ? directory.leads[notice.circle] : []
  const sectionLabel: React.CSSProperties = {
    fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: 'var(--ink-4)', marginBottom: 8,
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--rule)',
          width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          animation: 'calFadeIn 160ms ease',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}><InlineIcon name="lock" />{notice.title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0, display: 'flex' }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0 }}>{notice.message}</p>

          {notice.circle && (
            <div>
              <div style={sectionLabel}>
                <span style={{ color: circles.meta(notice.circle).color }}>{circles.label(notice.circle)}</span> leads
              </div>
              {circleLeads.length > 0
                ? <PeopleList people={circleLeads} />
                : <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>This circle has no lead yet.</div>}
            </div>
          )}

          {directory.admins.length > 0 && (
            <div>
              <div style={sectionLabel}>Admins — can move any task</div>
              <PeopleList people={directory.admins} />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Link href="/operations?tab=circles" onClick={onClose} style={{ fontSize: 12, fontWeight: 600, color: 'var(--m7)', textDecoration: 'none' }}>
              See all circles and leads →
            </Link>
            <button
              onClick={onClose}
              style={{ background: '#4338ca', color: '#fff', fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer' }}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
