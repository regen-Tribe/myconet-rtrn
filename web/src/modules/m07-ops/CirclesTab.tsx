'use client'

import Link from 'next/link'
import { MeetingNotesLink } from '@/modules/m18-meetings/MeetingNotesLink'
import { PmLink } from './PmLink'
import { AddCircleButton } from '@/modules/m04-blueprint/AddCircleButton'
import { useCircles } from '@/core/components/CirclesProvider'
import { CircleLeadName } from '@/core/components/CircleLeadName'
import { isActiveProject, PROJECT_STATUS_META } from '@/core/lib/project-status'
import { ROLE_LABELS } from '@/core/lib/roles'
import { type CircleDirectory, type PersonRef } from '@/core/lib/ops-permissions'
import type { Project } from './types'
import { useState } from 'react'
import { AddCircleMember } from '@/modules/m17-org/AddCircleMember'
import type { OrgMember, OrgPerson } from '@/modules/m17-org/types'

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
  directory, projects, userId, userRole, leadCircles, involvedProjectIds, meetingCounts, pmCounts,
  circleUnits = [], circleMembers: initialCircleMembers = [], people = [], teams = [],
}: {
  directory: CircleDirectory
  projects: Project[]
  userId: string | null
  userRole: string
  leadCircles: string[]
  /** Projects the user leads, created, is assigned in, or watches. */
  involvedProjectIds: Set<string>
  /** Meetings per circle this person can read; null when Meetings is off */
  meetingCounts?: Record<string, number> | null
  /** Open project-manager suggestions per circle, counted only for circles this person decides */
  pmCounts?: Record<string, number>
  /** Each circle's place in the org chart, its members, and everyone for "+ Add member" (v4.35.0) */
  circleUnits?: { id: string; circle: string }[]
  circleMembers?: OrgMember[]
  people?: OrgPerson[]
  /** The circles' teams, to group each circle's projects (v4.37.0) */
  teams?: { id: string; name: string; circle: string }[]
}) {
  const circles = useCircles()
  const [members, setMembers] = useState(initialCircleMembers)
  // Circles opened to show their projects
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (c: string) => setExpanded(prev => { const n = new Set(prev); if (n.has(c)) n.delete(c); else n.add(c); return n })
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

      {isAdmin && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -6 }}><AddCircleButton /></div>}

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
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: meta.color, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>You lead this</span>
                )}
              </div>
              {(meetingCounts || pmCounts?.[c]) && (
                <div style={{ marginTop: -4, marginBottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {meetingCounts && <MeetingNotesLink circle={c} count={meetingCounts[c]} color={meta.color} />}
                  <PmLink circle={c} count={pmCounts?.[c]} color={meta.color} />
                </div>
              )}

              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>Leads</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                <CircleLeadName slug={c} canEdit={isAdmin} color={meta.color} />
                {leads.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{leads.map(p => <PersonChip key={p.id} person={p} isMe={p.id === userId} />)}</div>}
                {!leads.length && !circles.get(c)?.leads_to_assign && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No lead yet — {steward && steward.slug !== c ? `${steward.name} looks after it` : 'admins look after this circle'}.</div>}
              </div>

              {(() => {
                const unit = circleUnits.find(u => u.circle === c)
                // Members, not the leads (listed above; members too since v4.38.1)
                const mine = unit ? members.filter(m => m.unit_id === unit.id && m.person && m.role !== 'lead') : []
                const canAdd = !!unit && (isAdmin || iLead)
                if (!mine.length && !canAdd) return null
                return (
                  <>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>Members</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      {mine.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{mine.map(m => <PersonChip key={m.user_id} person={m.person!} isMe={m.user_id === userId} />)}</div>}
                      {canAdd && (
                        <AddCircleMember
                          unitId={unit!.id} color={meta.color} people={people}
                          existing={[...members.filter(m => m.unit_id === unit!.id).map(m => m.user_id), ...leads.map(l => l.id)]}
                          onAdded={m => setMembers(prev => [...prev, m])}
                        />
                      )}
                    </div>
                  </>
                )
              })()}

              <button
                type="button" onClick={() => toggle(c)} disabled={!circleProjects.length} aria-expanded={expanded.has(c)}
                style={{ all: 'unset', cursor: circleProjects.length ? 'pointer' : 'default', fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}
              >
                <span>
                  {circleProjects.length} project{circleProjects.length === 1 ? '' : 's'} · {active} active
                  {userId && mine > 0 && <> · <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>you’re in {mine}</span></>}
                </span>
                {circleProjects.length > 0 && <span style={{ marginLeft: 'auto', color: meta.color, fontWeight: 700 }}>{expanded.has(c) ? 'Hide ▴' : 'Show ▾'}</span>}
              </button>
              {expanded.has(c) && (() => {
                // The whole circle's projects first, then each team's (v4.37.0)
                const groups = [
                  { name: 'Whole circle', list: circleProjects.filter(p => !p.team_id || !teams.some(t => t.id === p.team_id)) },
                  ...teams.filter(t => t.circle === c).map(t => ({ name: t.name, list: circleProjects.filter(p => p.team_id === t.id) })),
                ].filter(g => g.list.length)
                return (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {groups.map(g => (
                      <div key={g.name}>
                        {(groups.length > 1 || g.name !== 'Whole circle') && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-4)', marginBottom: 3 }}>{g.name}</div>}
                        {g.list.map(p => {
                          const st = PROJECT_STATUS_META[p.status]
                          return (
                            <Link key={p.id} href={`/ops/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', textDecoration: 'none', borderTop: '1px solid var(--rule-soft, var(--rule))' }}>
                              <span style={{ fontSize: 13, color: 'var(--ink)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                              <span style={{ fontSize: 10.5, fontWeight: 600, color: st?.color ?? 'var(--ink-4)', whiteSpace: 'nowrap' }}>{st?.label ?? p.status}</span>
                            </Link>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )
              })()}
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
