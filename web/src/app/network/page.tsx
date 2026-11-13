import { createClient } from '@/core/lib/supabase/server'
import { profileColumns } from '@/core/lib/public-profile'
import Link from 'next/link'
import MemberList from '@/modules/m01-network/MemberList'
import { computeMatch, type Bio, type MatchResult } from '@/modules/m01-network/lib/match-score'

export default async function NetworkDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [memberCountRes, recentRes, recentJoinsRes, recentOffersRes, recentSeeksRes] = await Promise.all([
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('user_profiles')
      // Visitors get the public columns; the hidden ones (location, user types) are just missing
      .select(profileColumns(!!user, 'id, username, first_name, last_name, avatar_url, user_types, city, country') as 'id, username, first_name, last_name, avatar_url, user_types, city, country')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('user_profiles')
      .select('id, first_name, last_name, username, created_at')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('user_offers')
      .select('id, title, created_at, user_profiles(first_name, last_name, username)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('user_requests')
      .select('id, title, created_at, user_profiles(first_name, last_name, username)')
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const memberCount = memberCountRes.count ?? 0
  const recentUsers = (recentRes.data ?? []).filter(u => u.id !== user?.id)

  let offersCount = 0
  let seeksCount = 0
  let displayName: string | null = null
  let myBio: Bio = null
  let topMatches: { profile: NonNullable<typeof recentRes.data>[number]; score: number; reasons: string[] }[] = []
  const recentMatchScores: Record<string, MatchResult> = {}
  let profileSteps: { label: string; complete: boolean }[] | null = null
  let profileCompleteness = 0

  if (user) {
    const [offersRes, seeksRes, profileRes, allProfilesRes, allBiosRes, myBioRes] = await Promise.all([
      supabase.from('user_offers').select('id').eq('user_id', user.id),
      supabase.from('user_requests').select('id').eq('user_id', user.id),
      supabase.from('user_profiles').select('first_name, last_name, city, country, headline').eq('id', user.id).maybeSingle(),
      supabase.from('user_profiles')
        .select('id, username, first_name, last_name, avatar_url, city, country, user_types')
        .neq('id', user.id),
      supabase.from('user_bio').select('*'),
      supabase.from('user_bio').select('*').eq('user_id', user.id).maybeSingle(),
    ])

    offersCount = offersRes.data?.length ?? 0
    seeksCount = seeksRes.data?.length ?? 0
    const profile = profileRes.data
    displayName = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Explorer'
      : null

    myBio = myBioRes.data ? { ...myBioRes.data, city: profile?.city, country: profile?.country } as Bio : null

    if (profile) {
      const pd = myBioRes.data?.personality_details as { myersBriggs?: string } | null
      profileSteps = [
        { label: 'Name',        complete: !!profile.first_name },
        { label: 'Headline',    complete: !!(profile as any).headline },
        { label: 'Values',      complete: !!(myBioRes.data?.values_principles) },
        { label: 'Personality', complete: !!pd?.myersBriggs },
        { label: 'Skills',      complete: ((myBioRes.data?.skills as string[] | null)?.length ?? 0) > 0 },
        { label: 'Goals',       complete: !!(myBioRes.data?.goals) },
        { label: 'Offers',      complete: offersCount > 0 },
      ]
      profileCompleteness = Math.round(profileSteps.filter(s => s.complete).length / profileSteps.length * 100)
    }
    const profileLocById = new Map<string, { city?: string | null; country?: string | null }>()
    for (const p of allProfilesRes.data ?? []) profileLocById.set(p.id, { city: p.city, country: p.country })
    const bioMap: Record<string, Bio> = {}
    for (const b of allBiosRes.data ?? []) {
      const loc = profileLocById.get(b.user_id) ?? {}
      bioMap[b.user_id] = { ...b, city: loc.city, country: loc.country } as Bio
    }

    topMatches = (allProfilesRes.data ?? [])
      .map(p => {
        const { score, reasons } = computeMatch(myBio, bioMap[p.id] ?? null)
        return { profile: p, score, reasons }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)

    if (myBio) {
      for (const u of recentUsers) {
        recentMatchScores[u.id] = computeMatch(myBio, bioMap[u.id] ?? null)
      }
    }
  }



  type MemberActivity = { id: string; who: string; act: string; href: string; ts: number }
  const memberActivity: MemberActivity[] = [
    ...(recentJoinsRes.data ?? []).filter((m: any) => m.id !== user?.id).map((m: any) => {
      const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.username || 'Someone'
      return { id: 'join-' + m.id, who: name, act: 'joined the community', href: `/u/${m.username}`, ts: new Date(m.created_at).getTime() }
    }),
    ...(recentOffersRes.data ?? []).map((o: any) => {
      const p = o.user_profiles as any
      const name = [p?.first_name, p?.last_name].filter(Boolean).join(' ') || p?.username || 'Someone'
      const title = (o.title as string).length > 50 ? (o.title as string).slice(0, 48) + '…' : o.title
      return { id: 'offer-' + o.id, who: name, act: `posted an offer — "${title}"`, href: `/u/${p?.username}`, ts: new Date(o.created_at).getTime() }
    }),
    ...(recentSeeksRes.data ?? []).map((s: any) => {
      const p = s.user_profiles as any
      const name = [p?.first_name, p?.last_name].filter(Boolean).join(' ') || p?.username || 'Someone'
      const title = (s.title as string).length > 50 ? (s.title as string).slice(0, 48) + '…' : s.title
      return { id: 'seek-' + s.id, who: name, act: `is looking for — "${title}"`, href: `/u/${p?.username}`, ts: new Date(s.created_at).getTime() }
    }),
  ]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 10)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 28px 80px' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>
          M01 · Community Network
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(20px, 3vw, 28px)', color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 6px' }}>
              {user && displayName ? `${greeting}, ${displayName}.` : 'Community Network'}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
              {user
                ? <>You're connected with <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{memberCount}</span> member{memberCount !== 1 ? 's' : ''} building regenerative neighborhoods.</>
                : 'Browse the people building regenerative neighborhoods.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            <Link href="/network/discover" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', padding: '7px 14px', border: '1px solid var(--rule)', borderRadius: 8, textDecoration: 'none', background: 'var(--surface)' }}>
              Search network
            </Link>
            {user && (
              <Link href="/network/matches" style={{ fontSize: 13, fontWeight: 700, color: '#fff', padding: '7px 16px', borderRadius: 8, textDecoration: 'none', background: 'var(--m1)' }}>
                See your matches →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Guest CTA banner ── */}
      {!user && (
        <div style={{
          background: 'color-mix(in srgb, var(--m1) 6%, var(--surface))',
          border: '1px dashed color-mix(in srgb, var(--m1) 30%, var(--rule))',
          borderRadius: 10, padding: '14px 18px', marginBottom: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--m1)', letterSpacing: '0.08em', marginBottom: 4 }}>
              BROWSING AS GUEST
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Join free to post your offers, make requests, and unlock match scoring.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Link href="/auth/login" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', padding: '7px 14px', border: '1px solid var(--rule)', borderRadius: 8, textDecoration: 'none' }}>
              Sign in
            </Link>
            <Link href="/auth/signup" style={{ fontSize: 13, fontWeight: 700, color: '#fff', padding: '7px 16px', borderRadius: 8, textDecoration: 'none', background: 'var(--m1)' }}>
              Join free
            </Link>
          </div>
        </div>
      )}

      {/* ── Profile completeness tracker ── */}
      {user && profileSteps && profileCompleteness < 100 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--rule)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 22,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ minWidth: 100 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 5 }}>
              Profile
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 80, height: 5, borderRadius: 3, background: 'var(--rule)', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ height: '100%', width: `${profileCompleteness}%`, background: 'var(--m1)', borderRadius: 3 }} />
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>
                {profileCompleteness}%
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
            {profileSteps.map(s => (
              <span key={s.label} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 20,
                background: s.complete ? 'color-mix(in srgb, var(--m1) 12%, transparent)' : 'var(--bg-2)',
                color: s.complete ? 'var(--m1)' : 'var(--ink-4)',
                fontWeight: s.complete ? 600 : 400,
                border: s.complete ? 'none' : '1px solid var(--rule)',
              }}>
                {s.label}
              </span>
            ))}
          </div>
          <Link href="/profile/edit" style={{ fontSize: 13, fontWeight: 700, color: 'var(--m1)', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>
            Complete Profile →
          </Link>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 22 }}>
        <StatCard label="Members" value={String(memberCount)} delta="across the network" href="/network/discover" />
        <StatCard
          label="Your offers"
          value={user ? String(offersCount) : '—'}
          delta={user ? (offersCount > 0 ? 'live on your profile' : 'add some') : 'sign in to post'}
          href={user ? '/network/offers' : '/auth/signup'}
        />
        <StatCard
          label="Your seeks"
          value={user ? String(seeksCount) : '—'}
          delta={user ? (seeksCount > 0 ? 'live on your profile' : 'add some') : 'sign in to post'}
          href={user ? '/network/seeks' : '/auth/signup'}
        />
        <StatCard
          label="Top match"
          value={user && topMatches.length > 0 ? `${topMatches[0].score}%` : '—'}
          delta={user
            ? (topMatches.length > 0
                ? ([topMatches[0].profile.first_name, topMatches[0].profile.last_name].filter(Boolean).join(' ') || topMatches[0].profile.username)
                : 'complete profile to unlock')
            : 'sign in to see'}
          deltaColor={user && topMatches.length > 0 ? 'var(--m1)' : undefined}
          href={user ? '/network/matches' : '/auth/signup'}
        />
      </div>

      {/* ── Your matches strip (logged-in only) ── */}
      {user && (
        <section style={{ marginBottom: 22 }}>
          <SectionHeader label="Your matches" actionHref="/network/matches" actionLabel="See all →" />
          {!myBio ? (
            <NextStepCard
              eyebrow="GET MATCHED"
              title="Complete your profile to unlock matches"
              body="Add your skills, values, and personality so we can find the people most aligned with you."
              ctaLabel="Complete profile →"
              ctaHref="/profile/edit"
              color="var(--m1)"
            />
          ) : topMatches.length === 0 ? (
            <EmptyCard text="No other members yet — you'll be the first when they join." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {topMatches.map(({ profile: p, score, reasons }) => (
                <MatchCard key={p.id} profile={p} score={score} reasons={reasons} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Member activity feed ── */}
      {memberActivity.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
              M01 · Network activity
            </span>
            <Link href="/network/discover" style={{ fontSize: 12.5, color: 'var(--m1)', fontWeight: 600, textDecoration: 'none' }}>
              Search network →
            </Link>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10, padding: '4px 0', display: 'flex', flexDirection: 'column' }}>
            {memberActivity.map((item, i) => (
              <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 14px',
                  borderBottom: i < memberActivity.length - 1 ? '1px solid color-mix(in srgb, var(--rule) 60%, transparent)' : 'none',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: 'color-mix(in srgb, var(--m1) 15%, var(--surface))',
                    display: 'grid', placeItems: 'center',
                    fontSize: 9.5, fontWeight: 700, color: 'var(--m1)',
                  }}>
                    {item.who[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong style={{ color: 'var(--ink)' }}>{item.who}</strong>{' '}{item.act}
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', flexShrink: 0 }}>
                    {netTimeAgo(item.ts)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Members section ── */}
      <section>
        <MemberList members={recentUsers} matchScores={recentMatchScores} />
      </section>
    </div>
  )
}

/* ── Helpers ── */

function netTimeAgo(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 2) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function StatCard({ label, value, delta, deltaColor, href }: {
  label: string; value: string; delta: string; deltaColor?: string; href?: string
}) {
  const inner = (
    <div className={href ? 'dash-stat-card dash-stat-card--link' : 'dash-stat-card'}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: deltaColor ?? 'var(--ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {delta}
      </div>
    </div>
  )
  if (href) return <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>
  return inner
}

function SectionHeader({ label, actionHref, actionLabel }: {
  label: string; actionHref?: string; actionLabel?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
        {label}
      </span>
      {actionHref && actionLabel && (
        <Link href={actionHref} style={{ fontSize: 12.5, color: 'var(--m1)', fontWeight: 600, textDecoration: 'none' }}>
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

function NextStepCard({ eyebrow, title, body, ctaLabel, ctaHref, color }: {
  eyebrow: string; title: string; body: string; ctaLabel: string; ctaHref: string; color: string
}) {
  return (
    <div style={{
      background: `color-mix(in srgb, ${color} 6%, var(--surface))`,
      border: `1px dashed color-mix(in srgb, ${color} 30%, var(--rule))`,
      borderRadius: 10, padding: '16px 18px',
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color, letterSpacing: '0.08em', marginBottom: 5 }}>
        {eyebrow}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55, marginBottom: 12 }}>{body}</div>
      <Link href={ctaHref} style={{ display: 'inline-block', fontSize: 13, fontWeight: 700, color: '#fff', background: color, padding: '8px 16px', borderRadius: 8, textDecoration: 'none' }}>
        {ctaLabel}
      </Link>
    </div>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 10, padding: '20px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
      {text}
    </div>
  )
}

function MatchCard({ profile: p, score, reasons }: {
  profile: { id: string; username: string; first_name: string | null; last_name: string | null; avatar_url: string | null; city: string | null; country: string | null; user_types: string[] | null }
  score: number; reasons: string[]
}) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
            background: 'color-mix(in srgb, var(--m1) 12%, var(--surface))', display: 'grid', placeItems: 'center',
          }}>
            {p.avatar_url
              ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m1)' }}>{init}</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            {loc && <div style={{ fontSize: 11, color: 'var(--ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc}</div>}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: scoreColor, flexShrink: 0 }}>
            {score}%
          </div>
        </div>
        {reasons.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.45 }}>
            {reasons.slice(0, 2).join(' · ')}
          </div>
        )}
      </div>
    </Link>
  )
}
