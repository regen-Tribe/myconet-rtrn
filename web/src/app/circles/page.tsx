import { meetingCountsByCircle } from '@/modules/m18-meetings/lib/counts'
import { suggestionCountsByCircle } from '@/modules/m07-ops/lib/pm-data'
import { createClient } from '@/core/lib/supabase/server'
import { DESIGN } from '@/core/lib/instance'
import { Suspense } from 'react'
import OrgChartClient from '@/modules/m17-org/OrgChartClient'
import { fetchCircleDirectory } from '@/core/lib/ops-permissions'
import { MEMBER_SELECT, toMember, toPerson } from '@/modules/m17-org/lib/org'
import type { OrgPerson, OrgUnit } from '@/modules/m17-org/types'
import type { JoinRequest } from '@/modules/m17-org/JoinRequests'
import { isJoiningOrAbove } from '@/core/lib/roles'
import { loadCircleExtras } from '@/modules/m17-org/lib/circle-extras'

/** M17 Org chart — public; admins, circle leads and team leads edit their parts. */
export default async function OrgPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c: openCircle } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role = 'explorer'
  let leadCircles: string[] = []
  if (user) {
    const { data: profile } = await supabase.from('user_profiles').select('role, lead_circles').eq('id', user.id).maybeSingle()
    role = profile?.role ?? 'explorer'
    leadCircles = profile?.lead_circles ?? []
  }

  const [unitsRes, membersRes, directory, meetingCounts, allPm] = await Promise.all([
    supabase.from('org_units').select('id, kind, circle, name, description, sort_order').order('sort_order'),
    supabase.from('org_unit_members').select(MEMBER_SELECT),
    fetchCircleDirectory(supabase),
    user ? meetingCountsByCircle(supabase) : Promise.resolve(null),
    user ? suggestionCountsByCircle(supabase) : Promise.resolve({} as Record<string, number>),
  ])
  // The Project manager button only for the circles this person decides (admins: all)
  const pmCounts = Object.fromEntries(Object.entries(allPm).filter(([c]) => role === 'admin' || (role === 'circle_lead' && leadCircles.includes(c))))
  const members = (membersRes.data ?? []).map(toMember)

  // The member picker needs everyone — only for people who might edit (admins,
  // circle leads, or team leads)
  let people: OrgPerson[] = []
  const mightEdit = role === 'admin' || role === 'circle_lead' || members.some(m => m.user_id === user?.id && m.role === 'lead')
  if (user && mightEdit) {
    const { data } = await supabase.from('user_profiles').select('id, first_name, last_name, username').order('first_name')
    people = (data ?? []).map(toPerson).filter((p): p is OrgPerson => !!p)
  }
  // People asking to join a circle: the database shows each lead only their circles' requests (admins: all)
  let joinRequests: JoinRequest[] = []
  if (user && (role === 'admin' || role === 'circle_lead')) {
    const { data } = await supabase.from('circle_join_requests')
      .select('id, circle, user_id, note, created_at, person:user_profiles!circle_join_requests_user_id_fkey(id, first_name, last_name, username)')
      .eq('status', 'pending').order('created_at')
    joinRequests = (data ?? []).map((r: any) => ({
      id: r.id, circle: r.circle, user_id: r.user_id, note: r.note, created_at: r.created_at,
      name: toPerson(Array.isArray(r.person) ? r.person[0] : r.person)?.name ?? 'Someone',
    }))
  }

  // The v4 look also shows photos, each circle's open tasks, meetings and guides (v4.63.0)
  const peopleIds = [...new Set([...members.map(m => m.user_id), ...Object.values(directory.leads).flat().map(l => l.id), ...directory.admins.map(a => a.id)])]
  const extras = DESIGN === 'v4' ? await loadCircleExtras(supabase, { signedIn: !!user, canReadGuides: !!user && isJoiningOrAbove(role), peopleIds, openCircle: openCircle ?? null }) : undefined

  return (
    <Suspense>
    <OrgChartClient
      initialUnits={(unitsRes.data ?? []) as OrgUnit[]}
      initialMembers={members}
      directory={directory}
      people={people}
      joinRequests={joinRequests}
      projects={DESIGN === 'v4' ? (((await supabase.from('projects').select('id, title, status, circle').in('status', ['pending', 'backlog', 'in_progress', 'review', 'paused']).order('title')).data ?? []) as { id: string; title: string; status: string; circle: string | null }[]) : []}
      teamProjects={((await supabase.from('projects').select('id, title, team_id').not('team_id', 'is', null).in('status', ['pending', 'backlog', 'in_progress', 'review'])).data ?? []) as { id: string; title: string; team_id: string }[]}
      userId={user?.id ?? null}
      role={role}
      leadCircles={leadCircles}
      meetingCounts={meetingCounts}
      pmCounts={pmCounts}
      extras={extras}
    />
    </Suspense>
  )
}
