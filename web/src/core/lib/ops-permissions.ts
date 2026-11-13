/**
 * Who can move / edit a project, and the plain-language reason when they can't.
 *
 * Mirrors the `projects` UPDATE RLS policies:
 *   - admin can update any project
 *   - project_lead can update any project at the DB level, but the app limits
 *     them to projects they created or lead
 *   - circle_lead can update projects whose circle is in their lead_circles —
 *     and the new row must pass the same check, so they can't move a project
 *     into a circle they don't lead, or out of every circle
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CircleSet, CircleSlug } from './circles'
import { loadCircles } from './circles-server'
import { ROLE_LABELS } from './roles'

export type PersonRef = { id: string; name: string; username: string | null }
export type CircleLeads = Record<CircleSlug, PersonRef[]>

export interface CircleDirectory {
  leads: CircleLeads
  admins: PersonRef[]
}

export interface PermissionNotice {
  title: string
  message: string
  /** The circle whose leads can help — shown under the message. */
  circle: CircleSlug | null
}

type ProjectRef = { circle?: string | null; created_by?: string | null; lead_user_id?: string | null }

export function circleLabel(circles: CircleSet, circle: CircleSlug): string {
  return circles.label(circle)
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function leadCircleList(circles: CircleSet, leadCircles: string[]): string {
  return joinList(leadCircles.filter(c => circles.has(c)).map(c => circles.label(c)))
}

export function canMoveProject(p: ProjectRef, userId: string | null, userRole: string, leadCircles: string[], circles: CircleSet): boolean {
  return projectEditBlock(p, userId, userRole, leadCircles, circles) === null
}

/** null when the user may move/edit the project; otherwise why not. */
export function projectEditBlock(
  p: ProjectRef, userId: string | null, userRole: string, leadCircles: string[], circles: CircleSet,
): PermissionNotice | null {
  const circle = circles.has(p.circle) ? p.circle : null
  const title = "You can't move this project"

  if (!userId) return { title, message: 'Sign in to move projects on the board.', circle }
  if (userRole === 'admin') return null

  if (userRole === 'project_lead') {
    if (p.created_by === userId || p.lead_user_id === userId) return null
    return { title, message: 'Project leads can only move projects they created or lead.', circle }
  }

  if (userRole === 'circle_lead') {
    if (circle && leadCircles.includes(circle)) return null
    if (!circle) {
      return { title, message: "This project isn't in a circle yet, so only an admin can move it.", circle: null }
    }
    const mine = leadCircleList(circles, leadCircles)
    return {
      title,
      message: mine
        ? `This project is in ${circles.label(circle)}. You're a lead in ${mine}, so you can only move projects in those circles.`
        : `This project is in ${circles.label(circle)}. You haven't been assigned to lead any circle yet.`,
      circle,
    }
  }

  const role = ROLE_LABELS[userRole] ?? 'Explorer'
  return { title, message: `Only admins and circle leads can move projects. You're a ${role}.`, circle }
}

/** null when the user may put the project in `target`; otherwise why not. */
export function circleChangeBlock(
  target: CircleSlug | '', userRole: string, leadCircles: string[], circles: CircleSet,
): PermissionNotice | null {
  if (userRole !== 'circle_lead') return null
  const title = "You can't change the circle"
  if (!target) {
    return { title, message: 'Only an admin can take a project out of its circle.', circle: null }
  }
  if (leadCircles.includes(target)) return null
  return {
    title,
    message: `You can't move this project into ${circles.label(target)} because you're not a lead in that circle.`,
    circle: target,
  }
}

export async function fetchCircleDirectory(supabase: SupabaseClient): Promise<CircleDirectory> {
  const [{ data }, circles] = await Promise.all([
    supabase.rpc('public_circle_directory'),
    loadCircles(supabase),
  ])

  const leads: CircleLeads = Object.fromEntries(circles.slugs.map(c => [c, [] as PersonRef[]]))
  const admins: PersonRef[] = []
  for (const row of data ?? []) {
    const person = { id: row.id, name: row.first_name ?? row.username ?? 'Member', username: row.username ?? null }
    if (row.role === 'admin') admins.push(person)
    // Only circle_lead counts as a lead at the DB level (see RLS note above)
    if (row.role === 'circle_lead') {
      for (const c of (row.lead_circles ?? []) as string[]) if (circles.has(c)) (leads[c] ??= []).push(person)
    }
  }
  return { leads, admins }
}
