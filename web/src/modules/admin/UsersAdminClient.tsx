'use client'
import { useState } from 'react'
import AdminTabs from '@/modules/admin/AdminTabs'
import { createClient } from '@/core/lib/supabase/client'
import { useCircles } from '@/core/components/CirclesProvider'
import type { CircleSlug } from '@/core/lib/circles'
import { DESIGN } from '@/core/lib/instance'
import { Button, Card, Chip, ChipRow, IconTile, List, ListRow, PageHeader, SectionHead, Icon, type IconName } from '@/core/components/v4'

export interface AdminUserRow {
  id: string
  username: string | null
  first_name: string | null
  last_name: string | null
  role: string | null
  lead_circles: string[] | null
  created_at: string
}

const ROLES = [
  { value: 'explorer',     label: 'Explorer',     color: 'var(--ink-3)' },
  { value: 'joining',      label: 'Joining',      color: 'var(--m5)' },
  { value: 'member',       label: 'Member',       color: 'var(--m9)' },
  { value: 'advisor',      label: 'Advisor',      color: 'var(--m8)' },
  { value: 'project_lead', label: 'Project lead', color: 'var(--m7)' },
  { value: 'circle_lead',  label: 'Circle lead',  color: 'var(--m4)' },
  { value: 'admin',        label: 'Admin',        color: '#dc2626' },
]

const ROLE_COLOR: Record<string, string> = Object.fromEntries(ROLES.map(r => [r.value, r.color]))

/** What each role can do (CLAUDE.md › Member role journey; words from LEXICON.md). Shown on Permissions in v4. */
const ROLE_CAN: Record<string, string> = {
  explorer: 'Invited. Reads About, the members and the calendar.',
  joining: 'Finished joining. Edits their profile, offers help on projects, proposes projects, books amenities.',
  member: 'One accepted agreement or an active project. Votes in Governance and earns achievements.',
  advisor: 'A member who reviews Governance proposals with the admins.',
  project_lead: 'A member who manages their own projects on the board.',
  circle_lead: 'A member who manages the circles they lead: projects, Blueprint, join applications, agreements, bookings.',
  admin: 'Changes everything, including everyone’s role.',
}

/** Settings only admins change (they live where they're used; this is the one place that lists them). */
const PLATFORM_SETTINGS: { href: string; icon: IconName; title: string; text: string }[] = [
  { href: '/about?step=branding', icon: 'camera', title: 'Look and feel', text: 'Logo and banner image' },
  { href: '/about?step=circles', icon: 'circles', title: 'Circles', text: 'Add, rename or retire circles' },
  { href: '/about?step=documents', icon: 'file', title: 'Documents', text: 'What the assistant answers from' },
  { href: '/about?step=s1.4', icon: 'heart', title: 'Community values', text: 'What people sign when they join' },
  { href: '/about?edit=1', icon: 'book', title: 'The Blueprint', text: 'The plan behind About' },
]

function userDisplayName(u: AdminUserRow): string {
  const fl = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
  return fl || u.username || 'Unnamed user'
}

export default function UsersAdminClient({ initialUsers, openQuestions = 0, circleUnits = [], initialMemberOf = {}, title = 'Users', readOnly = false }: {
  initialUsers: AdminUserRow[]; openQuestions?: number
  /** "Permissions" in the v4 menu; circle leads see it read-only (only admins change roles and circles) */
  title?: string; readOnly?: boolean
  /** Each circle's org-chart unit, and the circles each person is a member of (v4.35.0) */
  circleUnits?: { id: string; circle: string }[]
  initialMemberOf?: Record<string, string[]>
}) {
  const circles = useCircles()
  const supabase = createClient()
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers)
  const [filter, setFilter] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<{ id: string; msg: string } | null>(null)
  const [memberOf, setMemberOf] = useState(initialMemberOf)

  // Member of a circle: saved straight away (it isn't part of the role's Save)
  async function toggleMember(id: string, circle: CircleSlug) {
    if (readOnly) return
    const unit = circleUnits.find(u => u.circle === circle)
    if (!unit) return
    const isIn = (memberOf[id] ?? []).includes(circle)
    setMemberOf(prev => ({ ...prev, [id]: isIn ? (prev[id] ?? []).filter(c => c !== circle) : [...(prev[id] ?? []), circle] }))
    const { error } = isIn
      ? await supabase.from('org_unit_members').delete().eq('unit_id', unit.id).eq('user_id', id)
      : await supabase.from('org_unit_members').insert({ unit_id: unit.id, user_id: id, role: 'member' })
    if (error) {
      setMemberOf(prev => ({ ...prev, [id]: isIn ? [...(prev[id] ?? []), circle] : (prev[id] ?? []).filter(c => c !== circle) }))
      setErrorId({ id, msg: error.message })
    }
  }

  const filtered = users.filter(u => {
    if (!filter.trim()) return true
    const q = filter.toLowerCase()
    return (
      (u.username ?? '').toLowerCase().includes(q) ||
      (u.first_name ?? '').toLowerCase().includes(q) ||
      (u.last_name ?? '').toLowerCase().includes(q) ||
      (u.role ?? '').toLowerCase().includes(q)
    )
  })

  function updateLocal(id: string, patch: Partial<AdminUserRow>) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u))
  }

  async function saveUser(id: string) {
    const u = users.find(x => x.id === id)
    if (!u) return
    setSavingId(id)
    setErrorId(null)
    const { error } = await supabase.from('user_profiles').update({
      role: u.role ?? 'explorer',
      lead_circles: u.lead_circles ?? [],
    }).eq('id', id)
    setSavingId(null)
    if (error) {
      setErrorId({ id, msg: error.message })
    } else {
      setSavedId(id)
      setTimeout(() => setSavedId(s => s === id ? null : s), 2200)
    }
  }

  function toggleCircle(id: string, pillar: CircleSlug) {
    const u = users.find(x => x.id === id)
    if (!u) return
    const current = u.lead_circles ?? []
    const next = current.includes(pillar)
      ? current.filter(c => c !== pillar)
      : [...current, pillar]
    updateLocal(id, { lead_circles: next })
  }

  // The v4 look (Admin › Permissions): same data and saves, the shared building blocks
  if (DESIGN === 'v4') {
    return <PermissionsV4 {...{ users, filtered, filter, setFilter, readOnly, openQuestions, circles, circleUnits, memberOf, toggleMember, toggleCircle, updateLocal, saveUser, savingId, savedId, errorId }} />
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#dc2626', background: '#dc262615', padding: '3px 10px', borderRadius: 20, marginBottom: 12 }}>
          Admin
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', lineHeight: 1.1, marginBottom: 8 }}>
          {title}
        </h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>
          {readOnly ? 'Everyone’s role, the circles they lead and the circles they’re in. Only admins change them.' : 'Edit role, lead circles and circle membership for any user.'} {users.length} total.
        </p>
      </div>

      {!readOnly && <AdminTabs active="users" openQuestions={openQuestions} />}

      {/* Search */}
      <input
        type="text"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Search by name, username, or role…"
        style={{
          width: '100%', maxWidth: 360, marginBottom: 24, boxSizing: 'border-box',
          padding: '10px 14px', borderRadius: 'var(--radius)',
          border: '1px solid var(--rule)', background: 'var(--surface)',
          color: 'var(--ink)', fontSize: 14, outline: 'none', fontFamily: 'inherit',
        }}
      />

      {/* User list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(u => {
          const isCircleLead = u.role === 'circle_lead'
          const leadCircles = u.lead_circles ?? []
          const isSaved = savedId === u.id
          const isSaving = savingId === u.id
          const err = errorId?.id === u.id ? errorId.msg : null

          return (
            <div key={u.id} className="admin-user-row" style={{
              background: 'var(--surface)', border: '1px solid var(--rule)',
              borderRadius: 12, padding: '14px 18px',
              display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16,
              alignItems: 'center',
            }}>
              {/* Identity */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
                  {userDisplayName(u)}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                  @{u.username ?? '—'}
                </div>
                {isCircleLead && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {circles.slugs.filter(p => !readOnly || leadCircles.includes(p)).map(p => {
                      const meta = circles.meta(p)
                      const active = leadCircles.includes(p)
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => toggleCircle(u.id, p)}
                          disabled={readOnly}
                          style={{
                            fontSize: 11, fontWeight: 600,
                            padding: '3px 9px', borderRadius: 20,
                            background: active ? meta.color : 'var(--surface)',
                            color: active ? '#fff' : 'var(--ink-3)',
                            border: `1px solid ${active ? meta.color : 'var(--rule)'}`,
                            cursor: readOnly ? 'default' : 'pointer',
                          }}
                        >
                          {meta.emoji} {meta.label}
                        </button>
                      )
                    })}
                  </div>
                )}
                {circleUnits.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--ink-4)', marginRight: 2 }}>Member of</span>
                    {circles.slugs.filter(p => circleUnits.some(u => u.circle === p) && (!readOnly || (memberOf[u.id] ?? []).includes(p))).map(p => {
                      const meta = circles.meta(p)
                      const on = (memberOf[u.id] ?? []).includes(p)
                      return (
                        <button key={p} type="button" onClick={() => toggleMember(u.id, p)} disabled={readOnly} title={readOnly ? undefined : on ? `Remove from ${meta.label}` : `Add to ${meta.label}`} style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, cursor: readOnly ? 'default' : 'pointer',
                          background: on ? `color-mix(in srgb, ${meta.color} 14%, var(--surface))` : 'var(--surface)',
                          color: on ? meta.color : 'var(--ink-4)',
                          border: `1px ${on ? 'solid' : 'dashed'} ${on ? meta.color : 'var(--rule)'}`,
                        }}>
                          {meta.emoji} {meta.label}
                        </button>
                      )
                    })}
                  </div>
                )}
                {err && <p style={{ fontSize: 12, color: '#ef4444', margin: '8px 0 0' }}>{err}</p>}
              </div>

              {/* Role select */}
              {readOnly ? (
                <span style={{ fontSize: 12, fontWeight: 600, color: ROLE_COLOR[u.role ?? 'explorer'] ?? 'var(--ink-2)' }}>
                  {ROLES.find(r => r.value === (u.role ?? 'explorer'))?.label ?? u.role}
                </span>
              ) : <select
                value={u.role ?? 'explorer'}
                onChange={e => updateLocal(u.id, { role: e.target.value })}
                style={{
                  fontSize: 12, fontWeight: 600,
                  color: ROLE_COLOR[u.role ?? 'explorer'] ?? 'var(--ink-2)',
                  background: 'var(--surface)',
                  border: '1px solid var(--rule)',
                  borderRadius: 7, padding: '6px 10px',
                  cursor: 'pointer', outline: 'none',
                }}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>}

              {/* Save */}
              {!readOnly && <button
                onClick={() => saveUser(u.id)}
                disabled={isSaving}
                style={{
                  fontSize: 12, fontWeight: 600,
                  padding: '6px 14px', borderRadius: 7, border: 'none',
                  background: isSaved ? '#22c55e' : isSaving ? 'var(--ink-4)' : 'var(--ink)',
                  color: '#fff', cursor: isSaving ? 'wait' : 'pointer',
                  transition: 'background 120ms',
                }}
              >
                {isSaving ? 'Saving…' : isSaved ? '✓ Saved' : 'Save'}
              </button>}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: 'var(--ink-4)', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>
          No users match "{filter}".
        </p>
      )}
    </div>
  )
}

/* ─── Admin › Permissions in the v4 look ─────────────────────────── */

function PermissionsV4({ users, filtered, filter, setFilter, readOnly, openQuestions, circles, circleUnits, memberOf, toggleMember, toggleCircle, updateLocal, saveUser, savingId, savedId, errorId }: {
  users: AdminUserRow[]; filtered: AdminUserRow[]; filter: string; setFilter: (v: string) => void; readOnly: boolean; openQuestions: number
  circles: ReturnType<typeof useCircles>; circleUnits: { id: string; circle: string }[]; memberOf: Record<string, string[]>
  toggleMember: (id: string, c: CircleSlug) => void; toggleCircle: (id: string, c: CircleSlug) => void
  updateLocal: (id: string, patch: Partial<AdminUserRow>) => void; saveUser: (id: string) => void
  savingId: string | null; savedId: string | null; errorId: { id: string; msg: string } | null
}) {
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [explain, setExplain] = useState(false)
  const count = (r: string) => users.filter(u => (u.role ?? 'explorer') === r).length
  const shown = filtered.filter(u => !roleFilter || (u.role ?? 'explorer') === roleFilter)

  return (
    <div className="v4-page">
      <PageHeader
        eyebrow="Admin"
        title="Permissions"
        subtitle={readOnly
          ? <>Everyone’s role and circles. <b>Only admins change them.</b></>
          : <>Each person’s role, the circles they lead and the circles they’re in. <b>{users.length} people.</b></>}
        actions={!readOnly ? <Button variant="secondary" href="/admin/questions" icon="chat">Questions{openQuestions ? ` · ${openQuestions}` : ''}</Button> : undefined}
      />

      <div className="v4-toolbar">
        <ChipRow>
          <Chip on={roleFilter === null} onClick={() => setRoleFilter(null)} count={users.length}>Everyone</Chip>
          {ROLES.filter(r => count(r.value) > 0).map(r => (
            <Chip key={r.value} on={roleFilter === r.value} onClick={() => setRoleFilter(r.value)} count={count(r.value)}>{r.label}</Chip>
          ))}
        </ChipRow>
        <label className="v4-search">
          <Icon name="search" size={16} />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search people" aria-label="Search people" />
        </label>
      </div>

      <p className="v4-more" style={{ textAlign: 'left', margin: '0 0 10px' }}>
        <button type="button" className="v4-btn v4-btn--quiet" onClick={() => setExplain(v => !v)}>{explain ? 'Hide' : 'What can each role do?'}</button>
      </p>
      {explain && (
        <List>
          {ROLES.map(r => <ListRow key={r.value} title={r.label} meta={ROLE_CAN[r.value]} />)}
        </List>
      )}

      <div className="v4-people">
        {shown.map(u => {
          const role = u.role ?? 'explorer'
          const leads = u.lead_circles ?? []
          const inCircles = memberOf[u.id] ?? []
          const err = errorId?.id === u.id ? errorId.msg : null
          return (
            <Card key={u.id} className="v4-person">
              <div className="v4-person__top">
                <span className="v4-avatar">{(u.first_name || u.username || '?').slice(0, 1).toUpperCase()}</span>
                <div className="v4-person__who">
                  <b>{userDisplayName(u)}</b>
                  <small>@{u.username ?? '—'}</small>
                </div>
                {readOnly ? (
                  <span className="v4-tag">{ROLES.find(r => r.value === role)?.label ?? role}</span>
                ) : (
                  <>
                    <select className="v4-select" value={role} aria-label={`Role of ${userDisplayName(u)}`} onChange={e => updateLocal(u.id, { role: e.target.value })}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <Button size="sm" onClick={() => saveUser(u.id)} disabled={savingId === u.id}>
                      {savingId === u.id ? 'Saving…' : savedId === u.id ? 'Saved' : 'Save'}
                    </Button>
                  </>
                )}
              </div>
              {role === 'circle_lead' && (
                <div className="v4-person__line">
                  <small>Leads</small>
                  {circles.slugs.filter(c => !readOnly || leads.includes(c)).map(c => (
                    <button key={c} type="button" disabled={readOnly} aria-pressed={leads.includes(c)}
                      className={`v4-tag${leads.includes(c) ? ' v4-tag--on' : ''}`} onClick={() => toggleCircle(u.id, c)}>
                      <span className="v4-dot" style={{ background: circles.meta(c).color }} />{circles.meta(c).label}
                    </button>
                  ))}
                  {!readOnly && <small className="v4-muted">Save to keep</small>}
                </div>
              )}
              {circleUnits.length > 0 && (
                <div className="v4-person__line">
                  <small>Member of</small>
                  {circles.slugs.filter(c => circleUnits.some(x => x.circle === c) && (!readOnly || inCircles.includes(c))).map(c => (
                    <button key={c} type="button" disabled={readOnly} aria-pressed={inCircles.includes(c)}
                      className={`v4-tag${inCircles.includes(c) ? ' v4-tag--in' : ' v4-tag--out'}`} onClick={() => toggleMember(u.id, c)}
                      title={readOnly ? undefined : inCircles.includes(c) ? `Remove from ${circles.meta(c).label}` : `Add to ${circles.meta(c).label}`}>
                      <span className="v4-dot" style={{ background: circles.meta(c).color }} />{circles.meta(c).label}
                    </button>
                  ))}
                  {readOnly && inCircles.length === 0 && <small className="v4-muted">No circle yet</small>}
                </div>
              )}
              {err && <p className="v4-error">{err}</p>}
            </Card>
          )
        })}
        {shown.length === 0 && <p className="v4-muted" style={{ textAlign: 'center', padding: 24 }}>Nobody matches that.</p>}
      </div>

      {!readOnly && (
        <>
          <SectionHead title="Community settings" />
          <p className="v4-prose v4-muted" style={{ marginBottom: 10 }}>Only admins change these. Each one opens where it lives.</p>
          <List>
            {PLATFORM_SETTINGS.map(x => (
              <ListRow key={x.href} href={x.href} lead={<IconTile name={x.icon} tone="violet" />} title={x.title} meta={x.text} trail={<Icon name="right" />} />
            ))}
          </List>
        </>
      )}
    </div>
  )
}
