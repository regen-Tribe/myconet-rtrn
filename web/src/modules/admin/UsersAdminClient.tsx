'use client'
import { useState } from 'react'
import AdminTabs from '@/modules/admin/AdminTabs'
import { createClient } from '@/core/lib/supabase/client'
import { useCircles } from '@/core/components/CirclesProvider'
import type { CircleSlug } from '@/core/lib/circles'

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

function userDisplayName(u: AdminUserRow): string {
  const fl = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
  return fl || u.username || 'Unnamed user'
}

export default function UsersAdminClient({ initialUsers, openQuestions = 0 }: { initialUsers: AdminUserRow[]; openQuestions?: number }) {
  const circles = useCircles()
  const supabase = createClient()
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers)
  const [filter, setFilter] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<{ id: string; msg: string } | null>(null)

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

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#dc2626', background: '#dc262615', padding: '3px 10px', borderRadius: 20, marginBottom: 12 }}>
          Admin
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', lineHeight: 1.1, marginBottom: 8 }}>
          Users
        </h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>
          Edit role and lead circles for any user. {users.length} total.
        </p>
      </div>

      <AdminTabs active="users" openQuestions={openQuestions} />

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
                    {circles.slugs.map(p => {
                      const meta = circles.meta(p)
                      const active = leadCircles.includes(p)
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => toggleCircle(u.id, p)}
                          style={{
                            fontSize: 11, fontWeight: 600,
                            padding: '3px 9px', borderRadius: 20,
                            background: active ? meta.color : 'var(--surface)',
                            color: active ? '#fff' : 'var(--ink-3)',
                            border: `1px solid ${active ? meta.color : 'var(--rule)'}`,
                            cursor: 'pointer',
                          }}
                        >
                          {meta.emoji} {meta.label}
                        </button>
                      )
                    })}
                  </div>
                )}
                {err && <p style={{ fontSize: 12, color: '#ef4444', margin: '8px 0 0' }}>{err}</p>}
              </div>

              {/* Role select */}
              <select
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
              </select>

              {/* Save */}
              <button
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
              </button>
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
