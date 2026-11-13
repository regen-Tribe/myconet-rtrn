'use client'

import Link from 'next/link'
import { useCircles } from '@/core/components/CirclesProvider'
import { CircleLeadName } from '@/core/components/CircleLeadName'
import { isActiveProject } from '@/core/lib/project-status'
import { ROLE_LABELS } from '@/core/lib/roles'
import { type CircleDirectory, type PersonRef } from '@/core/lib/ops-permissions'
import type { Project } from './types'

function PersonChip({ person, isMe }: { person: PersonRef; isMe: boolean }) {
  return (
    <Link
      href={person.username ? `/u/${person.username}` : '#'}
      style={{
        fontSize: 12, fontWeight: 600, textDecoration: 'none',
        color: isMe ? 'var(--m7)' : 'var(--ink-2)',
        background: isMe ? 'color-mix(in srgb, var(--m7) 10%, var(--surface))' : 'var(--bg-2)',
        border: `1px solid ${isMe ? 'var(--m7)' : 'var(--rule)'}`,
        borderRadius: 20, padding: '3px 10px',
      }}
    >
      {person.name}{isMe ? ' (you)' : ''}
    </Link>
  )
}

/** Who leads each circle, and where the signed-in user fits in. */
export function CirclesTab({
  directory, projects, userId, userRole, leadCircles, involvedProjectIds,
}: {
  directory: CircleDirectory
  projects: Project[]
  userId: string | null
  userRole: string
  leadCircles: string[]
  /** Projects the user leads, created, is assigned in, or watches. */
  involvedProjectIds: Set<string>
}) {
  const circles = useCircles()
  const isAdmin = userRole === 'admin'
  const steward = circles.list.find(c => c.is_steward) ?? null
  const myLeadCircles = circles.slugs.filter(c => userRole === 'circle_lead' && leadCircles.includes(c))
  const myInvolvedCircles = circles.slugs.filter(c => projects.some(p => p.circle === c && involvedProjectIds.has(p.id)))

  const summary = !userId
    ? 'Sign in to see which circles you belong to.'
    : isAdmin
      ? 'You’re an admin, so you can move and edit projects in every circle.'
      : myLeadCircles.length
        ? `You lead ${myLeadCircles.map(c => circles.label(c)).join(', ')}. You can move and edit projects in ${myLeadCircles.length === 1 ? 'that circle' : 'those circles'}.`
        : userRole === 'project_lead'
          ? 'You’re a project lead. You can move and edit the projects you created or lead.'
          : 'You don’t lead a circle. Circle leads and admins move projects on the board.'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Your place */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10, padding: '16px 18px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>
          Your circles{userId ? ` · ${ROLE_LABELS[userRole] ?? 'Explorer'}` : ''}
        </div>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: '0 0 10px', lineHeight: 1.55 }}>{summary}</p>
        {userId && (
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            Involved in:{' '}
            {myInvolvedCircles.length
              ? myInvolvedCircles.map(c => (
                  <span key={c} style={{ color: circles.meta(c).color, fontWeight: 600, marginRight: 8 }}>{circles.label(c)}</span>
                ))
              : 'no circle projects yet — lead, join or watch a project to get involved.'}
          </div>
        )}
      </div>

      {/* One card per circle */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {circles.slugs.map(c => {
          const meta = circles.meta(c)
          const leads = directory.leads[c]
          const circleProjects = projects.filter(p => p.circle === c)
          const active = circleProjects.filter(p => isActiveProject(p.status)).length
          const mine = circleProjects.filter(p => involvedProjectIds.has(p.id)).length
          const iLead = myLeadCircles.includes(c)
          return (
            <div key={c} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderLeft: `3px solid ${meta.color}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: meta.color }}>{meta.emoji} {meta.label}</div>
                  {steward?.slug === c && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>Community stewards · look after every circle</div>}
                </div>
                {iLead && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: meta.color, borderRadius: 20, padding: '2px 8px' }}>You lead this</span>
                )}
              </div>

              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>Leads</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                <CircleLeadName slug={c} canEdit={isAdmin} color={meta.color} />
                {leads.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{leads.map(p => <PersonChip key={p.id} person={p} isMe={p.id === userId} />)}</div>}
                {!leads.length && !circles.get(c)?.leads_to_assign && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No lead yet — {steward && steward.slug !== c ? `${steward.name} looks after it` : 'admins look after this circle'}.</div>}
              </div>

              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                {circleProjects.length} project{circleProjects.length === 1 ? '' : 's'} · {active} active
                {userId && mine > 0 && <> · <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>you’re in {mine}</span></>}
              </div>
            </div>
          )
        })}
      </div>

      <Link href="/org" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--m17)', textDecoration: 'none' }}>
        See the Circles org chart, with teams inside each circle →
      </Link>

      {directory.admins.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>Admins · every circle</span>
          {directory.admins.map(p => <PersonChip key={p.id} person={p} isMe={p.id === userId} />)}
        </div>
      )}
    </div>
  )
}
