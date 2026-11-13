import { createClient } from '@/core/lib/supabase/server'
import { notFound } from 'next/navigation'
import { computeMatch } from '@/modules/m01-network/lib/match-score'
import UserProfileClient from './UserProfileClient'
import NetworkSidebar from '@/modules/m01-network/NetworkSidebar'
import { PUBLIC_PROFILE_COLUMNS } from '@/core/lib/public-profile'

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Profile being viewed + viewer's own data (for sidebar/right panel) fetched in parallel
  // Visitors may read the public card only (name, headline, bio, links); select('*') would be refused
  const profileQuery = user
    ? supabase.from('user_profiles').select('*').eq('username', username).maybeSingle()
    : supabase.from('user_profiles').select(PUBLIC_PROFILE_COLUMNS).eq('username', username).maybeSingle()
  const [profileRes, viewerProfileRes, viewerBioRes] = await Promise.all([
    profileQuery,
    user ? supabase.from('user_profiles').select('username, avatar_url, first_name, headline, city, country').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? supabase.from('user_bio').select('values_principles, skills, interests, goals, places_traveling, personality_details').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
  ])

  const profile = profileRes.data
  if (!profile) notFound()

  // The rest of the profile is for people who have signed up
  const none = Promise.resolve({ data: null })
  const [bioRes, offersRes, requestsRes, growthRes] = await Promise.all([
    user ? supabase.from('user_bio').select('*').eq('user_id', profile.id).maybeSingle() : none,
    user ? supabase.from('user_offers').select('*').eq('user_id', profile.id).eq('is_active', true) : none,
    user ? supabase.from('user_requests').select('*').eq('user_id', profile.id).eq('is_active', true) : none,
    // Returned only to the people this person chose (the database checks)
    supabase.from('user_growth').select('fears, traumas, visibility').eq('user_id', profile.id).maybeSingle(),
  ])

  // Compute match score between viewer and profile being viewed.
  // Merge city/country from each user_profile so the match function can score location proximity.
  const isOwn = user?.id === profile.id
  const viewerBioWithLoc = viewerBioRes.data && viewerProfileRes.data
    ? { ...viewerBioRes.data, city: (viewerProfileRes.data as any).city, country: (viewerProfileRes.data as any).country }
    : viewerBioRes.data
  const subjectBioWithLoc = bioRes.data
    ? { ...bioRes.data, city: (profile as any).city, country: (profile as any).country }
    : null
  const match = (!isOwn && user && viewerBioWithLoc && subjectBioWithLoc)
    ? computeMatch(viewerBioWithLoc as any, subjectBioWithLoc as any)
    : null

  const vp = viewerProfileRes.data
  const sidebarUser = vp ? { username: vp.username, first_name: vp.first_name, avatar_url: vp.avatar_url } : null

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
          growth={growthRes.data ?? null}
          match={match}
        />
      </main>
    </div>
  )
}
