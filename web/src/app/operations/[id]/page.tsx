import { createClient } from '@/core/lib/supabase/server'
import { notFound } from 'next/navigation'
import { loadTaskOptions } from '@/modules/m07-ops/lib/task-options'
import ProjectDetailClient from '@/modules/m07-ops/ProjectDetailClient'
import { isOpsAdmin } from '@/core/lib/roles'
import { fetchCircleDirectory } from '@/core/lib/ops-permissions'
import { EVENT_SELECT, toEvent } from '@/modules/m14-events/lib/queries'
import type { Project, ProjectUpdate, CollaborationAgreement, SubscriberProfile } from '@/modules/m07-ops/types'

export default async function ProjectDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ task?: string }>
}) {
  const { id } = await params
  const { task } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Public queries — no auth required
  const [
    projectRes, updatesRes,
    pendingProposalsRes, deliverablesRes,
    projectSubsRes,
  ] = await Promise.all([
    supabase.from('projects').select('*, created_by, lead_user_id').eq('id', id).single(),
    supabase.from('project_updates')
      .select('id, project_id, content, created_at, user_profiles(first_name, username)')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('collaboration_agreements')
      .select('id, user_id, work_description, expected_reward, conditions, status, created_at, user_profiles(first_name, username)')
      .eq('project_id', id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase.from('deliverables')
      .select('id, project_id, title, status, due_date, due_time, circle, source, needs_review, source_meeting_id, source_item, assignee_id, assignee_name, team_id, created_by, priority, notes, progress, from_agreement_id, user_profiles!deliverables_assignee_id_fkey(first_name, username)')
      .eq('project_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('project_subscriptions')
      .select('user_id, user_profiles(first_name, username)')
      .eq('project_id', id),
  ])

  if (!projectRes.data) notFound()
  const project = projectRes.data as Project
  const { people, projectOptions, teams } = await loadTaskOptions(supabase)
  // A task can stay in this project even when it isn't open any more
  if (!projectOptions.some(p => p.id === project.id)) projectOptions.unshift({ id: project.id, title: project.title, circle: project.circle ?? null })

  // Lead/creator display names — public
  const leadUserId = project.lead_user_id ?? project.created_by
  const creatorId = project.created_by
  const idsToFetch = [...new Set([leadUserId, creatorId].filter(Boolean) as string[])]
  const { data: memberProfilesData } = idsToFetch.length > 0
    ? await supabase.from('user_profiles').select('id, first_name, username').in('id', idsToFetch)
    : { data: [] }
  const memberProfileMap: Record<string, { first_name: string | null; username: string | null }> = Object.fromEntries(
    (memberProfilesData ?? []).map((p: any) => [p.id, { first_name: p.first_name ?? null, username: p.username ?? null }])
  )
  const leadProfile = leadUserId ? (memberProfileMap[leadUserId] ?? null) : null
  const creatorProfile = creatorId && creatorId !== leadUserId ? (memberProfileMap[creatorId] ?? null) : null

  // Deliverable subscribers — public
  const deliverableIds = (deliverablesRes.data ?? []).map((d: any) => d.id as string)
  const deliverableSubsReal = deliverableIds.length > 0
    ? await supabase
        .from('deliverable_subscriptions')
        .select('deliverable_id, user_id, user_profiles(first_name, username)')
        .in('deliverable_id', deliverableIds)
    : { data: [] }

  // Shape project subscribers
  const projectSubscribers: SubscriberProfile[] = (projectSubsRes.data ?? []).map((s: any) => ({
    user_id: s.user_id,
    first_name: s.user_profiles?.first_name ?? null,
    username: s.user_profiles?.username ?? null,
  }))

  // Shape deliverable subscribers
  const deliverableSubscribers: Record<string, SubscriberProfile[]> = {}
  for (const row of deliverableSubsReal.data ?? []) {
    const r = row as any
    if (!deliverableSubscribers[r.deliverable_id]) deliverableSubscribers[r.deliverable_id] = []
    deliverableSubscribers[r.deliverable_id].push({
      user_id: r.user_id,
      first_name: r.user_profiles?.first_name ?? null,
      username: r.user_profiles?.username ?? null,
    })
  }

  // User-specific data — only when logged in
  let userId: string | null = null
  let userRole = 'explorer'
  let leadCircles: string[] = []
  let isAdmin = false
  let isProjectCreator = false
  let isProjectSubscribed = false
  let myProposal = null

  if (user) {
    userId = user.id
    const [profileRes, myProposalRes] = await Promise.all([
      supabase.from('user_profiles').select('role, first_name, lead_circles').eq('id', user.id).maybeSingle(),
      supabase.from('collaboration_agreements')
        .select('id, work_description, expected_reward, conditions, status')
        .eq('project_id', id)
        .eq('user_id', user.id)
        .maybeSingle(),
    ])
    userRole = profileRes.data?.role ?? 'explorer'
    leadCircles = profileRes.data?.lead_circles ?? []
    isAdmin = isOpsAdmin(userRole)
    isProjectCreator = project.created_by === user.id || project.lead_user_id === user.id
    isProjectSubscribed = projectSubscribers.some(s => s.user_id === user.id)
    myProposal = myProposalRes.data ?? null
  }

  const circleDirectory = await fetchCircleDirectory(supabase)

  // M14 events linked to this project (RLS hides members-only ones from visitors)
  const { data: eventRows } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('project_id', id)
    .gte('starts_at', new Date(Date.now() - 7 * 86400000).toISOString())
    .order('starts_at', { ascending: true })

  return (
    <ProjectDetailClient
      project={project}
      updates={(updatesRes.data ?? []) as unknown as ProjectUpdate[]}
      pendingProposals={(pendingProposalsRes.data ?? []) as unknown as CollaborationAgreement[]}
      // Visitors don't see who a task is assigned to (decision #73)
      deliverables={((deliverablesRes.data ?? []) as any[]).map(d => (user ? d : { ...d, assignee_id: null, assignee_name: null, user_profiles: null })) as unknown as import('@/modules/m07-ops/types').Deliverable[]}
      myProposal={myProposal}
      userId={userId}
      userRole={userRole}
      leadCircles={leadCircles}
      circleDirectory={circleDirectory}
      isAdmin={isAdmin}
      isProjectCreator={isProjectCreator}
      projectSubscribers={projectSubscribers}
      isProjectSubscribed={isProjectSubscribed}
      deliverableSubscribers={deliverableSubscribers}
      leadProfile={leadProfile}
      creatorProfile={creatorProfile}
      projectEvents={(eventRows ?? []).map(toEvent)}
      initialTaskId={task ?? null}
      projectOptions={projectOptions}
      teams={teams}
      people={people}
    />
  )
}
