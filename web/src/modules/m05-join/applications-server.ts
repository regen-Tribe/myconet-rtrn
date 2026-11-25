import type { SupabaseClient } from '@supabase/supabase-js'
import { loadProfileDetails } from '@/core/lib/public-profile'

/** The Blueprint's join questions, one per line. */
export async function loadJoinQuestions(supabase: SupabaseClient): Promise<string[]> {
  const { data: blueprints } = await supabase
    .from('blueprints')
    .select('answers, updated_at')
    .order('updated_at', { ascending: false })
  const withQuestions = blueprints?.find(b => (b.answers as Record<string, unknown> | null)?.join_application_questions)
  const raw = (withQuestions?.answers as Record<string, unknown> | undefined)?.join_application_questions
  return (typeof raw === 'string' ? raw : '').split('\n').map(q => q.trim()).filter(q => q.length > 0)
}

/** What the applicant filled in About you (#90), for the steward: the application itself is their profile (#93) */
export interface ApplicantProfile {
  headline: string | null; about: string | null; avatar_url: string | null; place: string | null
  describes: string[]; skills: string[]; interests: string[]; values: string | null; offers: string[]; requests: string[]
}

export interface ApplicationRow {
  id: string; user_id: string; status: string; answers: Record<string, string>
  admin_notes: string | null; created_at: string; first_name: string | null; username: string | null
  profile: ApplicantProfile | null
}

/** Every join application with the applicant's name. RLS: admins and circle leads can read them. */
export async function loadApplications(supabase: SupabaseClient): Promise<ApplicationRow[]> {
  const { data: apps } = await supabase
    .from('applications')
    .select('id, user_id, status, answers, admin_notes, created_at')
    .order('created_at', { ascending: false })

  const userIds = (apps ?? []).map(a => a.user_id as string)
  const none = { data: [] as Record<string, unknown>[] }
  const [{ data: profiles }, { data: bios }, { data: offers }, { data: requests }, details] = userIds.length > 0
    ? await Promise.all([
        supabase.from('user_profiles').select('id, first_name, username, headline, public_bio, avatar_url').in('id', userIds),
        supabase.from('user_bio').select('user_id, skills, interests, values_principles').in('user_id', userIds),
        supabase.from('user_offers').select('user_id, title').in('user_id', userIds),
        supabase.from('user_requests').select('user_id, request_text').in('user_id', userIds),
        loadProfileDetails(supabase, userIds),
      ])
    : [none, none, none, none, new Map()]
  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id as string, p as Record<string, any>]))
  const bioMap = Object.fromEntries((bios ?? []).map(b => [b.user_id as string, b as Record<string, any>]))
  const listOf = (rows: Record<string, unknown>[] | null, uid: string, key: string) =>
    (rows ?? []).filter(r => r.user_id === uid).map(r => String(r[key] ?? '')).filter(Boolean)
  const profileOf = (uid: string): ApplicantProfile | null => {
    const p = profileMap[uid]
    if (!p) return null
    const b = bioMap[uid]
    const d = details.get(uid)
    return {
      headline: p.headline ?? null, about: p.public_bio ?? null, avatar_url: p.avatar_url ?? null,
      place: [d?.city, d?.country].filter(Boolean).join(', ') || null, describes: d?.user_types ?? [],
      skills: b?.skills ?? [], interests: b?.interests ?? [], values: b?.values_principles ?? null,
      offers: listOf(offers, uid, 'title'), requests: listOf(requests, uid, 'request_text'),
    }
  }

  return (apps ?? []).map(a => ({
    ...a,
    answers: (a.answers as Record<string, string>) ?? {},
    admin_notes: a.admin_notes ?? null,
    first_name: profileMap[a.user_id]?.first_name ?? null,
    username: profileMap[a.user_id]?.username ?? null,
    profile: profileOf(a.user_id),
  })) as ApplicationRow[]
}
