import type { SupabaseClient } from '@supabase/supabase-js'
import type { IconName } from '@/core/components/v4'
import { isAdmin, isCircleAdmin, isFullMember, isJoiningOrAbove } from './roles'
import { evalLayers, type Vote } from './proposal-checks'
import { fmtTaskWhen, isTaskOverdue, taskDate } from './tasks'
import { moduleOn } from './modules'

/**
 * What the bell in the top bar shows (AppTopBar › BellPanel). Nothing is stored for it:
 * every item is read from the pages' own tables with the viewer's session, so RLS decides
 * what they see. "Needs you" is what's waiting on this person (the number on the bell);
 * "Activity" is the last week's news that concerns them.
 */

export interface BellItem {
  key: string
  icon: IconName
  title: string
  line: string
  href: string
  /** When it happened (Activity), for sorting and "2 h ago"; none for what's coming up */
  at?: string
}

export interface Bell { needs: BellItem[]; activity: BellItem[] }

const DAY = 86_400_000
const WEEK_AGO = () => new Date(Date.now() - 7 * DAY).toISOString()
const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null)
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** "Closes today", "3 days left", "No deadline" */
function closesIn(closesAt: string | null): string {
  if (!closesAt) return 'No deadline'
  const days = Math.floor((new Date(closesAt).getTime() - Date.now()) / DAY)
  return days < 1 ? 'Closes today' : days === 1 ? 'Closes tomorrow' : `${days} days left`
}

/** "Just now", "2 h ago", "Yesterday", "3 days ago" */
export function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 60) return mins < 2 ? 'Just now' : `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}

export async function loadBell(supabase: SupabaseClient, userId: string, role: string): Promise<Bell> {
  const needs: BellItem[] = []
  const activity: BellItem[] = []
  if (!isJoiningOrAbove(role)) return { needs, activity }

  const member = isFullMember(role)
  const lead = isCircleAdmin(role)
  const soon = new Date(Date.now() + 3 * DAY)
  const inTwoDays = new Date(Date.now() + 2 * DAY).toISOString()
  const nowIso = new Date().toISOString()

  const [proposalsRes, tasksRes, myProjectsRes, appsRes, bookingsRes, myAgreementsRes, rsvpRes, profileRes, teamsRes] = await Promise.all([
    // Open proposals, with every vote and the voter's role (for "you haven't voted" and "approved")
    member
      ? supabase.from('proposals')
          .select('id, title, closes_at, created_at, votes:proposal_votes(vote, user_id, layer, created_at, voter:user_profiles!proposal_votes_user_id_fkey(role))')
          .eq('status', 'open').order('created_at', { ascending: false }).limit(30)
      : Promise.resolve({ data: [] }),
    // My tasks that are late or due in the next 3 days
    supabase.from('deliverables').select('id, title, status, due_date, due_time, project_id, projects(title)')
      .eq('assignee_id', userId).not('status', 'in', '(done,review)').not('due_date', 'is', null)
      .lte('due_date', soon.toISOString().slice(0, 10)).order('due_date', { ascending: true }).limit(10),
    // Projects I lead or started: their offers of help wait on me
    supabase.from('projects').select('id, title').or(`lead_user_id.eq.${userId},created_by.eq.${userId}`),
    lead ? supabase.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'pending') : Promise.resolve({ count: 0 }),
    isAdmin(role) ? supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending') : Promise.resolve({ count: 0 }),
    // My own offers of help that got an answer this week
    supabase.from('collaboration_agreements').select('id, status, updated_at, project_id, projects(title)')
      .eq('user_id', userId).in('status', ['accepted', 'rejected']).gte('updated_at', WEEK_AGO()),
    // Events I'm going to in the next 2 days
    supabase.from('event_rsvps').select('event_id, events(id, title, starts_at)').eq('user_id', userId).eq('status', 'going'),
    // My circles (as on Meetings): the ones I lead and the ones I'm on a team of
    supabase.from('user_profiles').select('lead_circles').eq('id', userId).maybeSingle(),
    supabase.from('org_unit_members').select('org_units(circle)').eq('user_id', userId),
  ])

  // ── Needs you ──
  type P = { id: string; title: string; closes_at: string | null; votes: (Vote & { created_at: string })[] }
  const proposals = ((proposalsRes.data ?? []) as unknown as P[]).map(p => ({ ...p, votes: (p.votes ?? []).map(v => ({ ...v, voter: one(v.voter) })) }))
  for (const p of proposals) {
    const closed = p.closes_at && new Date(p.closes_at) < new Date()
    const voted = p.votes.some(v => v.user_id === userId)
    if (!closed && !voted && !evalLayers(p).isLive) {
      needs.push({ key: `vote-${p.id}`, icon: 'vote', title: `Vote on ${p.title}`, line: closesIn(p.closes_at), href: `/governance?p=${p.id}` })
    }
  }

  for (const t of (tasksRes.data ?? []) as any[]) {
    const late = isTaskOverdue(t.due_date, t.due_time, t.status)
    if (!late && taskDate(t.due_date, t.due_time) > soon) continue
    const project = one<{ title: string }>(t.projects)?.title
    needs.push({
      key: `task-${t.id}`, icon: late ? 'alert' : 'tasks', title: t.title,
      line: `${late ? 'Late' : 'Due'} · ${fmtTaskWhen(t.due_date, t.due_time)}${project ? ` · ${project}` : ''}`,
      href: t.project_id ? `/operations/${t.project_id}` : `/operations?task=${t.id}`,
    })
  }

  const myProjects = (myProjectsRes.data ?? []) as { id: string; title: string }[]
  if (myProjects.length) {
    const { data: offers } = await supabase.from('collaboration_agreements').select('project_id')
      .in('project_id', myProjects.map(p => p.id)).eq('status', 'pending')
    const byProject = new Map<string, number>()
    for (const o of offers ?? []) byProject.set(o.project_id, (byProject.get(o.project_id) ?? 0) + 1)
    for (const [pid, n] of byProject) {
      const title = myProjects.find(p => p.id === pid)?.title ?? 'your project'
      needs.push({ key: `offers-${pid}`, icon: 'handshake', title: `${plural(n, 'offer')} of help on ${title}`, line: 'Accept or decline them', href: `/operations/${pid}` })
    }
  }

  const apps = appsRes.count ?? 0
  if (apps) needs.push({ key: 'applications', icon: 'inbox', title: `${plural(apps, 'join application')} to review`, line: 'Circle leads and admins', href: '/admin/applications' })
  const bookings = bookingsRes.count ?? 0
  if (bookings) needs.push({ key: 'bookings', icon: 'bed', title: `${plural(bookings, 'booking request')} to answer`, line: 'Admins', href: '/admin/bookings' })

  // ── Activity (last 7 days) ──
  const weekAgo = Date.now() - 7 * DAY
  for (const p of proposals) {
    if (!p.votes.some(v => v.user_id === userId) || !evalLayers(p).isLive) continue
    // Approval isn't stored: it happened with the latest vote
    const at = p.votes.map(v => v.created_at).sort().at(-1)!
    if (new Date(at).getTime() >= weekAgo) {
      activity.push({ key: `approved-${p.id}`, icon: 'check-circle', title: `${p.title} was approved`, line: 'You voted on it', href: `/governance?p=${p.id}`, at })
    }
  }

  for (const a of (myAgreementsRes.data ?? []) as any[]) {
    const project = one<{ title: string }>(a.projects)?.title ?? 'a project'
    const accepted = a.status === 'accepted'
    activity.push({
      key: `agreement-${a.id}`, icon: 'handshake',
      title: accepted ? `Your offer on ${project} was accepted` : `Your offer on ${project} was declined`,
      line: accepted ? 'You’re on the team' : 'See the agreement', href: accepted ? `/operations/${a.project_id}` : '/agreements', at: a.updated_at,
    })
  }

  if (moduleOn('meetings')) {
    const teamCircles = ((teamsRes.data ?? []) as any[]).map(t => one<{ circle: string | null }>(t.org_units)?.circle).filter(Boolean) as string[]
    const myCircles = new Set([...(profileRes.data?.lead_circles ?? []), ...teamCircles])
    const { data: meetings } = await supabase.from('meeting_transcripts').select('id, title, circle, processed_at, updated_at')
      .eq('status', 'done').gte('updated_at', WEEK_AGO()).order('updated_at', { ascending: false }).limit(10)
    // Community-wide meetings (no circle) concern everyone, as on Meetings › My circles
    const mine = ((meetings ?? []) as any[]).filter(m => !m.circle || myCircles.has(m.circle))
    // The newest two by name, the rest as one row, so meetings don't bury the other news
    for (const m of mine.slice(0, 2)) {
      activity.push({ key: `meeting-${m.id}`, icon: 'chat', title: `Notes in: ${m.title}`, line: 'Summary, decisions and tasks', href: `/meetings/${m.id}`, at: m.processed_at ?? m.updated_at })
    }
    if (mine.length > 2) {
      const m = mine[2]
      activity.push({ key: 'meetings-more', icon: 'chat', title: `${plural(mine.length - 2, 'more meeting note')} this week`, line: 'In Meetings', href: '/meetings', at: m.processed_at ?? m.updated_at })
    }
  }

  for (const r of (rsvpRes.data ?? []) as any[]) {
    const e = one<{ id: string; title: string; starts_at: string }>(r.events)
    if (!e || e.starts_at < nowIso || e.starts_at > inTwoDays) continue
    const when = new Date(e.starts_at).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    // Coming up, so no "ago": it sorts to the top of Activity
    activity.push({ key: `event-${e.id}`, icon: 'calendar', title: e.title, line: `You’re going · ${when}`, href: `/calendar?event=${e.id}` })
  }

  activity.sort((a, b) => (b.at ?? '\uffff').localeCompare(a.at ?? '\uffff'))
  return { needs, activity: activity.slice(0, 8) }
}
