import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdmin, isCircleAdmin, isFullMember, isJoiningOrAbove } from './roles'
import { fmtTaskWhen } from './tasks'
import { DESIGN_REVIEW } from './instance'
import { JOIN_REVIEWER, loadJoinPath } from './join-path'
import { loadProfileCompletion, missingLine } from './profile-completion'

/**
 * What the v4 menu shows for one person: the green next step on top and the
 * counts beside My dashboard, Applications and Bookings. Loaded once per page
 * in layout.tsx, only when the community uses the v4 look. Every query runs
 * with the viewer's own session, so RLS decides what they can count.
 */

export interface NextStep {
  title: string
  line: string
  href: string
  /** A second, quieter link beside the step (signed out: Sign in) */
  alt?: { label: string; href: string }
}

export interface MenuState {
  next: NextStep | null
  /** 0 explorer · 1 joining member · 2 member; null when signed out (orientation review O3) */
  journey: 0 | 1 | 2 | null
  /** Design review: the join path's three steps, shown as marks on the next step instead of the role journey */
  progress?: { label: string; done: boolean }[]
  counts: { tasks: number; applications: number; bookings: number }
  /** Who's signed in, for the foot of the menu (set in layout.tsx) */
  me?: { name: string; avatar: string | null; username: string | null } | null
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export async function loadMenuState(supabase: SupabaseClient, userId: string | null, role: string): Promise<MenuState> {
  const counts = { tasks: 0, applications: 0, bookings: 0 }

  if (!userId) {
    return {
      next: { title: 'Create account', line: 'Look around first; nothing you do here breaks anything.', href: '/auth/signup', alt: { label: 'Sign in', href: '/auth/login' } },
      journey: null,
      counts,
    }
  }

  if (DESIGN_REVIEW) return reviewMenuState(supabase, userId, role)

  const lead = isCircleAdmin(role)
  const [tasksRes, myTaskRes, appsRes, bookingsRes] = await Promise.all([
    supabase.from('deliverables').select('id', { count: 'exact', head: true }).eq('assignee_id', userId).neq('status', 'done'),
    isFullMember(role)
      ? supabase.from('deliverables').select('id, title, project_id, due_date, due_time, projects(title)')
          .eq('assignee_id', userId).neq('status', 'done')
          .order('due_date', { ascending: true, nullsFirst: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    lead ? supabase.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'pending') : Promise.resolve({ count: 0 }),
    lead ? supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending') : Promise.resolve({ count: 0 }),
  ])
  counts.tasks = tasksRes.count ?? 0
  counts.applications = appsRes.count ?? 0
  counts.bookings = bookingsRes.count ?? 0

  // Explorer: start joining (or wait for an answer once the application is in)
  if (!isJoiningOrAbove(role)) {
    const { data: app } = await supabase.from('applications').select('status').eq('user_id', userId).maybeSingle()
    const waiting = app?.status === 'pending' || app?.status === 'reviewing'
    return {
      next: waiting
        ? { title: 'Your application is in', line: 'A circle lead reads it and answers you.', href: '/join' }
        : { title: 'Start joining', line: 'Joining lets you offer help on tasks and ask to join a circle.', href: '/join' },
      journey: 0,
      counts,
    }
  }

  // Joining member: the first agreement makes you a member
  if (!isFullMember(role)) {
    const { count: waiting } = await supabase.from('collaboration_agreements').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('status', 'pending')
    return {
      next: waiting
        ? { title: 'Waiting for an answer', line: 'A task lead is reading your agreement.', href: '/agreements' }
        : { title: 'Your first agreement', line: 'One accepted agreement makes you a member.', href: '/operations' },
      journey: 1,
      counts,
    }
  }

  // Leads and admins: what's waiting for them first
  if (isAdmin(role) && counts.bookings) {
    return { next: { title: plural(counts.bookings, 'booking request'), line: 'Answer them in Bookings.', href: '/admin/bookings' }, journey: 2, counts }
  }
  if (lead && counts.applications) {
    return { next: { title: plural(counts.applications, 'join application'), line: 'Accept or decline them this week.', href: '/admin/applications' }, journey: 2, counts }
  }

  // Everyone else: your next task, or a project to help on
  const t = myTaskRes.data as { id: string; title: string; project_id: string | null; due_date: string | null; due_time: string | null; projects: { title: string } | { title: string }[] | null } | null
  if (t) {
    const project = Array.isArray(t.projects) ? t.projects[0] : t.projects
    const bits = ['Your task', project?.title ? `on ${project.title}` : '', t.due_date ? `· due ${fmtTaskWhen(t.due_date, t.due_time)}` : ''].filter(Boolean)
    return {
      next: { title: t.title, line: bits.join(' '), href: t.project_id ? `/operations/${t.project_id}?task=${t.id}` : `/operations?task=${t.id}` },
      journey: 2,
      counts,
    }
  }
  return { next: { title: 'Find a task to help on', line: 'Offer what you can give.', href: '/operations' }, journey: 2, counts }
}

/* ─── The design review's next step (instance/design/ux-review-2026-11-22.html › Onboarding & orientation) ───
 * One most useful action per person, the same one My dashboard shows (DashboardV4 reads this too):
 *   explorer         → Start joining, then the next of the three join steps (core/lib/join-path.ts)
 *   joining member   → finish the profile, then the first agreement (it makes you a member)
 *   circle lead/admin→ the oldest thing waiting on them: a join application, a booking request, a draft to decide
 *   member           → something due within two days (a task, a vote), else a profile under 70%, else a vote
 *                      or the next task
 */

const DAY = 864e5
const URGENT = 2 * DAY
const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / DAY)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`
}
const closesIn = (iso: string | null) => {
  if (!iso) return 'Open for votes'
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / DAY)
  return d <= 0 ? 'Closes today' : d === 1 ? 'Closes tomorrow' : `${d} days left to vote`
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

async function reviewMenuState(supabase: SupabaseClient, userId: string, role: string): Promise<MenuState> {
  const lead = isCircleAdmin(role)
  const admin = isAdmin(role)
  const member = isFullMember(role)
  const [tasksRes, appsRes, bookingsRes] = await Promise.all([
    supabase.from('deliverables').select('id', { count: 'exact', head: true }).eq('assignee_id', userId).neq('status', 'done'),
    lead ? supabase.from('applications').select('created_at', { count: 'exact' }).eq('status', 'pending').order('created_at').limit(1)
      : Promise.resolve({ data: [] as { created_at: string }[], count: 0 }),
    admin ? supabase.from('bookings').select('created_at', { count: 'exact' }).eq('status', 'pending').order('created_at').limit(1)
      : Promise.resolve({ data: [] as { created_at: string }[], count: 0 }),
  ])
  const counts = { tasks: tasksRes.count ?? 0, applications: appsRes.count ?? 0, bookings: bookingsRes.count ?? 0 }

  // Explorer: the three join steps. With the design review, step 1 is read on About and step 2 is a short form
  // inside Start joining (#80, #81); without it, the values are signed on Join and the profile in Edit profile
  const stepHref = (key: string) => DESIGN_REVIEW
    ? (key === 'values' ? '/about#values' : `/join?step=${key}`)
    : (key === 'profile' ? '/profile/edit' : `/join?step=${key}`)
  if (!isJoiningOrAbove(role)) {
    const path = await loadJoinPath(supabase, userId, role)
    const progress = path.steps.map(x => ({ label: x.label, done: x.done }))
    const waiting = path.application === 'pending' || path.application === 'reviewing'
    if (waiting) return { next: { title: 'Your application is in', line: `${cap(JOIN_REVIEWER)} answers within a week.`, href: '/join' }, journey: 0, progress, counts }
    if (!path.next) return { next: { title: 'Start joining', line: 'Three short steps.', href: '/join' }, journey: 0, progress, counts }
    const at = path.steps.indexOf(path.next)
    return {
      next: path.doneCount === 0 && path.application !== 'rejected'
        ? { title: 'Start joining', line: 'Three short steps.', href: '/join' }
        : { title: path.next.title, line: `Start joining · step ${at + 1} of 3`, href: stepHref(path.next.key) },
      journey: 0, progress, counts,
    }
  }

  // Joining member: a profile people can recognise, then the first agreement
  if (!member) {
    const [{ data: me }, { data: offered }] = await Promise.all([
      supabase.from('user_profiles').select('avatar_url, headline').eq('id', userId).maybeSingle(),
      // The task they offered to help on: "Waiting for an answer" opens it, not the parked Agreements page (#78)
      supabase.from('collaboration_agreements').select('project_id').eq('user_id', userId).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    if (!me?.avatar_url || !me?.headline) {
      return { next: { title: 'Add a photo and a line about you', line: 'So people know who’s offering to help.', href: '/profile/edit' }, journey: 1, counts }
    }
    return {
      next: offered
        ? { title: 'Waiting for an answer', line: 'A task lead is reading your offer to help.', href: `/operations/${offered.project_id}` }
        : { title: 'Your first agreement', line: 'One accepted agreement makes you a member.', href: '/operations' },
      journey: 1, counts,
    }
  }

  // Circle leads and admins: the oldest thing waiting on them (Oscar's "to decide" list stays in Operations; this links to it)
  if (lead) {
    // One draft at a time, the oldest they may decide (Sonia, design/decisions.md #20): a pile of 80 isn't a step
    let drafts: { count: number; oldest: string | null; first: { id: string; title: string; project_id: string | null } | null } = { count: 0, oldest: null, first: null }
    let q = supabase.from('deliverables').select('id, title, project_id, created_at, circle', { count: 'exact' }).eq('needs_review', true).order('created_at').limit(1)
    if (!admin) {
      const { data: me } = await supabase.from('user_profiles').select('lead_circles').eq('id', userId).maybeSingle()
      const mine = ((me?.lead_circles ?? []) as string[])
      q = mine.length ? q.in('circle', mine) : q.eq('id', '00000000-0000-0000-0000-000000000000')
    }
    const { data, count } = await q
    const d0 = data?.[0] as { id: string; title: string; project_id: string | null; created_at: string } | undefined
    drafts = { count: count ?? 0, oldest: d0?.created_at ?? null, first: d0 ? { id: d0.id, title: d0.title, project_id: d0.project_id } : null }
    const waiting = ([
      ['application', counts.applications, (appsRes.data?.[0]?.created_at as string | undefined) ?? null],
      ['booking', counts.bookings, (bookingsRes.data?.[0]?.created_at as string | undefined) ?? null],
      ['draft', drafts.count, drafts.oldest],
    ] as const).filter(([, n, at]) => n > 0 && at).sort((a, b) => a[2]!.localeCompare(b[2]!))
    const [kind, n, at] = waiting[0] ?? []
    if (kind === 'application') return { next: { title: plural(n!, 'join application'), line: `Oldest from ${ago(at!)}`, href: '/admin/applications' }, journey: 2, counts }
    if (kind === 'booking') return { next: { title: plural(n!, 'booking request'), line: `Oldest from ${ago(at!)}`, href: '/admin/bookings' }, journey: 2, counts }
    if (kind === 'draft') {
      // The arrow opens that draft's pop-up (same address as the task pop-up's own link); Oscar's to-decide list is untouched
      const d = drafts.first!
      return { next: {
        title: `Decide: ${d.title}`,
        line: `${n} waiting · oldest from ${ago(at!)}`,
        href: d.project_id ? `/operations/${d.project_id}?task=${d.id}` : `/operations?task=${d.id}`,
      }, journey: 2, counts }
    }
  }

  // Members: what's due soonest, else the profile, else a vote or a task
  const [taskRes, proposalsRes, votesRes, completion] = await Promise.all([
    supabase.from('deliverables').select('id, title, project_id, due_date, due_time, projects(title)')
      .eq('assignee_id', userId).neq('status', 'done')
      .order('due_date', { ascending: true, nullsFirst: false }).limit(1).maybeSingle(),
    supabase.from('proposals').select('id, title, closes_at').eq('status', 'open').order('closes_at', { ascending: true, nullsFirst: false }).limit(10),
    supabase.from('proposal_votes').select('proposal_id').eq('user_id', userId),
    loadProfileCompletion(supabase, userId),
  ])
  const t = taskRes.data as { id: string; title: string; project_id: string | null; due_date: string | null; due_time: string | null; projects: { title: string } | { title: string }[] | null } | null
  const voted = new Set(((votesRes.data ?? []) as { proposal_id: string }[]).map(v => v.proposal_id))
  const vote = ((proposalsRes.data ?? []) as { id: string; title: string; closes_at: string | null }[]).find(p => !voted.has(p.id)) ?? null

  const taskStep = t && (() => {
    const project = Array.isArray(t.projects) ? t.projects[0] : t.projects
    const bits = ['Your task', project?.title ? `on ${project.title}` : '', t.due_date ? `· due ${fmtTaskWhen(t.due_date, t.due_time)}` : ''].filter(Boolean)
    return { title: t.title, line: bits.join(' '), href: t.project_id ? `/operations/${t.project_id}?task=${t.id}` : `/operations?task=${t.id}` }
  })()
  const voteStep = vote && { title: `Vote on ${vote.title}`, line: closesIn(vote.closes_at), href: '/governance' }
  const taskDue = t?.due_date ? new Date(`${t.due_date}T23:59:59`).getTime() : Infinity
  const voteDue = vote?.closes_at ? new Date(vote.closes_at).getTime() : Infinity
  const soon = Date.now() + URGENT

  if (taskStep && taskDue <= soon && taskDue <= voteDue) return { next: taskStep, journey: 2, counts }
  if (voteStep && voteDue <= soon) return { next: voteStep, journey: 2, counts }
  if (completion.pct < 70) return { next: { title: 'Finish your profile', line: `${missingLine(completion)} · ${completion.pct}%`, href: '/profile/edit' }, journey: 2, counts }
  if (voteStep) return { next: voteStep, journey: 2, counts }
  if (taskStep) return { next: taskStep, journey: 2, counts }
  return { next: { title: 'Find a task to help on', line: 'Offer what you can give.', href: '/operations' }, journey: 2, counts }
}
