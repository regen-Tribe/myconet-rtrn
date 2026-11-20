import type { SupabaseClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Button, Card, IconTile, List, ListRow, NextStep, PageHeader, SectionHead, Tag } from '@/core/components/v4'
import { profileColumns } from '@/core/lib/public-profile'
import { loadCircleRows } from '@/core/lib/circles-server'
import MembersGridV4, { type MemberCard } from './MembersGridV4'

type Match = { profile: { id: string; username: string | null; first_name: string | null; last_name: string | null; avatar_url: string | null }; score: number; reasons: string[] }
type Activity = { id: string; who: string; act: string; href: string; ts: number }

/**
 * Members in the v4 look (Sonia's prototype, 19 Nov). Everything the classic page showed is here, laid
 * out the new way: finish your profile, your best matches, what's new, and everyone as cards you can
 * filter by circle (the classic page listed only the newest eight).
 */
export default async function MembersV4({ supabase, userId, memberCount, profileSteps, profileCompleteness, topMatches, activity, hasBio }: {
  supabase: SupabaseClient
  userId: string | null
  memberCount: number
  profileSteps: { label: string; complete: boolean }[] | null
  profileCompleteness: number
  topMatches: Match[]
  activity: Activity[]
  hasBio: boolean
}) {
  // Read separately and forgivingly: visitors may not see circles, offers or requests
  const [peopleRes, unitsRes, offersRes, requestsRes, circles] = await Promise.all([
    supabase.from('user_profiles').select(profileColumns(!!userId, 'id, username, first_name, last_name, avatar_url, headline')).order('first_name'),
    supabase.from('org_unit_members').select('user_id, org_units(kind, circle)'),
    supabase.from('user_offers').select('user_id, title').order('created_at', { ascending: false }),
    supabase.from('user_requests').select('user_id, title').order('created_at', { ascending: false }),
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
  })).sort((a, b) => Number(b.you) - Number(a.you) || a.name.localeCompare(b.name))
  const missing = (profileSteps ?? []).filter(s => !s.complete).map(s => s.label.toLowerCase())

  return (
    <div className="v4-page">
      <PageHeader
        eyebrow="Community"
        title="Members"
        subtitle={<><b>{memberCount} people</b> live and work here. See what they offer and what they’re looking for.</>}
        actions={userId ? <Button variant="secondary" href="/members/offers" icon="plus">Add an offer</Button> : undefined}
      />

      {!userId && (
        <Card className="v4-note"><IconTile name="users" tone="red" /><span>You’re looking around as a visitor. <Link href="/auth/login">Sign in</Link> or <Link href="/auth/signup">create an account</Link> to see more about each person and find your matches.</span></Card>
      )}

      {userId && profileSteps && profileCompleteness < 100 && (
        <NextStep eyebrow={`Your profile · ${profileCompleteness}%`} title="Finish your profile" text={`Still to add: ${missing.join(', ')}. It’s how people find you.`} href="/profile/edit" />
      )}

      <MembersGridV4 people={people} circles={[...circleBySlug.values()]} />

      <div className="v4-split v4-mt">
        {userId && (
          <div>
            <SectionHead title="Your matches" action={{ href: '/members/matches', label: 'See all →' }} />
            {!hasBio ? (
              <Card><b>Tell us a bit about you</b><p className="v4-hint">Your values, skills and goals find the people you’d work well with.</p><div className="v4-mt"><Button href="/profile/edit">Edit profile</Button></div></Card>
            ) : topMatches.length === 0 ? (
              <Card><p className="v4-hint">No other members yet. You’ll see your matches when they join.</p></Card>
            ) : (
              <List>
                {topMatches.slice(0, 4).map(m => {
                  const name = [m.profile.first_name, m.profile.last_name].filter(Boolean).join(' ') || m.profile.username || 'Someone'
                  return (
                    <ListRow key={m.profile.id} href={m.profile.username ? `/u/${m.profile.username}` : undefined}
                      lead={m.profile.avatar_url ? <img src={m.profile.avatar_url} alt="" className="v4-avatar" /> : <span className="v4-avatar">{name.slice(0, 1).toUpperCase()}</span>}
                      title={name} meta={m.reasons.slice(0, 2).join(' · ') || 'Shared interests'}
                      trail={<Tag>{m.score}% match</Tag>} />
                  )
                })}
              </List>
            )}
          </div>
        )}
        {activity.length > 0 && (
          <div>
            <SectionHead title="Lately" />
            <List>
              {activity.map(a => (
                <ListRow key={a.id} href={a.href}
                  lead={<span className="v4-avatar">{a.who.slice(0, 1).toUpperCase()}</span>}
                  title={a.who} meta={`${a.act} · ${ago(a.ts)}`} />
              ))}
            </List>
          </div>
        )}
      </div>
    </div>
  )
}

function ago(ts: number) {
  const d = Math.floor((Date.now() - ts) / 864e5)
  if (d < 1) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d} days ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
