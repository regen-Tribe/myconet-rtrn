import { createClient } from '@/core/lib/supabase/server'
import { notFound } from 'next/navigation'
import { computeMatch } from '@/modules/m01-network/lib/match-score'
import UserProfileClient from './UserProfileClient'
import NetworkSidebar from '@/modules/m01-network/NetworkSidebar'
import { PUBLIC_PROFILE_COLUMNS, SIGNED_IN_PROFILE_COLUMNS, profileDetailsOf } from '@/core/lib/public-profile'
import { isJoiningOrAbove } from '@/core/lib/roles'
import { DESIGN } from '@/core/lib/instance'

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Profile being viewed + viewer's own data (for sidebar/right panel) fetched in parallel
  // Visitors may read the public card only (name, headline, bio, links); select('*') would be refused
  const profileQuery = user
    ? supabase.from('user_profiles').select(SIGNED_IN_PROFILE_COLUMNS).eq('username', username).maybeSingle()
    : supabase.from('user_profiles').select(PUBLIC_PROFILE_COLUMNS).eq('username', username).maybeSingle()
  const [profileRes, viewerProfileRes, viewerBioRes] = await Promise.all([
    profileQuery,
    user ? supabase.from('user_profiles').select('username, avatar_url, first_name, headline, role').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? supabase.from('user_bio').select('values_principles, skills, interests, goals, places_traveling, personality_details').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
  ])

  const found = profileRes.data as Record<string, any> | null
  if (!found) notFound()
  // City, country and kinds of people: joining members and up, and yourself (decision #71)
  const [subjectDetails, viewerDetails] = user
    ? await Promise.all([profileDetailsOf(supabase, found.id), profileDetailsOf(supabase, user.id)])
    : [null, null]
  const profile = { ...found, ...subjectDetails } as Record<string, any> & { id: string }
  const viewerRole = (viewerProfileRes.data as { role?: string } | null)?.role ?? 'explorer'

  // The rest of the profile is for people who have signed up
  const none = Promise.resolve({ data: null })
  const [bioRes, offersRes, requestsRes, growthRes] = await Promise.all([
    user ? supabase.from('user_bio').select('*').eq('user_id', profile.id).maybeSingle() : none,
    // What people offer is public (decision #71)
    supabase.from('user_offers').select('*').eq('user_id', profile.id).eq('is_active', true),
    user ? supabase.from('user_requests').select('*').eq('user_id', profile.id).eq('is_active', true) : none,
    // Returned only to the people this person chose (the database checks)
    supabase.from('user_growth').select('fears, traumas, visibility').eq('user_id', profile.id).maybeSingle(),
  ])

  // Compute match score between viewer and profile being viewed.
  // Merge city/country from each user_profile so the match function can score location proximity.
  const isOwn = user?.id === profile.id
  const viewerBioWithLoc = viewerBioRes.data && viewerProfileRes.data
    ? { ...viewerBioRes.data, city: viewerDetails?.city, country: viewerDetails?.country }
    : viewerBioRes.data
  const subjectBioWithLoc = bioRes.data
    ? { ...bioRes.data, city: (profile as any).city, country: (profile as any).country }
    : null
  const match = (!isOwn && user && viewerBioWithLoc && subjectBioWithLoc)
    ? computeMatch(viewerBioWithLoc as any, subjectBioWithLoc as any)
    : null

  // The v4 look lists this person's circles beside the profile (read forgivingly: visitors may not see them)
  let circles: { slug: string; lead: boolean }[] = []
  if (DESIGN === 'v4') {
    const [unitsRes, leadRes] = await Promise.all([
      supabase.from('org_unit_members').select('role, org_units(kind, circle)').eq('user_id', profile.id),
      supabase.rpc('public_circle_directory'),
    ])
    const out = new Map<string, boolean>()
    for (const r of (leadRes.error ? [] : leadRes.data ?? []) as any[]) {
      if (r.id === profile.id && r.role === 'circle_lead') for (const c of (r.lead_circles ?? []) as string[]) out.set(c, true)
    }
    for (const r of (unitsRes.error ? [] : unitsRes.data ?? []) as any[]) {
      const u = Array.isArray(r.org_units) ? r.org_units[0] : r.org_units
      if (u?.circle && !out.get(u.circle)) out.set(u.circle, u.kind === 'circle' && r.role === 'lead')
    }
    circles = [...out].map(([slug, lead]) => ({ slug, lead }))
  }

  const vp = viewerProfileRes.data
  const sidebarUser = vp ? { username: vp.username, first_name: vp.first_name, avatar_url: vp.avatar_url } : null

  if (DESIGN === 'v4') {
    return (
      <UserProfileClient
        profile={profile as any} bio={bioRes.data ?? null} offers={offersRes.data ?? []} requests={requestsRes.data ?? []}
        isOwn={isOwn} signedIn={!!user} fullProfile={isOwn || (!!user && isJoiningOrAbove(viewerRole))} growth={growthRes.data ?? null} match={match} circles={circles}
      />
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 52px)', alignItems: 'flex-start' }}>
      <NetworkSidebar user={sidebarUser} />
      <main className="net-content" style={{ flex: 1, minWidth: 0 }}>
        <UserProfileClient
          profile={profile as any}
          bio={bioRes.data ?? null}
          offers={offersRes.data ?? []}
          requests={requestsRes.data ?? []}
          isOwn={isOwn}
          signedIn={!!user}
          fullProfile={isOwn || (!!user && isJoiningOrAbove(viewerRole))}
          growth={growthRes.data ?? null}
          match={match}
        />
      </main>
    </div>
  )
}
