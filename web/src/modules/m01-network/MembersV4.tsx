import type { SupabaseClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Card, Icon, IconTile, PageHeader } from '@/core/components/v4'
import { profileColumns } from '@/core/lib/public-profile'
import { loadCircleRows } from '@/core/lib/circles-server'
import MembersGridV4, { type MemberCard } from './MembersGridV4'
import './members-v4.css'

type Match = { profile: { id: string; username: string | null; first_name: string | null; last_name: string | null; avatar_url: string | null }; score: number; reasons: string[] }
type Activity = { id: string; who: string; act: string; href: string; ts: number }

/**
 * Members in the v4 look (Sonia's prototype, 19 Nov; "matches first", 20 Nov). Your best matches lead the
 * page, with your profile, your offers and requests and what's new beside them; then everyone as uniform
 * cards (with your match % on each) you can search and filter by circle.
 */
export default async function MembersV4({ supabase, userId, memberCount, profileSteps, profileCompleteness, topMatches, activity, hasBio, offersCount, requestsCount, matchScores }: {
  supabase: SupabaseClient
  userId: string | null
  memberCount: number
  profileSteps: { label: string; complete: boolean }[] | null
  profileCompleteness: number
  topMatches: Match[]
  activity: Activity[]
  hasBio: boolean
  offersCount: number
  requestsCount: number
  matchScores: Record<string, number>
}) {
  // Read separately and forgivingly: visitors may not see circles, offers or requests
  const [peopleRes, unitsRes, offersRes, requestsRes, circles] = await Promise.all([
    supabase.from('user_profiles').select(profileColumns(!!userId, 'id, username, first_name, last_name, avatar_url, headline')).order('first_name'),
    supabase.from('org_unit_members').select('user_id, org_units(kind, circle)'),
    supabase.from('user_offers').select('user_id, title').order('created_at', { ascending: false }),
    supabase.from('user_requests').select('user_id, title:request_text').order('created_at', { ascending: false }),
    loadCircleRows(supabase),
  ])
  const circleBySlug = new Map(circles.map(c => [c.slug, { slug: c.slug, name: c.name, color: c.color ?? 'var(--ink-4)' }]))
  const circlesOf = new Map<string, string[]>()
  for (const r of (unitsRes.error ? [] : unitsRes.data ?? []) as any[]) {
    const u = Array.isArray(r.org_units) ? r.org_units[0] : r.org_units
    if (u?.kind === 'circle' && u.circle) circlesOf.set(r.user_id, [...new Set([...(circlesOf.get(r.user_id) ?? []), u.circle as string])])
  }
  const group = (rows: { user_id: string; title: string }[] | null | undefined) => {
    const m = new Map<string, string[]>()
    for (const r of rows ?? []) m.set(r.user_id, [...(m.get(r.user_id) ?? []), r.title])
    return m
  }
  const offers = group(offersRes.error ? [] : offersRes.data as any)
  const requests = group(requestsRes.error ? [] : requestsRes.data as any)

  const people: MemberCard[] = ((peopleRes.data ?? []) as any[]).map(p => ({
    id: p.id, username: p.username, avatar: p.avatar_url ?? null, headline: p.headline ?? null, you: p.id === userId,
    name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username || 'Someone',
    circles: (circlesOf.get(p.id) ?? []).map(s => circleBySlug.get(s)).filter(Boolean) as MemberCard['circles'],
    offers: offers.get(p.id) ?? [], requests: requests.get(p.id) ?? [],
    score: p.id === userId ? null : matchScores[p.id] ?? null,
  })).sort((a, b) => Number(b.you) - Number(a.you) || a.name.localeCompare(b.name))
  const missing = (profileSteps ?? []).filter(s => !s.complete).map(s => s.label.toLowerCase())

  const youCard = people.find(p => p.you)

  return (
    <div className="v4-page">
      <PageHeader
        eyebrow="Community"
        title="Members"
        subtitle={<><b>{memberCount} people</b> live and work here. See what they offer and what they’re looking for.</>}
      />

      {!userId && (
        <Card className="v4-note"><IconTile name="users" tone="red" /><span>You’re looking around as a visitor. <Link href="/auth/login">Sign in</Link> or <Link href="/auth/signup">create an account</Link> to see more about each person and find your matches.</span></Card>
      )}

      {userId && (
        <section className="mb4-top" aria-label="Your overview">
          {/* Your best matches: who you'd work well with, first */}
          <div className="mb4-matches">
            <div className="mb4-matches__head">
              <h2>Your best matches</h2>
              {hasBio && topMatches.length > 0 && <Link href="/members/matches">See all →</Link>}
            </div>
            {!hasBio ? (
              <div className="mb4-matches__empty">
                <b>Tell us a bit about you</b>
                <span>Your values, skills and goals find the people you’d work well with.</span>
                <Link href="/profile/edit" className="v4-btn v4-btn--secondary v4-btn--sm">Edit profile</Link>
              </div>
            ) : topMatches.length === 0 ? (
              <div className="mb4-matches__empty"><span>No other members yet. You’ll see your matches when they join.</span></div>
            ) : (
              <div className="mb4-matches__row">
                {topMatches.slice(0, 3).map(m => {
                  const n = nameOf(m.profile)
                  return (
                    <Link key={m.profile.id} href={m.profile.username ? `/u/${m.profile.username}` : '/members/matches'} className="mb4-match">
                      {m.profile.avatar_url
                        ? <img loading="lazy" decoding="async" src={m.profile.avatar_url} alt="" className="v4-avatar mb4-match__av" />
                        : <span className="v4-avatar mb4-match__av">{n.slice(0, 1).toUpperCase()}</span>}
                      <b>{n}</b>
                      <span className="mb4-score">{m.score}% match</span>
                      <small>{m.reasons.slice(0, 2).join(' · ') || 'Shared interests'}</small>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* You: profile (the one green next step while unfinished), offers and requests, lately */}
          <div className="mb4-side">
            {profileSteps && profileCompleteness < 100 ? (
              <Link href="/profile/edit" className="mb4-box mb4-box--next">
                <span className="mb4-box__txt">
                  <small>Your profile · {profileCompleteness}%</small>
                  <b>Finish your profile</b>
                  <span className="mb4-bar" aria-hidden><i style={{ width: `${profileCompleteness}%` }} /></span>
                  <span className="mb4-box__hint">Still to add: {missing.join(', ')}</span>
                </span>
                <span className="mb4-box__go"><Icon name="right" size={16} /></span>
              </Link>
            ) : (
              <Link href={youCard?.username ? `/u/${youCard.username}` : '/members/profile'} className="mb4-box">
                <span className="mb4-box__txt"><small>Your profile</small><b><Icon name="check" size={15} /> Complete · see how others see you</b></span>
              </Link>
            )}
            <div className="mb4-box">
              <span className="mb4-box__txt">
                <small>You</small>
                <b><Link href="/members/offers">{offersCount} {offersCount === 1 ? 'offer' : 'offers'}</Link> · <Link href="/members/requests">{requestsCount} {requestsCount === 1 ? 'request' : 'requests'}</Link></b>
              </span>
              <span className="mb4-box__links"><Link href="/members/offers"><Icon name="plus" size={13} />Offer</Link><Link href="/members/requests"><Icon name="plus" size={13} />Request</Link></span>
            </div>
            <LatelyTile activity={activity} label="Lately" />
          </div>
        </section>
      )}

      {!userId && activity.length > 0 && <div className="mb4-visitor-lately"><LatelyTile activity={activity} label="Lately" /></div>}

      <h2 className="mb4-h2">Everyone</h2>
      <MembersGridV4 people={people} circles={[...circleBySlug.values()]} signedIn={!!userId} />
    </div>
  )
}

function nameOf(p: Match['profile']) {
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username || 'Someone'
}

function LatelyTile({ activity, label }: { activity: Activity[]; label: string }) {
  return (
    <div className="mb4-box mb4-box--lately">
      <small className="mb4-box__eye">{label}</small>
      {activity.length === 0 ? <span className="mb4-box__hint">Nothing new yet.</span> : (
        <>
          <ul className="mb4-lately">{activity.slice(0, 3).map(a => <LatelyItem key={a.id} a={a} />)}</ul>
          {activity.length > 3 && (
            <details className="mb4-lately__all">
              <summary>Show {activity.length - 3} more</summary>
              <ul className="mb4-lately">{activity.slice(3).map(a => <LatelyItem key={a.id} a={a} />)}</ul>
            </details>
          )}
        </>
      )}
    </div>
  )
}

function LatelyItem({ a }: { a: Activity }) {
  return (
    <li><Link href={a.href}><b>{a.who}</b> {a.act} <small>· {ago(a.ts)}</small></Link></li>
  )
}

function ago(ts: number) {
  const d = Math.floor((Date.now() - ts) / 864e5)
  if (d < 1) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d} days ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
