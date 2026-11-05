'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/client'
import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useProfileCompletion } from '@/core/contexts/ProfileCompletion'
import { VERSION } from '@/core/lib/version'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import { useBranding } from '@/core/components/BrandingProvider'

function computeCompletion(
  p: { first_name?: string | null; avatar_url?: string | null; headline?: string | null; city?: string | null; user_types?: string[] | null } | null,
  b: { values_principles?: string | null; skills?: string[] | null; goals?: string | null; places_traveling?: unknown[] | null } | null,
  offerCount: number,
  requestCount: number,
): number {
  const checks = [
    !!p?.avatar_url,
    !!p?.first_name,
    !!p?.headline,
    !!p?.city,
    (p?.user_types?.length ?? 0) > 0,
    !!b?.values_principles,
    (b?.skills?.length ?? 0) > 0,
    !!b?.goals,
    offerCount > 0,
    requestCount > 0,
    (b?.places_traveling?.length ?? 0) > 0,
  ]
  return Math.round(checks.filter(Boolean).length / checks.length * 100)
}

export default function AppTopBar({ onMobileNavToggle, mobileNavOpen }: {
  onMobileNavToggle?: () => void
  mobileNavOpen?: boolean
}) {
  const router = useRouter()
  const { logo_url } = useBranding()
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { pct: profilePct, setPct: setProfilePct } = useProfileCompletion()

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const dark = stored === 'dark' || (!stored && document.documentElement.getAttribute('data-theme') === 'dark')
    setIsDark(dark)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        Promise.all([
          supabase.from('user_profiles')
            .select('first_name, last_name, avatar_url, headline, city, user_types, username')
            .eq('id', data.user.id).single(),
          supabase.from('user_bio')
            .select('values_principles, skills, goals, places_traveling')
            .eq('user_id', data.user.id).maybeSingle(),
          supabase.from('user_offers')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', data.user.id).eq('is_active', true),
          supabase.from('user_requests')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', data.user.id).eq('is_active', true),
        ]).then(([profileRes, bioRes, offersRes, requestsRes]) => {
          const p = profileRes.data
          if (p) {
            setDisplayName([p.first_name, p.last_name].filter(Boolean).join(' ') || 'Member')
            setAvatarUrl(p.avatar_url ?? null)
            setUsername(p.username ?? null)
          }
          const pct = computeCompletion(
            p,
            bioRes.data,
            offersRes.count ?? 0,
            requestsRes.count ?? 0,
          )
          setProfilePct(pct)
        })
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) { setDisplayName(''); setAvatarUrl(null); setUsername(null); setProfilePct(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  function toggleTheme() {
    const next = isDark ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
    setIsDark(!isDark)
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setMenuOpen(true)
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setMenuOpen(false), 120)
  }

  const initials = displayName.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'

  const showBar = user && profilePct !== null && profilePct < 100

  const menuItems = [
    username ? { label: 'View my profile', href: `/u/${username}`, icon: '👤' } : null,
    { label: 'Edit profile', href: '/profile/edit', icon: '✏️' },
    { label: 'Dashboard', href: '/dashboard', icon: '⊞' },
    { label: 'Network', href: '/network', icon: '🌐' },
    { label: 'Circles', href: '/org', icon: '🧭' },
    { label: 'Contributions', href: '/contributions', icon: '✦' },
    { label: 'Governance', href: '/governance', icon: '☉' },
    { label: 'Calendar', href: '/events', icon: '🗓' },
    { label: 'Accommodation', href: '/stays', icon: '🏡' },
    { label: 'Resources', href: '/bookings', icon: '🔑' },
    'divider',
    { label: isDark ? 'Light mode' : 'Dark mode', action: toggleTheme, icon: isDark ? '☀' : '◑' },
    'divider',
    { label: 'Sign out', action: signOut, icon: '→', danger: true },
  ].filter(Boolean) as (string | { label: string; href?: string; action?: () => void; icon: string; danger?: boolean })[]

  return (
    <header style={{
      gridColumn: '1 / -1',
      display: 'flex',
      flexDirection: 'column',
      borderBottom: '1px solid var(--rule)',
      background: 'var(--surface)',
      zIndex: 10,
      flexShrink: 0,
    }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', flex: 1 }}>
      {/* Mobile modules toggle */}
      <button
        className="topbar-modules-btn"
        onClick={onMobileNavToggle}
        aria-label="Toggle navigation"
        style={{
          display: 'none', // shown via CSS on mobile
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
          background: mobileNavOpen ? 'var(--bg-2)' : 'none',
          border: '1px solid var(--rule)', borderRadius: 7,
          cursor: 'pointer', color: 'var(--ink-2)', flexShrink: 0,
          padding: '5px 10px', fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="2" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
          <rect x="9" y="2" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
          <rect x="1" y="10" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
          <rect x="9" y="10" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.3"/>
        </svg>
        <span>Modules</span>
      </button>

      {/* Brand — logo/name and the version badge are sibling links (links can't nest) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {logo_url ? (
          <Link href="/home" aria-label={`${COMMUNITY_NAME} home`} style={{ display: 'flex', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo_url} alt={`${COMMUNITY_NAME} logo`} style={{ height: 44, width: 'auto', maxWidth: 140, objectFit: 'contain', borderRadius: 8 }} />
          </Link>
        ) : (
          <Link href="/home" aria-label={`${COMMUNITY_NAME} home`} style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: 'radial-gradient(circle at 30% 30%, var(--accent-color), color-mix(in srgb, var(--accent-color) 60%, #000))',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3)',
          }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Link href="/home" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span className="topbar-brand-sub" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-3)' }}>MyCoNet</span>
            <span className="topbar-brand-sub" style={{ color: 'var(--ink-4)', fontWeight: 400, fontSize: 15 }}>·</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{COMMUNITY_NAME}</span>
          </Link>
          <Link href="/changelog" style={{ textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.querySelector('span')!.style.background = 'color-mix(in srgb, var(--accent-color) 18%, var(--bg-2))')}
            onMouseLeave={e => (e.currentTarget.querySelector('span')!.style.background = 'var(--bg-2)')}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700,
              color: 'var(--ink-3)', letterSpacing: '0.04em',
              background: 'var(--bg-2)', border: '1px solid var(--rule)',
              borderRadius: 5, padding: '1px 6px',
              transition: 'background 120ms',
            }}>
              {VERSION}
            </span>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="topbar-search" style={{
        flex: 1,
        maxWidth: 360,
        marginLeft: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 12px',
        border: '1px solid var(--rule)',
        borderRadius: 999,
        background: 'var(--bg-2)',
        color: 'var(--ink-3)',
        fontSize: 12.5,
        cursor: 'text',
        userSelect: 'none',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7" />
          <line x1="20" y1="20" x2="16.6" y2="16.6" />
        </svg>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Search members, projects, proposals…
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-4)', padding: '1px 5px', border: '1px solid var(--rule)', borderRadius: 4, flexShrink: 0 }}>⌘K</span>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto', flexShrink: 0 }}>
        {/* Bell */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          display: 'grid', placeItems: 'center',
          background: 'var(--bg-2)', color: 'var(--ink-2)',
          position: 'relative', cursor: 'pointer', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10 21a2 2 0 0 0 4 0" />
          </svg>
          <div style={{ position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: '50%', background: 'var(--m9)', border: '2px solid var(--surface)' }} />
        </div>

        {/* User pill + dropdown */}
        {user ? (
          <div
            ref={menuRef}
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
            style={{ position: 'relative', flexShrink: 0 }}
          >
            {/* Pill */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 10px 4px 4px', borderRadius: 999, background: 'var(--bg-2)',
                fontSize: 12, fontWeight: 600, color: 'var(--ink)',
                border: menuOpen ? '1px solid var(--rule)' : '1px solid transparent',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--m1), var(--m4))',
                display: 'grid', placeItems: 'center',
                color: '#fff', fontSize: 10.5, fontWeight: 700, overflow: 'hidden',
              }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials}
              </div>
              <span>{displayName || 'Member'}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 2, opacity: 0.5, transition: 'transform 150ms', transform: menuOpen ? 'rotate(180deg)' : 'none' }}>
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div
                onMouseEnter={openMenu}
                onMouseLeave={scheduleClose}
                style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: 'var(--surface)', border: '1px solid var(--rule)',
                  borderRadius: 12, padding: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,.12), 0 2px 6px rgba(0,0,0,.06)',
                  minWidth: 200, zIndex: 100,
                }}
              >
                {/* Profile summary */}
                <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--rule)', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{displayName || 'Member'}</div>
                  {profilePct !== null && (
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                      {profilePct}% profile complete
                    </div>
                  )}
                </div>

                {menuItems.map((item, i) => {
                  if (item === 'divider') return <div key={i} style={{ height: 1, background: 'var(--rule)', margin: '4px 0' }} />
                  const it = item as { label: string; href?: string; action?: () => void; icon: string; danger?: boolean }
                  const style: React.CSSProperties = {
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 13, fontWeight: 500, width: '100%', textAlign: 'left',
                    color: it.danger ? '#ef4444' : 'var(--ink)',
                    background: 'none', border: 'none', textDecoration: 'none',
                    transition: 'background 100ms',
                  }
                  const iconEl = <span style={{ fontSize: 13, width: 18, textAlign: 'center', flexShrink: 0 }}>{it.icon}</span>
                  const labelEl = <span>{it.label}</span>

                  if (it.action) {
                    return (
                      <button key={i} onClick={it.action} style={style}
                        onMouseEnter={e => (e.currentTarget.style.background = it.danger ? '#fef2f2' : 'var(--bg-2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        {iconEl}{labelEl}
                      </button>
                    )
                  }
                  return (
                    <Link key={i} href={it.href!} onClick={() => setMenuOpen(false)} style={style}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-2)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'none')}>
                      {iconEl}{labelEl}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <Link href="/auth/login" style={{
            fontSize: 13, color: 'var(--ink-2)', padding: '5px 12px',
            borderRadius: 8, border: '1px solid var(--rule)',
            fontWeight: 500, textDecoration: 'none',
          }}>
            Sign in
          </Link>
        )}
      </div>
      </div>

      {/* Profile completion bar */}
      {showBar && (
        <Link href="/profile/edit" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ position: 'relative', height: 22, background: 'var(--bg-2)', borderTop: '1px solid var(--rule)', cursor: 'pointer' }}>
            {/* Fill */}
            <div style={{
              position: 'absolute', inset: '0 auto 0 0',
              width: `${profilePct}%`,
              background: profilePct! >= 80
                ? 'color-mix(in srgb, var(--m1) 30%, transparent)'
                : 'color-mix(in srgb, var(--accent-color) 22%, transparent)',
              transition: 'width 600ms ease',
            }} />
            {/* Label */}
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
              fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
              color: 'var(--ink-3)', letterSpacing: '0.04em',
            }}>
              <span style={{
                width: 22, height: 22,
                borderRadius: '50%', background: 'var(--accent-color)',
                color: '#fff', display: 'grid', placeItems: 'center',
                fontSize: 8, fontWeight: 800, flexShrink: 0,
              }}>{profilePct}%</span>
              profile complete — finish it →
            </div>
          </div>
        </Link>
      )}
    </header>
  )
}
