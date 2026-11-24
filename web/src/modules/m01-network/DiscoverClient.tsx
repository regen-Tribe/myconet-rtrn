'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { computeMatch, type Bio } from '@/modules/m01-network/lib/match-score'
import { Input } from '@/core/components/ui/input'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/core/components/ui/select'
import { Search, Filter, X } from '@/core/components/v4/lucide-compat'
import { modLabel } from '@/core/lib/module-label'
import { DESIGN, DESIGN_REVIEW } from '@/core/lib/instance'
import MembersViews from './MembersViews'
import { Button as V4Button, Card, Chip, ChipRow, EmptyState, Icon as V4Icon, IconTile, PageHeader, InlineIcon } from '@/core/components/v4'
import { PersonCardV4 } from './PersonCardV4'

const ROLE_FILTERS = [
  { value: 'all',                     label: 'All Types' },
  { value: 'Exploring',               label: 'Exploring' },
  { value: 'Community Member',        label: 'Community Member' },
  { value: 'Vision Holder',           label: 'Vision Holder' },
  { value: 'Service Provider',        label: 'Service Provider' },
  { value: 'Resource Holder - Land',  label: 'Resource Holder – Land' },
  { value: 'Resource Holder - Money', label: 'Resource Holder – Money' },
]

interface Profile {
  id: string
  username: string
  first_name: string | null
  last_name: string | null
  headline: string | null
  country: string | null
  city: string | null
  avatar_url: string | null
  user_types: string[] | null
}

interface Props {
  profiles: Profile[]
  bioMap: Record<string, NonNullable<Bio>>
  myBio: Bio
  isLoggedIn: boolean
}

export default function DiscoverClient({ profiles, bioMap, myBio, isLoggedIn }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const handleSearch = () => setDebouncedQuery(searchQuery)

  const members = useMemo(() => {
    let list = profiles.map(p => {
      const bio = bioMap[p.id] ?? null
      const { score, reasons } = computeMatch(myBio, bio)
      return { profile: p, bio, score, reasons }
    })

    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase()
      list = list.filter(({ profile: p, bio }) =>
        (p.first_name ?? '').toLowerCase().includes(q) ||
        (p.last_name ?? '').toLowerCase().includes(q) ||
        (p.username ?? '').toLowerCase().includes(q) ||
        (p.city ?? '').toLowerCase().includes(q) ||
        (p.country ?? '').toLowerCase().includes(q) ||
        (p.headline ?? '').toLowerCase().includes(q) ||
        (bio?.skills ?? []).some((s: string) => s.toLowerCase().includes(q)) ||
        (bio?.interests ?? []).some((i: string) => i.toLowerCase().includes(q))
      )
    }

    if (roleFilter !== 'all') {
      list = list.filter(({ profile: p }) => (p.user_types ?? []).includes(roleFilter))
    }

    return list.sort((a, b) => b.score - a.score)
  }, [profiles, bioMap, myBio, debouncedQuery, roleFilter])

  const hasFilters = !!debouncedQuery || roleFilter !== 'all'
  const clearFilters = () => { setSearchQuery(''); setDebouncedQuery(''); setRoleFilter('all') }

  // The v4 look: one search box (searches as you type), member types as chips, uniform cards best match first
  if (DESIGN === 'v4') return (
    <div className="v4-page">
      <PageHeader eyebrow="Members" title="Discover" subtitle="Find people by name, skill, interest, place or what kind of member they are." />
      {DESIGN_REVIEW && <MembersViews signedIn={isLoggedIn} className="mbv--page" />}
      {!isLoggedIn && (DESIGN_REVIEW
        // Design review: one quiet line, not a banner (the menu's next step says Create account once)
        ? <p className="v4-hint"><InlineIcon name="lock" /> <Link href="/auth/login">Sign in</Link> to see each person’s skills and how well you match.</p>
        : <Card className="v4-note"><IconTile name="users" tone="red" /><span>Sign in to see each person’s skills and how well you match.</span></Card>)}
      <div className="mb4-find">
        <label className="mb4-search">
          <V4Icon name="search" size={17} />
          <input type="search" className="mb4-search__input" value={searchQuery} placeholder="Search by name, skill, interest or place"
            onChange={e => { setSearchQuery(e.target.value); setDebouncedQuery(e.target.value) }} />
          {searchQuery && <button type="button" className="mb4-search__clear" aria-label="Clear search" onClick={() => { setSearchQuery(''); setDebouncedQuery('') }}><V4Icon name="x" size={14} /></button>}
        </label>
        <ChipRow>
          {ROLE_FILTERS.map(r => <Chip key={r.value} on={roleFilter === r.value} onClick={() => setRoleFilter(r.value)}>{r.value === 'all' ? 'Everyone' : r.label}</Chip>)}
        </ChipRow>
      </div>
      {hasFilters && <p className="mb4-count">{members.length} of {profiles.length} people</p>}
      {members.length === 0
        ? <EmptyState icon="search" title="No one found" text={hasFilters ? 'Try other words or another member type.' : 'No other members yet.'} />
        : <div className="mb4-grid">{members.map(({ profile: p, bio, score, reasons }) => (
            <PersonCardV4 key={p.id} p={{
              id: p.id, username: p.username, avatar: p.avatar_url,
              name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username || 'Someone',
              sub: p.headline || [p.city, p.country].filter(Boolean).join(', ') || (p.username ? `@${p.username}` : null),
              score: isLoggedIn ? score : null, reason: isLoggedIn ? reasons.slice(0, 2).join(' · ') : null,
              tags: isLoggedIn ? [...(bio?.skills ?? []), ...(bio?.interests ?? [])] : null,
            }} />
          ))}</div>}
      {!isLoggedIn && !DESIGN_REVIEW && <div style={{ display: 'flex', gap: 8, marginTop: 18 }}><V4Button href="/auth/signup">Create an account</V4Button><V4Button variant="secondary" href="/auth/login">Sign in</V4Button></div>}
    </div>
  )

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 28px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>
          {modLabel('01', 'Search members')}
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(20px, 3vw, 28px)', color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 6px' }}>
          Find your people.
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
          Search by values, skills, personality, interests, location.
        </p>
      </div>

      {/* Search + filter */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 0 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--ink-4)' }} />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="name, skill, interest, location…"
              style={{ paddingLeft: 34 }}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger style={{ width: 200, fontSize: 13 }}>
              <Filter style={{ width: 14, height: 14, marginRight: 6, color: 'var(--ink-4)' }} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_FILTERS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <button onClick={handleSearch} style={{
            fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--m1)',
            border: 'none', padding: '0 18px', borderRadius: 8, cursor: 'pointer',
          }}>
            Search
          </button>
        </div>

        {hasFilters && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--rule)', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
              Filters
            </span>
            {debouncedQuery && (
              <FilterChip onClear={() => { setSearchQuery(''); setDebouncedQuery('') }}>
                "{debouncedQuery}"
              </FilterChip>
            )}
            {roleFilter !== 'all' && (
              <FilterChip onClear={() => setRoleFilter('all')}>
                {ROLE_FILTERS.find(r => r.value === roleFilter)?.label}
              </FilterChip>
            )}
            <button onClick={clearFilters} style={{
              fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 'none',
              cursor: 'pointer', textDecoration: 'underline', padding: 0,
            }}>
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results count + grid */}
      {members.length > 0 ? (
        <>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>
            {members.length} result{members.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
            {members.map(({ profile: p, bio, score, reasons }) => (
              <UserCard key={p.id} profile={p} bio={bio} score={score} reasons={reasons} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        </>
      ) : (
        <EmptyResult hasFilters={hasFilters} onClear={clearFilters} />
      )}

      {!isLoggedIn && (
        <div style={{
          marginTop: 22,
          background: 'color-mix(in srgb, var(--m1) 6%, var(--surface))',
          border: '1px dashed color-mix(in srgb, var(--m1) 30%, var(--rule))',
          borderRadius: 10, padding: '16px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--m1)', letterSpacing: '0.08em', marginBottom: 4 }}>
              SIGN IN TO UNLOCK
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Match scores show up next to every result once you sign in.</div>
          </div>
          <Link href="/auth/signup" style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--m1)', padding: '8px 16px', borderRadius: 8, textDecoration: 'none', flexShrink: 0 }}>
            Create account
          </Link>
        </div>
      )}
    </div>
  )
}

function FilterChip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 12, padding: '3px 4px 3px 9px', borderRadius: 20,
      background: 'var(--bg-2)', color: 'var(--ink-2)', border: '1px solid var(--rule)',
    }}>
      {children}
      <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2, color: 'var(--ink-4)' }} aria-label="Remove filter">
        <X style={{ width: 11, height: 11 }} />
      </button>
    </span>
  )
}

function UserCard({ profile: p, bio, score, reasons, isLoggedIn }: {
  profile: Profile; bio: NonNullable<Bio> | null; score: number; reasons: string[]; isLoggedIn: boolean
}) {
  const displayName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username
  const initial = displayName[0]?.toUpperCase() ?? '?'
  const location = [p.city, p.country].filter(Boolean).join(', ')
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

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
            background: 'color-mix(in srgb, var(--m1) 12%, var(--surface))', display: 'grid', placeItems: 'center',
          }}>
            {p.avatar_url
              ? <img loading="lazy" decoding="async" src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--m1)' }}>{initial}</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              @{p.username}
            </div>
          </div>
          {isLoggedIn && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: scoreColor, flexShrink: 0 }}>
              {score}%
            </div>
          )}
        </div>

        {p.headline && (
          <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.45, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {p.headline}
          </div>
        )}

        {location && (
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 8 }}><InlineIcon name="pin" />{location}</div>
        )}

        {bio && (bio.skills ?? []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: isLoggedIn && reasons.length > 0 ? 8 : 0 }}>
            {(bio.skills ?? []).slice(0, 3).map(s => (
              <span key={s} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--bg-2)', color: 'var(--ink-3)', border: '1px solid var(--rule)' }}>{s}</span>
            ))}
            {(bio.skills ?? []).length > 3 && (
              <span style={{ fontSize: 10, color: 'var(--ink-4)', alignSelf: 'center' }}>+{(bio.skills ?? []).length - 3}</span>
            )}
          </div>
        )}

        {isLoggedIn && reasons.length > 0 && (
          <div style={{ paddingTop: 8, borderTop: '1px solid var(--rule)', fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {reasons[0]}
          </div>
        )}
      </div>
    </Link>
  )
}

function EmptyResult({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 10, padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink-4)', marginBottom: 8 }}>
        NO RESULTS
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>No members found</div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, maxWidth: 360, margin: '0 auto 14px' }}>
        {hasFilters ? 'Try adjusting your search terms or filters.' : 'Be the first to complete your profile and start building the network!'}
      </div>
      {hasFilters && (
        <button onClick={onClear} style={{
          fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--surface)',
          border: '1px solid var(--rule)', padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
        }}>
          Clear filters
        </button>
      )}
    </div>
  )
}
