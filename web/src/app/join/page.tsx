import { createClient } from '@/core/lib/supabase/server'
import JoinClient from '@/modules/m05-join/JoinClient'
import JoinAdminClient from '@/modules/m05-join/JoinAdminClient'
import { isAdmin, isCircleAdmin } from '@/core/lib/roles'
import { DESIGN } from '@/core/lib/instance'
import { loadApplications, loadJoinQuestions } from '@/modules/m05-join/applications-server'

export default async function JoinPage() {
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
    ? supabase.from('user_profiles').select('id, first_name, headline, city').eq('approved', true).neq('id', user.id).limit(3)
    : supabase.from('user_profiles').select('id, first_name, headline').eq('approved', true).limit(3)
  const { data: buddiesData } = await buddiesQuery
  const buddyProfiles = (buddiesData ?? []) as any

  let existingApplication: { status: string; answers: Record<string, string>; created_at: string } | null = null
  let userProfile: { first_name: string | null; last_name: string | null; headline: string | null; city: string | null; country: string | null } | null = null
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
        .select('first_name, last_name, headline, city, country')
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
    userProfile = profileRes.data as any
    signedValueIds = (signaturesRes.data ?? []).map((s: any) => s.value_id)
    hasContribution = (contributionRes.data?.length ?? 0) > 0
    hasOwnProject = (ownProjectRes.data?.length ?? 0) > 0
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
