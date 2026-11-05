'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/core/lib/supabase/client'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import AdminTabs from '@/modules/admin/AdminTabs'

/**
 * Admin › Questions: everything people asked the portal assistant. Questions the
 * community's material couldn't answer are flagged; admins fill the gap in the
 * Blueprint or a document, then mark them resolved (or dismiss spam / off-topic).
 */

export interface QuestionRow {
  id: string
  created_at: string
  user_id: string | null
  question: string
  answer: string | null
  answered: boolean
  status: 'open' | 'resolved' | 'dismissed'
  admin_note: string | null
  asker: { name: string; username: string } | null
}

type Filter = 'needs' | 'all' | 'resolved' | 'dismissed'

const needsAnswer = (q: QuestionRow) => !q.answered && q.status === 'open'

export default function QuestionsAdminClient({ initial }: { initial: QuestionRow[] }) {
  const [rows, setRows] = useState(initial)
  const [filter, setFilter] = useState<Filter>(initial.some(needsAnswer) ? 'needs' : 'all')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [error, setError] = useState('')

  const counts = useMemo(() => ({
    needs: rows.filter(needsAnswer).length,
    all: rows.length,
    resolved: rows.filter(r => r.status === 'resolved').length,
    dismissed: rows.filter(r => r.status === 'dismissed').length,
    week: rows.filter(r => Date.now() - new Date(r.created_at).getTime() < 7 * 864e5).length,
  }), [rows])

  const shown = rows.filter(r =>
    (filter === 'all' || (filter === 'needs' ? needsAnswer(r) : r.status === filter)) &&
    (!search.trim() || r.question.toLowerCase().includes(search.trim().toLowerCase())))

  const update = async (id: string, patch: Partial<Pick<QuestionRow, 'status' | 'admin_note'>>) => {
    setError('')
    const before = rows
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)))
    const { error: err } = await createClient().from('assistant_questions').update(patch).eq('id', id)
    if (err) { setRows(before); setError(err.message) }
  }

  const pill = (id: Filter, label: string, n: number) => (
    <button key={id} onClick={() => setFilter(id)} style={{
      padding: '6px 12px', borderRadius: 999, fontSize: 12.5, cursor: 'pointer', fontWeight: filter === id ? 700 : 500,
      border: `1px solid ${filter === id ? 'var(--ink)' : 'var(--rule)'}`, background: filter === id ? 'var(--ink)' : 'var(--surface)', color: filter === id ? 'var(--bg)' : 'var(--ink-2)',
    }}>{label} <span style={{ opacity: 0.7 }}>{n}</span></button>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px 80px' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#dc2626', background: '#dc262615', padding: '3px 10px', borderRadius: 20, marginBottom: 12 }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, margin: '0 0 6px' }}>Questions</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0, maxWidth: '70ch', lineHeight: 1.55 }}>
          Everything people asked the <strong>Ask {COMMUNITY_NAME}</strong> assistant ({counts.week} this week). Questions it couldn&rsquo;t answer from the community&rsquo;s material are flagged: add the answer to the <Link href="/blueprint" style={{ color: 'var(--accent-color)' }}>Blueprint</Link> or a <Link href="/blueprint?step=documents" style={{ color: 'var(--accent-color)' }}>document</Link>, then mark the question resolved.
        </p>
      </div>

      <AdminTabs active="questions" openQuestions={counts.needs} />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        {pill('needs', 'Needs an answer', counts.needs)}
        {pill('all', 'All', counts.all)}
        {pill('resolved', 'Resolved', counts.resolved)}
        {pill('dismissed', 'Dismissed', counts.dismissed)}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions…"
          style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: 999, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, minWidth: 200 }} />
      </div>

      {error && <div style={{ fontSize: 13, color: '#b91c1c', background: '#b91c1c12', border: '1px solid #b91c1c40', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{error}</div>}

      {shown.length === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14, border: '1px dashed var(--rule)', borderRadius: 12 }}>
          {rows.length === 0 ? 'No questions yet. They appear here as people use the assistant.' : filter === 'needs' ? 'Nothing waiting: every question so far was answered or handled. 🎉' : 'No questions match.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map(r => {
          const expanded = open === r.id
          return (
            <div key={r.id} style={{ border: `1px solid ${needsAnswer(r) ? '#f59e0b80' : 'var(--rule)'}`, borderLeft: `3px solid ${needsAnswer(r) ? '#f59e0b' : r.status === 'resolved' ? '#15803d' : 'var(--rule)'}`, borderRadius: 10, background: 'var(--surface)' }}>
              <button onClick={() => setOpen(expanded ? null : r.id)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', color: 'var(--ink)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.4 }}>{r.question}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                    {r.asker ? <>{r.asker.name} <span style={{ color: 'var(--ink-4)' }}>@{r.asker.username}</span></> : 'Visitor'} · {new Date(r.created_at).toLocaleString()}
                    {r.admin_note && <> · 📝 {r.admin_note}</>}
                  </div>
                </div>
                <span style={{ flexShrink: 0, display: 'flex', gap: 6, alignItems: 'center' }}>
                  {!r.answered && <span style={{ fontSize: 11, fontWeight: 700, color: '#b45309', background: '#f59e0b1f', border: '1px solid #f59e0b66', borderRadius: 999, padding: '1px 8px' }}>No answer</span>}
                  {r.status !== 'open' && <span style={{ fontSize: 11, fontWeight: 700, color: r.status === 'resolved' ? '#15803d' : 'var(--ink-3)', border: '1px solid var(--rule)', borderRadius: 999, padding: '1px 8px' }}>{r.status === 'resolved' ? 'Resolved' : 'Dismissed'}</span>}
                  <span style={{ color: 'var(--ink-4)', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
                </span>
              </button>
              {expanded && (
                <div style={{ borderTop: '1px solid var(--rule-soft)', padding: '12px 14px 14px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>The assistant answered</div>
                  <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'var(--bg-2)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>{r.answer || '(no reply)'}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {r.status !== 'resolved' && <button onClick={() => update(r.id, { status: 'resolved' })} style={btn('#15803d')}>✓ Mark resolved</button>}
                    {r.status !== 'dismissed' && <button onClick={() => update(r.id, { status: 'dismissed' })} style={btn('var(--ink-3)')}>Dismiss</button>}
                    {r.status !== 'open' && <button onClick={() => update(r.id, { status: 'open' })} style={btn('var(--ink-3)')}>Reopen</button>}
                    <input defaultValue={r.admin_note ?? ''} placeholder="Note (e.g. added to the handbook)" maxLength={1000}
                      onBlur={e => { const v = e.target.value.trim(); if (v !== (r.admin_note ?? '')) update(r.id, { admin_note: v || null }) }}
                      style={{ flex: 1, minWidth: 220, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 12.5 }} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const btn = (color: string): React.CSSProperties => ({
  fontSize: 12.5, fontWeight: 600, padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
  border: `1px solid ${color}`, background: 'var(--surface)', color,
})
