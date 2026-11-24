import type { SupabaseClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Card, Icon, IconTile, PageHeader } from '@/core/components/v4'
import { profileColumns } from '@/core/lib/public-profile'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import { loadCircleRows } from '@/core/lib/circles-server'
import { DESIGN_REVIEW } from '@/core/lib/instance'
import MembersGridV4, { type MemberCard } from './MembersGridV4'
import MembersEveryone from './MembersEveryone'
import './members-v4.css'

type Match = { profile: { id: string; username: string | null; first_name: string | null; last_name: string | null; avatar_url: string | null }; score: number; reasons: string[] }
type Activity = { id: string; who: string; act: string; href: string; ts: number }

/**
 * Members in the v4 look (Sonia's prototype, 19 Nov; "matches first", 20 Nov). Your best matches lead the
 * page, with your profile and members' activity beside them; then everyone as uniform
 * cards (with your match % on each) you can search and filter by circle.
 */
export default async function MembersV4({ supabase, userId, joined = !!userId, memberCount, profileSteps, profileCompleteness, topMatches, activity, hasBio, matchScores }: {
  supabase: SupabaseClient
  userId: string | null
  /** Joining member and up: sees people's whole profiles and matches (decision #71) */
  joined?: boolean
  memberCount: number
  profileSteps: { label: string; complete: boolean }[] | null
  profileCompleteness: number
  topMatches: Match[]
  activity: Activity[]
  hasBio: boolean
  matchScores: Record<string, number>
}) {
  // Read separately and forgivingly: visitors may not see circles, offers or requests
  const [peopleRes, unitsRes, offersRes, requestsRes, circles, biosRes] = await Promise.all([
    supabase.from('user_profiles').select(profileColumns(!!userId, 'id, username, first_name, last_name, avatar_url, headline')).eq('approved', true).order('first_name'),
    supabase.from('org_unit_members').select('user_id, org_units(kind, circle)'),
    supabase.from('user_offers').select('user_id, title, category').order('created_at', { ascending: false }),
    supabase.from('user_requests').select('user_id, title:request_text').order('created_at', { ascending: false }),
    loadCircleRows(supabase),
    // Design review's Filter (skills): only signed in, where bios are readable
    DESIGN_REVIEW && userId ? supabase.from('user_bio').select('user_id, skills') : Promise.resolve({ data: [], error: null }),
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
  const offerKinds = group(offersRes.error ? [] : ((offersRes.data ?? []) as any[]).filter(o => o.category).map(o => ({ user_id: o.user_id, title: o.category })))
  const skillsOf = new Map<string, string[]>()
  for (const b of (biosRes.error ? [] : biosRes.data ?? []) as { user_id: string; skills: unknown }[]) {
    if (Array.isArray(b.skills)) skillsOf.set(b.user_id, [...new Set((b.skills as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim() !== '').map(x => x.trim()))])
  }

  const people: MemberCard[] = ((peopleRes.data ?? []) as any[]).map(p => ({
    id: p.id, username: p.username, avatar: p.avatar_url ?? null, headline: p.headline ?? null, you: p.id === userId,
    name: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username || 'Someone',
    circles: (circlesOf.get(p.id) ?? []).map(s => circleBySlug.get(s)).filter(Boolean) as MemberCard['circles'],
    offers: offers.get(p.id) ?? [], requests: requests.get(p.id) ?? [],
    offerKinds: [...new Set(offerKinds.get(p.id) ?? [])], skills: skillsOf.get(p.id) ?? [],
    score: p.id === userId ? null : matchScores[p.id] ?? null,
  })).sort((a, b) => Number(b.you) - Number(a.you) || a.name.localeCompare(b.name))
  const missing = (profileSteps ?? []).filter(s => !s.complete).map(s => s.label.toLowerCase())

  const youCard = people.find(p => p.you)

  // Design review (decision #22): people first. Title and its line, one toolbar row (views, search, Filter),
  // the people, then what's new. Best matches are the "Matches for you" view; finishing your profile is the
  // menu's next step; the visitor banner is the menu's Create account.
  if (DESIGN_REVIEW) return (
    <div className="v4-page">
      <PageHeader
        eyebrow="Community"
        title="Members"
        subtitle={<><b>{memberCount} people</b> live and work here. See what they offer and what they’re looking for.</>}
      />
      <MembersEveryone people={people} circles={[...circleBySlug.values()]} signedIn={!!userId} />
      <NewThisWeek activity={activity} />
    </div>
  )

  return (
    <div className="v4-page">
      <PageHeader
        eyebrow="Community"
        title="Members"
        subtitle={<><b>{memberCount} people</b> live and work here. See what they offer and what they’re looking for.</>}
      />

      {/* Design review: no visitor banner; the menu's next step says Create account once */}
      {!userId && !DESIGN_REVIEW && (
        <Card className="v4-note"><IconTile name="users" tone="red" /><span>You’re looking around as a visitor. <Link href="/auth/login">Sign in</Link> or <Link href="/auth/signup">create an account</Link> to see more about each person and find your matches.</span></Card>
      )}

      {userId && !joined && (
        <p className="v4-hint">More about each person, and your matches, open once you’ve joined {COMMUNITY_NAME}. <Link href="/join">Start joining</Link></p>
      )}

      {userId && joined && (
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
                      <span className="mb4-match__txt"><b>{n}</b><small>{m.reasons.slice(0, 2).join(' · ') || 'Shared interests'}</small></span>
                      <span className="mb4-score">{m.score}%</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* You: profile (the one green next step while unfinished), then members' activity */}
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
            <LatelyTile activity={activity} label="Members activity" />
          </div>
        </section>
      )}

      {!userId && activity.length > 0 && <div className="mb4-visitor-lately"><LatelyTile activity={activity} label="Members activity" /></div>}

      <h2 className="mb4-h2">Everyone</h2>
      <MembersGridV4 people={people} circles={[...circleBySlug.values()]} signedIn={!!userId} />
    </div>
  )
}

function nameOf(p: Match['profile']) {
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username || 'Someone'
}

/** Under the people: who joined, offered or asked lately. "New this week" when there is something from the
 *  last seven days, else "Lately"; three rows and Show more. Hidden when there is nothing at all. */
function NewThisWeek({ activity }: { activity: Activity[] }) {
  if (activity.length === 0) return null
  const week = activity.filter(a => Date.now() - a.ts < 7 * 864e5)
  const list = week.length > 0 ? week : activity
  return (
    <section className="mbr-new" aria-labelledby="mbr-new-h">
      <h2 id="mbr-new-h">{week.length > 0 ? 'New this week' : 'Lately'}</h2>
      <ul className="mb4-lately">{list.slice(0, 3).map(a => <LatelyItem key={a.id} a={a} />)}</ul>
      {list.length > 3 && (
        <details className="mb4-lately__all">
          <summary>Show {list.length - 3} more</summary>
          <ul className="mb4-lately">{list.slice(3).map(a => <LatelyItem key={a.id} a={a} />)}</ul>
        </details>
      )}
    </section>
  )
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
