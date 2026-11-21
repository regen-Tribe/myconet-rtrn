import { createClient } from '@/core/lib/supabase/server'
import { redirect } from 'next/navigation'
import LandingClient from './LandingClient'
import { EVENT_SELECT, toEvent } from '@/modules/m14-events/lib/queries'
import { ACTIVE_PROJECT_STATUSES } from '@/core/lib/project-status'
import { buildGlanceTiles } from '@/modules/home/lib/at-a-glance'
import { loadModulePreviews } from '@/modules/home/lib/preview-data'
import { communityName as getCommunityName } from '@/core/lib/instance'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/home')

  const { data: bp } = await supabase
    .from('blueprints')
    .select('answers')
    .eq('is_community', true)
    .maybeSingle()
  const answers = (bp?.answers ?? null) as Record<string, unknown> | null
  const communityPurpose = (answers?.purpose as string) || null
  const communityName = getCommunityName(answers)
  const glance = buildGlanceTiles(answers)

  // Visitors are logged out here, so RLS returns public events only
  const { data: eventRows } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .gte('starts_at', new Date(Date.now() - 86400000).toISOString())
    .order('starts_at', { ascending: true })
    .limit(10)

  const [members, projects, deliverables, proposals, previews] = await Promise.all([
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('projects').select('id', { count: 'exact', head: true }).in('status', [...ACTIVE_PROJECT_STATUSES]),
    supabase.from('deliverables').select('id', { count: 'exact', head: true }),
    supabase.from('proposals').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    loadModulePreviews(supabase),
  ])
  const { data: values } = await supabase.from('community_values').select('title, description').order('sort_order')
  const stats = {
    members: members.count ?? 0,
    activeProjects: projects.count ?? 0,
    deliverables: deliverables.count ?? 0,
    openProposals: proposals.count ?? 0,
  }

  return <LandingClient firstName={null} communityPurpose={communityPurpose} upcomingEvents={(eventRows ?? []).map(toEvent)} stats={stats} communityName={communityName} glance={glance} previews={previews} values={values ?? []} />
}
