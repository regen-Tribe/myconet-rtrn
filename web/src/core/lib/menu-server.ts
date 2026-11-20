import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdmin, isCircleAdmin, isFullMember, isJoiningOrAbove } from './roles'
import { fmtTaskWhen } from './tasks'

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
