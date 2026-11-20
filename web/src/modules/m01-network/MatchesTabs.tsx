'use client'
import { useState } from 'react'
import Link from 'next/link'

interface Match {
  profile: {
    id: string; username: string
    first_name: string | null; last_name: string | null
    city: string | null; country: string | null
    avatar_url: string | null; user_types: string[] | null
  }
  bio: { skills?: string[] | null; interests?: string[] | null } | null
  score: number
  reasons: string[]
}

type Tab = 'top' | 'good' | 'potential'

const TAB_META: Record<Tab, { label: string; color: string; rangeLabel: string }> = {
  top:       { label: 'Top matches',     color: 'var(--m5)', rangeLabel: '≥70%' },
  good:      { label: 'Good matches',    color: 'var(--m4)', rangeLabel: '50–69%' },
  potential: { label: 'Potential',       color: 'var(--ink-3)', rangeLabel: 'below 50%' },
}

export default function MatchesTabs({ matches }: { matches: Match[] }) {
  const [tab, setTab] = useState<Tab>('top')

  const buckets: Record<Tab, Match[]> = {
    top:       matches.filter(m => m.score >= 70),
    good:      matches.filter(m => m.score >= 50 && m.score < 70),
    potential: matches.filter(m => m.score < 50),
  }
  const current = buckets[tab]

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 8,
        padding: 3, marginBottom: 16,
      }}>
        {(Object.keys(TAB_META) as Tab[]).map(t => {
          const isActive = t === tab
          const meta = TAB_META[t]
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--ink)' : 'var(--ink-3)',
                background: isActive ? 'var(--surface)' : 'transparent',
                border: 'none', cursor: 'pointer',
                padding: '7px 10px', borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background 100ms, color 100ms',
                boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
              }}
            >
              {meta.label}
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                color: isActive ? meta.color : 'var(--ink-4)',
                background: isActive ? `color-mix(in srgb, ${meta.color} 12%, var(--surface))` : 'var(--bg-2)',
                padding: '1px 6px', borderRadius: 20,
              }}>
                {buckets[t].length}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {current.length === 0 ? (
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 10, padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink-4)', marginBottom: 6 }}>
            EMPTY
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            {tab === 'top'
              ? 'No top matches yet. Complete more of your profile to widen the net.'
              : tab === 'good'
                ? 'No matches in this range right now.'
                : 'No potential matches to show.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {current.map(m => <MatchCard key={m.profile.id} match={m} />)}
        </div>
      )}
    </div>
  )
}

function MatchCard({ match: { profile: p, bio, score, reasons } }: { match: Match }) {
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username
  const init = name[0]?.toUpperCase() ?? '?'
  const loc = [p.city, p.country].filter(Boolean).join(', ')
  const scoreColor = score >= 70 ? 'var(--m5)' : score >= 40 ? 'var(--m4)' : 'var(--ink-4)'

  return (
    <Link href={`/u/${p.username}`} style={{ textDecoration: 'none' }}>
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10,
        padding: '14px 14px 12px',
        transition: 'box-shadow 140ms, transform 140ms',
      }} className="hover-elevate">
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--m1)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
            background: 'color-mix(in srgb, var(--m1) 12%, var(--surface))', display: 'grid', placeItems: 'center',
          }}>
            {p.avatar_url
              ? <img loading="lazy" decoding="async" src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--m1)' }}>{init}</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {loc || `@${p.username}`}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: scoreColor, flexShrink: 0 }}>
            {score}%
          </div>
        </div>

        {/* Score bar */}
        <div style={{ height: 3, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ width: `${score}%`, height: '100%', background: scoreColor, transition: 'width 200ms' }} />
        </div>

        {/* Reasons */}
        {reasons.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: bio?.skills?.length || bio?.interests?.length ? 8 : 0 }}>
            {reasons.slice(0, 3).map((r, i) => (
              <span key={i} style={{
                fontSize: 10.5, padding: '2px 7px', borderRadius: 20,
                background: 'color-mix(in srgb, var(--m1) 8%, var(--surface))',
                color: 'var(--ink-2)', border: '1px solid color-mix(in srgb, var(--m1) 20%, var(--rule))',
                lineHeight: 1.4,
              }}>
                {r}
              </span>
            ))}
            {reasons.length > 3 && (
              <span style={{ fontSize: 10.5, color: 'var(--ink-4)', alignSelf: 'center' }}>
                +{reasons.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Skills / interests strip */}
        {bio && ((bio.skills?.length ?? 0) > 0 || (bio.interests?.length ?? 0) > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(bio.skills ?? []).slice(0, 3).map(s => (
              <span key={s} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--bg-2)', color: 'var(--ink-3)', border: '1px solid var(--rule)' }}>
                {s}
              </span>
            ))}
            {(bio.interests ?? []).slice(0, 2).map(i => (
              <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--bg-2)', color: 'var(--ink-3)', border: '1px solid var(--rule)' }}>
                {i}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
