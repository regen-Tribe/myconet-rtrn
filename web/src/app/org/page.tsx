import { meetingCountsByCircle } from '@/modules/m18-meetings/lib/counts'
import { suggestionCountsByCircle } from '@/modules/m07-ops/lib/pm-data'
import { createClient } from '@/core/lib/supabase/server'
import OrgChartClient from '@/modules/m17-org/OrgChartClient'
import { fetchCircleDirectory } from '@/core/lib/ops-permissions'
import { MEMBER_SELECT, toMember, toPerson } from '@/modules/m17-org/lib/org'
import type { OrgPerson, OrgUnit } from '@/modules/m17-org/types'

/** M17 Org chart — public; admins, circle leads and team leads edit their parts. */
export default async function OrgPage() {
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

  return (
    <OrgChartClient
      initialUnits={(unitsRes.data ?? []) as OrgUnit[]}
      initialMembers={members}
      directory={directory}
      people={people}
      userId={user?.id ?? null}
      role={role}
      leadCircles={leadCircles}
      meetingCounts={meetingCounts}
      pmCounts={pmCounts}
    />
  )
}
