import { createClient } from '@/core/lib/supabase/server'
import JoinClient from '@/modules/m05-join/JoinClient'
import JoinAdminClient from '@/modules/m05-join/JoinAdminClient'
import { profileDetailsOf, withProfileDetails } from '@/core/lib/public-profile'
import { isAdmin, isCircleAdmin } from '@/core/lib/roles'
import { DESIGN, DESIGN_REVIEW } from '@/core/lib/instance'
import JoinReview from '@/modules/m05-join/JoinReview'
import type { JoinStepKey } from '@/core/lib/join-path'
import { loadApplications, loadJoinQuestions } from '@/modules/m05-join/applications-server'
import { pillStats } from '@/core/lib/skills-interests'

export default async function JoinPage(props: { searchParams?: Promise<{ step?: string; part?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const questions = await loadJoinQuestions(supabase)

  let role = 'explorer'
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    role = profile?.role ?? 'explorer'
  }

  const canReview = isCircleAdmin(role)
  const canDecide = isAdmin(role)

  // Always fetch community data — the roadmap is shown to all users
  const { data: valuesData } = await supabase
    .from('community_values')
    .select('id, title, description, sort_order')
    .order('sort_order')
  const communityValues = (valuesData ?? []) as { id: string; title: string; description: string; sort_order: number }[]

  const buddiesQuery = user
    ? supabase.from('user_profiles').select('id, first_name, headline').eq('approved', true).neq('id', user.id).limit(3)
    : supabase.from('user_profiles').select('id, first_name, headline').eq('approved', true).limit(3)
  const { data: buddiesData } = await buddiesQuery
  // City opens at joining member (decision #71): withProfileDetails leaves it empty for explorers
  const buddyProfiles = (user ? await withProfileDetails(supabase, buddiesData as { id: string }[]) : buddiesData ?? []) as any

  let existingApplication: { status: string; answers: Record<string, string>; created_at: string } | null = null
  let userProfile: { first_name: string | null; last_name: string | null; headline: string | null; city: string | null; country: string | null; avatar_url?: string | null } | null = null
  let signedValueIds: string[] = []
  let hasContribution = false
  let hasOwnProject = false

  if (user) {
    const [appRes, profileRes, signaturesRes, contributionRes, ownProjectRes] = await Promise.all([
      supabase
        .from('applications')
        .select('status, answers, created_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('user_profiles')
        .select('first_name, last_name, headline, avatar_url, public_bio')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('value_signatures')
        .select('value_id')
        .eq('user_id', user.id),
      supabase
        .from('collaboration_agreements')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['accepted', 'active', 'completed'])
        .limit(1),
      supabase
        .from('projects')
        .select('id')
        .eq('created_by', user.id)
        .limit(1),
    ])

    existingApplication = appRes.data as any
    userProfile = profileRes.data ? { ...profileRes.data, ...(await profileDetailsOf(supabase, user.id)) } as any : null
    signedValueIds = (signaturesRes.data ?? []).map((s: any) => s.value_id)
    hasContribution = (contributionRes.data?.length ?? 0) > 0
    hasOwnProject = (ownProjectRes.data?.length ?? 0) > 0
  }

  // The design review's Join: three steps (Get to know us · About you · Apply, #80 #81), the same as the menu's next step
  if (DESIGN_REVIEW) {
    const params = await props.searchParams
    const step = params?.step
    // Step 2 starts from what the person already has: offers, skills, interests, values, requests (#81, #89, #90), and
    // how many people here list each pill, for "Popular here" and "You might also pick" (counts only, no names)
    const [offerRes, bioRes, requestRes, everyoneRes] = user
      ? await Promise.all([
          supabase.from('user_offers').select('title').eq('user_id', user.id),
          supabase.from('user_bio').select('skills, interests, values_principles').eq('user_id', user.id).maybeSingle(),
          supabase.from('user_requests').select('id, request_text').eq('user_id', user.id).order('created_at'),
          supabase.from('user_bio').select('skills, interests'),
        ])
      : [{ data: null }, { data: null }, { data: null }, { data: null }]
    const everyone = (everyoneRes.data ?? []) as { skills: string[] | null; interests: string[] | null }[]
    const b = bioRes.data as { skills: string[] | null; interests: string[] | null; values_principles: string | null } | null
    return (
      <JoinReview userId={user?.id ?? null} role={role} values={communityValues} initialSigned={signedValueIds} questions={questions}
        profile={userProfile} offers={((offerRes.data ?? []) as { title: string }[]).map(o => o.title)}
        bio={b ? { skills: b.skills ?? [], interests: b.interests ?? [], values_principles: b.values_principles } : null}
        requests={(requestRes.data ?? []) as { id: string; request_text: string }[]}
        pillStats={pillStats(everyone.flatMap(x => [x.skills, x.interests]))}
        application={existingApplication}
        initialStep={(['values', 'profile', 'application'] as const).find(k => k === step) as JoinStepKey | undefined ?? null}
        initialPart={Math.max(0, (Number(params?.part) || 1) - 1)} />
    )
  }

  const isProfileComplete = !!(userProfile?.first_name && userProfile?.headline)

  // Admins and circle leads can read applications. Only an admin can decide one.
  // With the v4 look they're in Admin › Applications instead, so Join is only the newcomer's page.
  const showReview = canReview && DESIGN !== 'v4'
  const adminApps = showReview ? await loadApplications(supabase) : []

  return (
    <>
      <JoinClient
        userId={user?.id ?? null}
        userRole={role}
        existingApplication={existingApplication}
        userProfile={userProfile}
        communityValues={communityValues}
        questions={questions}
        initialSignedValueIds={signedValueIds}
        buddyProfiles={buddyProfiles}
        isProfileComplete={isProfileComplete}
        hasContribution={hasContribution}
        hasOwnProject={hasOwnProject}
      />
      {showReview && (
        <div style={{ borderTop: '1px solid var(--rule)' }}>
          <JoinAdminClient applications={adminApps} questions={questions} canDecide={canDecide} />
        </div>
      )}
    </>
  )
}
