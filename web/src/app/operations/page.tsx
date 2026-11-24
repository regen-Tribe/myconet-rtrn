import { isTaskOverdue } from '@/core/lib/tasks'
import { meetingCountsByCircle } from '@/modules/m18-meetings/lib/counts'
import { loadDecisions } from '@/modules/m07-ops/lib/decisions'
import { createClient } from '@/core/lib/supabase/server'
import OpsClient from '@/modules/m07-ops/OpsClient'
import { isOpsAdmin, isJoiningOrAbove } from '@/core/lib/roles'
import { promoteToMemberIfEligible } from '@/core/lib/promotions'
import { isActiveProject } from '@/core/lib/project-status'
import { fetchCircleDirectory } from '@/core/lib/ops-permissions'
import type { SubscriberProfile } from '@/modules/m07-ops/types'
import { loadTaskOptions } from '@/modules/m07-ops/lib/task-options'
import { MEMBER_SELECT, toMember } from '@/modules/m17-org/lib/org'

const OPS_TABS = ['board', 'tasks', 'updates', 'circles'] as const

export default async function OpsPage({ searchParams }: { searchParams: Promise<{ tab?: string; circle?: string; task?: string; view?: string }> }) {
  const { tab, circle, task, view } = await searchParams
  const initialTab = OPS_TABS.find(t => t === (tab === 'deliverables' ? 'tasks' : tab)) ?? 'board' // old links said ?tab=deliverables
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  let userRole = 'explorer'
  let leadCircles: string[] = []
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, lead_circles')
      .eq('id', user.id)
      .maybeSingle()
    userRole = profile?.role ?? 'explorer'
    leadCircles = profile?.lead_circles ?? []
    isAdmin = isOpsAdmin(userRole)
    userRole = await promoteToMemberIfEligible(supabase, user.id, userRole)
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, description, status, open_for_collaborators, circle, team_id, is_chores, needs, deadline, sprint_name, created_at, created_by, lead_user_id')
    .order('created_at', { ascending: false })

  const { data: deliverablesRaw } = await supabase
    .from('deliverables')
    .select('id, project_id, title, assignee_id, assignee_name, team_id, created_by, priority, due_date, due_time, circle, needs_review, status, progress, notes, source, source_meeting_id, source_item, user_profiles(username, first_name)')
    .order('due_date', { ascending: true })

  // Visitors don't see who a task is assigned to (decision #73)
  const deliverables = (deliverablesRaw ?? []).map((d: any) => (user ? d : { ...d, assignee_id: null, assignee_name: null, user_profiles: null })).map((d: any) => ({
    id: d.id as string,
    project_id: (d.project_id ?? null) as string | null,
    title: d.title as string,
    team_id: (d.team_id ?? null) as string | null,
    created_by: (d.created_by ?? null) as string | null,
    notes: (d.notes ?? null) as string | null,
    source: d.source ?? undefined,
    source_meeting_id: (d.source_meeting_id ?? null) as string | null,
    source_item: (d.source_item ?? null) as string | null,
    user_profiles: d.user_profiles ? { first_name: d.user_profiles.first_name ?? null, username: d.user_profiles.username ?? null } : null,
    assignee_id: d.assignee_id as string | null,
    assignee_name: d.assignee_name as string | null,
    priority: (d.priority as string) ?? 'none',
    due_date: d.due_date as string | null,
    due_time: d.due_time as string | null,
    circle: d.circle as string | null,
    needs_review: !!d.needs_review,
    status: (d.status as string) ?? 'backlog',
    progress: d.progress as number | null,
    assignee_username: d.user_profiles?.username ?? null,
  }))

  const { data: updatesRaw } = await supabase
    .from('project_updates')
    .select('id, project_id, user_id, content, created_at, user_profiles(first_name)')
    .order('created_at', { ascending: false })
    .limit(20)

  const updates = (updatesRaw ?? []).map((u: any) => ({
    id: u.id as string,
    project_id: u.project_id as string,
    user_id: u.user_id as string,
    content: u.content as string,
    created_at: u.created_at as string,
    author_first_name: u.user_profiles?.first_name ?? null,
  }))

  // Fetch project subscribers for board cards
  const { data: subsRaw } = await supabase
    .from('project_subscriptions')
    .select('project_id, user_id, user_profiles(first_name, username)')

  // Group subscribers by project
  const projectSubscribers: Record<string, SubscriberProfile[]> = {}
  for (const row of subsRaw ?? []) {
    const s = row as any
    if (!projectSubscribers[s.project_id]) projectSubscribers[s.project_id] = []
    projectSubscribers[s.project_id].push({
      user_id: s.user_id,
      first_name: s.user_profiles?.first_name ?? null,
      username: s.user_profiles?.username ?? null,
    })
  }

  const allProjects = projects ?? []

  // Fetch user profiles for all project creators and leads
  const uniqueUserIds = [...new Set([
    ...allProjects.map(p => p.created_by).filter(Boolean) as string[],
    ...allProjects.map(p => p.lead_user_id).filter(Boolean) as string[],
  ])]
  const { data: userProfilesData } = uniqueUserIds.length > 0
    ? await supabase.from('user_profiles').select('id, first_name, username').in('id', uniqueUserIds)
    : { data: [] }
  const userProfiles: Record<string, { first_name: string | null; username: string | null }> = Object.fromEntries(
    (userProfilesData ?? []).map((p: any) => [p.id, { first_name: p.first_name ?? null, username: p.username ?? null }])
  )
  const activeCount = allProjects.filter(p => !p.is_chores && isActiveProject(p.status)).length
  const deliverableCount = deliverables.length
  const doneCount = deliverables.filter(d => d.status === 'done').length

  const atRiskCount = deliverables.filter(d => isTaskOverdue(d.due_date, d.due_time, d.status)).length

  const sprintName = allProjects.find(p => p.sprint_name)?.sprint_name ?? null
  const circleDirectory = await fetchCircleDirectory(supabase)
  // Everything to decide, as one list (v4.114.0): drafts and the project manager's suggestions, each task once
  const pm = user ? await loadDecisions(supabase, { id: user.id, role: userRole, leadCircles }, { all: true }) : { rows: [], suggestions: [], actions: [] }

  return (
    <OpsClient
      projects={allProjects}
      deliverables={deliverables}
      updates={updates}
      activeCount={activeCount}
      deliverableCount={deliverableCount}
      doneCount={doneCount}
      atRiskCount={atRiskCount}
      isAdmin={isAdmin}
      userId={user?.id ?? null}
      userRole={userRole}
      leadCircles={leadCircles}
      sprintName={sprintName}
      projectSubscribers={projectSubscribers}
      userProfiles={userProfiles}
      canPropose={isJoiningOrAbove(userRole)}
      circleDirectory={circleDirectory}
      initialTab={initialTab}
      meetingCounts={user ? await meetingCountsByCircle(supabase) : null}
      initialCircle={circle ?? null}
      pmSuggestions={pm.suggestions}
      pmActions={pm.actions}
      decisions={pm.rows}
      initialTaskId={task ?? null}
      initialView={view === 'tasks' ? 'tasks' : 'projects'}
      {...await loadCircleMembers(supabase)}
      {...await loadTaskOptions(supabase)}
    />
  )
}

// Ops › Circles: each circle's place in the org chart and who's in it (v4.35.0)
async function loadCircleMembers(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: units } = await supabase.from('org_units').select('id, circle').eq('kind', 'circle')
  const ids = (units ?? []).map(u => u.id as string)
  const { data: rows } = ids.length ? await supabase.from('org_unit_members').select(MEMBER_SELECT).in('unit_id', ids) : { data: [] }
  return { circleUnits: (units ?? []) as { id: string; circle: string }[], circleMembers: (rows ?? []).map(toMember) }
}
