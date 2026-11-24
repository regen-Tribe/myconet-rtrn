'use client'
import { Icon } from '@/core/components/v4'
import { useState } from 'react'
import Link from 'next/link'
import { DESIGN_REVIEW } from '@/core/lib/instance'

type Member = {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  user_types: string[] | null
  city: string | null
  country: string | null
}

function Avatar({ member, size }: { member: Member; size: number }) {
  const name = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.username
  const init = name[0]?.toUpperCase() ?? '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: 'var(--accent-soft)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', border: '2px solid var(--rule)',
    }}>
      {member.avatar_url
        ? <img loading="lazy" decoding="async" src={member.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.36, fontWeight: 700, color: 'var(--accent)' }}>{init}</span>
      }
    </div>
  )
}

export default function MemberList({ members, matchScores = {} }: { members: Member[]; matchScores?: Record<string, { score: number; reasons: string[] }> }) {
  const [view, setView] = useState<'tiles' | 'list'>('tiles')

  if (members.length === 0) {
    return (
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 'var(--radius-lg)', padding: '40px 24px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>
        No members yet. Be the first to complete your profile!
      </div>
    )
  }

  return (
    <div>
      {/* Header row with toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
          New in the Network
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden' }}>
            <button
              onClick={() => setView('tiles')}
              title="Tile view"
              style={{
                padding: '5px 10px', border: 'none', cursor: 'pointer', fontSize: 14,
                background: view === 'tiles' ? 'var(--surface)' : 'transparent',
                color: view === 'tiles' ? 'var(--ink)' : 'var(--ink-4)',
                borderRight: '1px solid var(--rule)',
              }}
            >
              ⊞
            </button>
            <button
              onClick={() => setView('list')}
              title="List view"
              style={{
                padding: '5px 10px', border: 'none', cursor: 'pointer', fontSize: 14,
                background: view === 'list' ? 'var(--surface)' : 'transparent',
                color: view === 'list' ? 'var(--ink)' : 'var(--ink-4)',
              }}
            >
              <Icon name={DESIGN_REVIEW ? 'list' : 'menu'} size={14} label="List" />
            </button>
          </div>
          <Link href="/members/discover" style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            View all →
          </Link>
        </div>
      </div>

      {/* Tiles */}
      {view === 'tiles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
          {members.map(u => {
            const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username
            const loc = [u.city, u.country].filter(Boolean).join(', ')
            const ms = matchScores[u.id]
            const scoreColor = ms && ms.score >= 70 ? 'var(--m5)' : ms && ms.score >= 40 ? '#f59e0b' : 'var(--ink-4)'
            return (
              <Link key={u.id} href={`/u/${u.username}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius-lg)', padding: '18px 14px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  textAlign: 'center', transition: 'box-shadow 120ms, transform 120ms',
                  position: 'relative',
                }} className="hover-elevate">
                  {ms && (
                    <span style={{
                      position: 'absolute', top: 8, right: 8,
                      fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                      color: scoreColor,
                      background: 'var(--surface)',
                      border: `1px solid ${scoreColor}`,
                      padding: '1px 6px', borderRadius: 20,
                    }}>{ms.score}%</span>
                  )}
                  <Avatar member={u} size={72} />
                  <div style={{ minWidth: 0, width: '100%' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                    {loc && <p style={{ fontSize: 11, color: 'var(--ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc}</p>}
                  </div>
                  {(u.user_types ?? []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                      {(u.user_types ?? []).slice(0, 2).map(t => (
                        <span key={t} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--bg-2)', color: 'var(--ink-3)', border: '1px solid var(--rule)' }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* List */}
      {view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map(u => {
            const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username
            const loc = [u.city, u.country].filter(Boolean).join(', ')
            const ms = matchScores[u.id]
            const scoreColor = ms && ms.score >= 70 ? 'var(--m5)' : ms && ms.score >= 40 ? '#f59e0b' : 'var(--ink-4)'
            return (
              <Link key={u.id} href={`/u/${u.username}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius)', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 16,
                  transition: 'box-shadow 120ms, transform 120ms',
                }} className="hover-elevate">
                  <Avatar member={u} size={56} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{name}</p>
                    {loc && <p style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 4 }}>{loc}</p>}
                    {(u.user_types ?? []).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(u.user_types ?? []).slice(0, 3).map(t => (
                          <span key={t} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--bg-2)', color: 'var(--ink-3)', border: '1px solid var(--rule)' }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {ms ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{ms.score}%</span>
                      <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--ink-4)', letterSpacing: '0.04em' }}>match</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--ink-4)', flexShrink: 0 }}>→</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
