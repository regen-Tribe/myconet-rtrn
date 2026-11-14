'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/core/lib/supabase/client'
import { useCircles } from '@/core/components/CirclesProvider'
import { CircleLeadName } from '@/core/components/CircleLeadName'
import type { CircleSlug } from '@/core/lib/circles'
import type { CircleDirectory, PersonRef } from '@/core/lib/ops-permissions'
import type { OrgMember, OrgPerson, OrgUnit } from './types'
import { canEditUnit, canLeadCircle, MEMBER_SELECT, toMember } from './lib/org'
import { UnitEditModal, type UnitDraft } from './UnitEditModal'

function Chip({ name, username, note, isMe, accent }: {
  id: string; name: string; username: string | null; note?: string | null; isMe: boolean; accent?: string
}) {
  const color = accent ?? 'var(--ink-2)'
  return (
    <Link
      href={username ? `/u/${username}` : '#'}
      title={note ?? undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, textDecoration: 'none',
        color: isMe ? 'var(--m17)' : color,
        background: isMe ? 'color-mix(in srgb, var(--m17) 10%, var(--surface))' : accent ? `color-mix(in srgb, ${accent} 10%, var(--surface))` : 'var(--bg-2)',
        border: `1px solid ${isMe ? 'var(--m17)' : accent ? `color-mix(in srgb, ${accent} 35%, var(--rule))` : 'var(--rule)'}`,
        borderRadius: 20, padding: '3px 10px', maxWidth: '100%',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}{isMe ? ' (you)' : ''}</span>
      {note && <span style={{ fontWeight: 400, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>· {note}</span>}
    </Link>
  )
}

const label: React.CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6,
}

export default function OrgChartClient({
  initialUnits, initialMembers, directory, people, userId, role, leadCircles,
}: {
  initialUnits: OrgUnit[]
  initialMembers: OrgMember[]
  directory: CircleDirectory
  /** Everyone, for the member picker — only loaded for people who can edit something. */
  people: OrgPerson[]
  userId: string | null
  role: string
  leadCircles: string[]
}) {
  const circles = useCircles()
  const supabase = createClient()
  // The circle that looks after every circle sits at the top; the rest are columns
  const steward = circles.list.find(c => c.is_steward) ?? null
  const columnSlugs = circles.slugs.filter(c => c !== steward?.slug)
  const [units, setUnits] = useState(initialUnits)
  const [members, setMembers] = useState(initialMembers)
  const [editing, setEditing] = useState<{ unit: OrgUnit | null; circle: CircleSlug } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const circleUnit = (c: CircleSlug) => units.find(u => u.kind === 'circle' && u.circle === c)
  const teamsOf = (c: CircleSlug) => units.filter(u => u.kind === 'team' && u.circle === c).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  const membersOf = (unitId: string) => members
    .filter(m => m.unit_id === unitId)
    .sort((a, b) => (a.role === b.role ? (a.person?.name ?? '').localeCompare(b.person?.name ?? '') : a.role === 'lead' ? -1 : 1))

  // Where the signed-in user sits, for the summary line
  const myCircles = circles.slugs.filter(c => role === 'circle_lead' && leadCircles.includes(c))
  const myTeams = userId ? units.filter(u => u.kind === 'team' && members.some(m => m.unit_id === u.id && m.user_id === userId)) : []
  const myCircleMemberships = userId ? circles.slugs.filter(c => { const cu = circleUnit(c); return cu && members.some(m => m.unit_id === cu.id && m.user_id === userId) }) : []

  const myParts = [
    myCircles.length ? `lead ${myCircles.map(c => circles.meta(c).label).join(', ')}` : null,
    myCircleMemberships.length ? `are in ${myCircleMemberships.map(c => circles.meta(c).label).join(', ')}` : null,
    myTeams.length ? `are on ${myTeams.map(t => t.name).join(', ')}` : null,
  ].filter(Boolean)
  const mySummary = myParts.length ? `You ${myParts.join(' · ')}.` : null

  async function saveUnit(draft: UnitDraft): Promise<string | null> {
    if (!editing || !userId) return 'Sign in to edit.'
    let unit = editing.unit
    if (unit) {
      const { data, error } = await supabase.from('org_units').update({ name: draft.name, description: draft.description }).eq('id', unit.id).select('id, kind, circle, name, description, sort_order')
      if (error) return error.message
      if (!data?.length) return 'You can’t edit this. Circle leads edit their circle and its teams; team leads edit their team.'
      unit = data[0] as OrgUnit
    } else {
      const nextOrder = Math.max(0, ...teamsOf(editing.circle).map(t => t.sort_order)) + 1
      const { data, error } = await supabase.from('org_units')
        .insert({ kind: 'team', circle: editing.circle, name: draft.name, description: draft.description, sort_order: nextOrder, created_by: userId })
        .select('id, kind, circle, name, description, sort_order').single()
      if (error) return error.code === '42501' ? 'Only admins and this circle’s leads can add teams.' : error.message
      unit = data as OrgUnit
    }
    const saved = unit

    // Members: remove the dropped ones first, then upsert the rest
    const before = members.filter(m => m.unit_id === saved.id)
    const removed = before.filter(m => !draft.members.some(d => d.user_id === m.user_id)).map(m => m.user_id)
    if (removed.length) {
      const { error } = await supabase.from('org_unit_members').delete().eq('unit_id', saved.id).in('user_id', removed)
      if (error) return error.message
    }
    if (draft.members.length) {
      const { error } = await supabase.from('org_unit_members')
        .upsert(draft.members.map(d => ({ unit_id: saved.id, ...d })), { onConflict: 'unit_id,user_id' })
      if (error) return error.message
    }
    const { data: fresh } = await supabase.from('org_unit_members').select(MEMBER_SELECT).eq('unit_id', saved.id)

    setUnits(list => (list.some(u => u.id === saved.id) ? list.map(u => (u.id === saved.id ? saved : u)) : [...list, saved]))
    setMembers(list => [...list.filter(m => m.unit_id !== saved.id), ...(fresh ?? []).map(toMember)])
    setEditing(null)
    setToast(editing.unit ? 'Saved' : 'Team created')
    return null
  }

  async function deleteUnit(): Promise<string | null> {
    const unit = editing?.unit
    if (!unit) return null
    const { data, error } = await supabase.from('org_units').delete().eq('id', unit.id).select('id')
    if (error) return error.message
    if (!data?.length) return 'Only admins and this circle’s leads can delete teams.'
    setUnits(list => list.filter(u => u.id !== unit.id))
    setMembers(list => list.filter(m => m.unit_id !== unit.id))
    setEditing(null)
    setToast('Team deleted')
    return null
  }

  const editBtn: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 600, color: 'var(--m17)', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  }

  const peopleRow = (list: { id: string; name: string; username: string | null; note?: string | null }[], accent?: string) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {list.map(p => <Chip key={p.id} {...p} isMe={p.id === userId} accent={accent} />)}
    </div>
  )

  return (
    <div className="ev-page" style={{ padding: '26px 32px 60px' }}>
      {/* ── Page head ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'color-mix(in srgb, var(--m17) 10%, var(--surface))', color: 'var(--m17)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, marginBottom: 10 }}>
          Module 17 · Circles
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 8px' }}>
          Who does what
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0, maxWidth: '62ch', lineHeight: 1.55 }}>
          The community’s circles, the teams inside them, and who leads each one.
          {mySummary && <> {mySummary}</>}
        </p>
      </div>

      {/* ── Stewards: the steward circle (if any) looks after every circle ─ */}
      <div className="org-stewards" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 6 }}>
        {(() => {
          const sm = steward ? circles.meta(steward.slug) : null
          const su = steward ? circleUnit(steward.slug) : undefined
          const sLeads: PersonRef[] = steward ? directory.leads[steward.slug] ?? [] : []
          const accent = sm?.color ?? 'var(--m17)'
          return (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: `3px solid ${accent}`, borderRadius: 10, padding: '12px 18px', textAlign: 'center', maxWidth: 560, width: '100%', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: sm ? accent : 'var(--ink)' }}>{sm ? `${sm.emoji} ${sm.label}` : 'Community stewards'}</div>
                {steward && su && canLeadCircle(steward.slug, role, leadCircles) && <button onClick={() => setEditing({ unit: su, circle: steward.slug })} style={editBtn}>Edit</button>}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{sm ? 'Community stewards · look after every circle' : 'Admins · look after every circle'}</div>
              {su?.description && <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap', maxWidth: '60ch' }}>{su.description}</p>}
              {steward && <CircleLeadName slug={steward.slug} canEdit={role === 'admin'} color={accent} />}
              {sLeads.length > 0 && <div style={{ display: 'flex', justifyContent: 'center' }}>{peopleRow(sLeads, accent)}</div>}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {steward && directory.admins.length > 0 && <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>Admins</span>}
                {directory.admins.length ? peopleRow(directory.admins) : !steward && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>No admins listed.</span>}
              </div>
            </div>
          )
        })()}
        <div aria-hidden style={{ width: 2, height: 18, background: 'var(--rule)' }} />
      </div>

      {/* ── Circles ───────────────────────────────────────────────────── */}
      <div className="org-circles" style={{ borderTop: '2px solid var(--rule)', paddingTop: 16 }}>
        {columnSlugs.map(c => {
          const meta = circles.meta(c)
          const cu = circleUnit(c)
          const leads: PersonRef[] = directory.leads[c]
          const circleMembers = cu ? membersOf(cu.id) : []
          const teams = teamsOf(c)
          const canLead = canLeadCircle(c, role, leadCircles)
          return (
            <section key={c} aria-label={`${meta.label} circle`} style={{
              background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: `3px solid ${meta.color}`,
              borderRadius: 10, padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: meta.color, margin: 0 }}>{meta.emoji} {meta.label}</h2>
                {cu && canLead && <button onClick={() => setEditing({ unit: cu, circle: c })} style={editBtn}>Edit</button>}
              </div>
              {cu?.description
                ? <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>{cu.description}</p>
                : canLead && <p style={{ fontSize: 12, color: 'var(--ink-4)', margin: 0, fontStyle: 'italic' }}>Add this circle’s purpose with Edit.</p>}

              <div>
                <div style={{ ...label, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Circle leads</span>
                  {role === 'admin' && <Link href="/admin/users" style={{ color: 'var(--m17)', textDecoration: 'none', letterSpacing: 0, textTransform: 'none', fontFamily: 'inherit', fontWeight: 600 }}>Manage →</Link>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <CircleLeadName slug={c} canEdit={role === 'admin'} color={meta.color} />
                  {leads.length > 0 && peopleRow(leads, meta.color)}
                  {!leads.length && !circles.get(c)?.leads_to_assign && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No lead yet. {steward ? `${circles.meta(steward.slug).label} looks after it.` : 'Stewards look after it.'}</div>}
                </div>
              </div>

              {circleMembers.length > 0 && (
                <div>
                  <div style={label}>Members</div>
                  {peopleRow(circleMembers.filter(m => m.person).map(m => ({ ...m.person!, note: m.title })))}
                </div>
              )}

              {(teams.length > 0 || canLead) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px dashed var(--rule)', paddingTop: 10 }}>
                  <div style={{ ...label, marginBottom: 0 }}>Teams</div>
                  {teams.map(t => {
                    const tm = membersOf(t.id)
                    const tLeads = tm.filter(m => m.role === 'lead' && m.person)
                    const tMembers = tm.filter(m => m.role === 'member' && m.person)
                    return (
                      <div key={t.id} style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '9px 10px', borderLeft: `3px solid ${meta.color}` }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', overflowWrap: 'anywhere' }}>{t.name}</div>
                          {canEditUnit(t, members, userId, role, leadCircles) && <button onClick={() => setEditing({ unit: t, circle: c })} style={editBtn}>Edit</button>}
                        </div>
                        {t.description && <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.45, margin: '0 0 6px', whiteSpace: 'pre-wrap' }}>{t.description}</p>}
                        {tLeads.length > 0 && <div style={{ marginBottom: 5 }}>{peopleRow(tLeads.map(m => ({ ...m.person!, note: m.title ?? 'Lead' })), meta.color)}</div>}
                        {tMembers.length > 0 && peopleRow(tMembers.map(m => ({ ...m.person!, note: m.title })))}
                        {tm.length === 0 && <div style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>No one on this team yet.</div>}
                      </div>
                    )
                  })}
                  {canLead && (
                    <button onClick={() => setEditing({ unit: null, circle: c })} style={{
                      fontSize: 12, fontWeight: 600, color: meta.color, background: 'transparent', cursor: 'pointer',
                      border: `1px dashed color-mix(in srgb, ${meta.color} 45%, var(--rule))`, borderRadius: 8, padding: '7px 10px',
                    }}>
                      + Add team
                    </button>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </div>

      <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 18 }}>
        Admins edit everything. Circle leads edit their circle and its teams; team leads edit their own team.
        {!userId && <> <Link href="/auth/login" style={{ color: 'var(--m17)', fontWeight: 600 }}>Sign in</Link> if you lead something.</>}
      </p>

      {editing && (
        <UnitEditModal
          unit={editing.unit}
          circle={editing.circle}
          members={editing.unit ? membersOf(editing.unit.id) : []}
          people={people}
          canDelete={canLeadCircle(editing.circle, role, leadCircles)}
          onClose={() => setEditing(null)}
          onSave={saveUnit}
          onDelete={deleteUnit}
        />
      )}

      {toast && (
        <div role="status" style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
          background: 'var(--ink)', color: 'var(--surface)', fontSize: 13, fontWeight: 600,
          padding: '10px 18px', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
