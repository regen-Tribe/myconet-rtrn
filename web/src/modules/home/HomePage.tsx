import { createClient } from '@/core/lib/supabase/server'
import { computeOverallReadiness, computeGatesPassed, computePhaseProgress, type Values } from '@/modules/m04-blueprint/lib/blueprint-compute'
import { computeMatch } from '@/modules/m01-network/lib/match-score'
import HomeClient from '@/modules/home/HomeClient'
import { buildGlanceTiles } from '@/modules/home/lib/at-a-glance'
import { loadModulePreviews } from '@/modules/home/lib/preview-data'
import { communityName as getCommunityName } from '@/core/lib/instance'
import { ACTIVE_PROJECT_STATUSES } from '@/core/lib/project-status'
import { EVENT_SELECT, toEvent } from '@/modules/m14-events/lib/queries'
import { isFullMember as checkFullMember, isJoiningOrAbove } from '@/core/lib/roles'
import { profileColumns } from '@/core/lib/public-profile'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    blueprintRes,
    memberCountRes,
    membersRes,
    valuesRes,
    projectsRes,
    activeProjectCountRes,
    deliverablesRes,
    eventsRes,
    previews,
  ] = await Promise.all([
    supabase.from('blueprints').select('answers, updated_at').eq('is_community', true).maybeSingle(),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('user_profiles')
      .select(profileColumns(!!user, 'id, first_name, last_name, username, headline, city, country, avatar_url, user_types'))
      .order('created_at', { ascending: false })
      .limit(4),
    supabase.from('community_values').select('id, title, description, sort_order').order('sort_order'),
    supabase.from('projects')
      .select('id, title, description, needs, open_for_collaborators, status')
      .in('status', [...ACTIVE_PROJECT_STATUSES])
      .limit(3),
    supabase.from('projects').select('id', { count: 'exact', head: true }).in('status', [...ACTIVE_PROJECT_STATUSES]),
    supabase.from('deliverables')
      .select('id, title, status, due_date, project_id, user_profiles(username)')
      .order('created_at', { ascending: false })
      .limit(5),
    // M14 — logged-out visitors get public events only (RLS)
    supabase.from('events')
      .select(EVENT_SELECT)
      .gte('starts_at', new Date(Date.now() - 86400000).toISOString())
      .order('starts_at', { ascending: true })
      .limit(10),
    loadModulePreviews(supabase),
  ])

  const bp = blueprintRes.data as { answers: unknown; updated_at: string } | null
  const bpAnswers = (bp?.answers ?? {}) as Values
  const overall = bp ? computeOverallReadiness(bpAnswers) : null
  const gatesPassed = bp ? computeGatesPassed(bpAnswers) : null
  const phaseProgress = bp ? computePhaseProgress(bpAnswers) : []
  const communityName = getCommunityName(bpAnswers)
  const communityPurpose = (bpAnswers.purpose as string) || null
  const landSize = (bpAnswers.land_size as string) || null
  const plannedHomes = (bpAnswers.planned_homes as string) || null
  const projectCountry = (bpAnswers.project_country as string) || null
  const memberCount = memberCountRes.count ?? 0
  const activeProjectCount = activeProjectCountRes.count ?? 0

  let firstName: string | null = null
  let hasApplied = false
  let isFullMember = false
  let role = 'explorer'
  let applicationStatus: string | null = null
  let joiningRewardNew = false
  const matchScores: Record<string, { score: number; reasons: string[] }> = {}

  if (user) {
    const memberIds = (membersRes.data ?? []).map((m: any) => m.id)
    const [profileRes, appRes, myBioRes, memberBiosRes] = await Promise.all([
      supabase.from('user_profiles').select('first_name, role, city, country').eq('id', user.id).maybeSingle(),
      supabase.from('applications').select('status').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_bio').select('*').eq('user_id', user.id).maybeSingle(),
      memberIds.length > 0
        ? supabase.from('user_bio').select('*').in('user_id', memberIds)
        : Promise.resolve({ data: [] }),
    ])
    firstName = profileRes.data?.first_name ?? null
    hasApplied = !!appRes.data
    role = profileRes.data?.role ?? 'explorer'
    applicationStatus = appRes.data?.status ?? null
    isFullMember = checkFullMember(role)

    if (isJoiningOrAbove(role)) {
      const { error } = await supabase.from('user_achievements').upsert(
        { user_id: user.id, achievement_key: 'community_joiner' },
        { onConflict: 'user_id,achievement_key', ignoreDuplicates: true }
      )
      joiningRewardNew = !error
    }

    // Merge city/country from user_profiles into bios so computeMatch can score location.
    const myBio = myBioRes.data
      ? { ...myBioRes.data, city: profileRes.data?.city, country: profileRes.data?.country }
      : null
    const memberLocById = new Map<string, { city?: string | null; country?: string | null }>()
    for (const m of (membersRes.data ?? []) as any[]) memberLocById.set(m.id, { city: m.city, country: m.country })
    for (const b of (memberBiosRes as any).data ?? []) {
      const loc = memberLocById.get(b.user_id) ?? {}
      matchScores[b.user_id] = computeMatch(myBio as any, { ...b, city: loc.city, country: loc.country })
    }
  }

  return (
    <HomeClient
      firstName={firstName}
      communityName={communityName}
      glance={buildGlanceTiles(bpAnswers as Record<string, unknown>)}
      communityPurpose={communityPurpose}
      phaseProgress={phaseProgress}
      overall={overall}
      gatesPassed={gatesPassed}
      landSize={landSize}
      plannedHomes={plannedHomes}
      projectCountry={projectCountry}
      memberCount={memberCount}
      members={(membersRes.data ?? []) as any[]}
      communityValues={(valuesRes.data ?? []) as any[]}
      projects={(projectsRes.data ?? []) as any[]}
      activeProjectCount={activeProjectCount}
      deliverables={(deliverablesRes.data ?? []) as any[]}
      isLoggedIn={!!user}
      hasApplied={hasApplied}
      isFullMember={isFullMember}
      role={role}
      applicationStatus={applicationStatus}
      joiningRewardNew={joiningRewardNew}
      matchScores={matchScores}
      upcomingEvents={(eventsRes.data ?? []).map(toEvent)}
      previews={previews}
    />
  )
}
