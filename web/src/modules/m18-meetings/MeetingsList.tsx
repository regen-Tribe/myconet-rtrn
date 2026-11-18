'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useCircles } from '@/core/components/CirclesProvider'
import { taskDate } from '@/core/lib/tasks'
import type { MeetingListItem, MeetingStatus } from './types'

const STATUS: Record<MeetingStatus, { label: string; color: string }> = {
  processing: { label: 'Transcribing', color: '#b45309' },
  done: { label: 'Ready', color: '#15803d' },
  error: { label: 'Failed', color: '#b91c1c' },
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: `color-mix(in srgb, ${color} 12%, var(--surface))`, padding: '2px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

const fmtDay = (iso: string) =>
  (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? taskDate(iso) : new Date(iso)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

/** All meetings, newest first, with circle filters (My circles, All, one circle), search and "Needs review" */
export default function MeetingsList({ meetings, taskCounts, myCircles, canManage, initialCircle, initialQuery }: {
  meetings: MeetingListItem[]
  taskCounts: Record<string, { total: number; drafts: number }>
  myCircles: string[]
  canManage: boolean
  /** From ?circle=: a circle slug, "mine" or "all" */
  initialCircle: string | null
  initialQuery: string
}) {
  const circles = useCircles()
  const [filter, setFilter] = useState<string>(initialCircle ?? (myCircles.length ? 'mine' : 'all'))
  const [q, setQ] = useState(initialQuery)
  const [needsReview, setNeedsReview] = useState(false)

  // Keep the filter in the URL, so "Meeting notes" links and the back button work
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('circle', filter)
    if (q.trim()) params.set('q', q.trim())
    window.history.replaceState(null, '', `/meetings?${params.toString()}`)
  }, [filter, q])

  const usedCircles = useMemo(() => circles.slugs.filter(c => meetings.some(m => m.circle === c)), [circles.slugs, meetings])
  const counts = useMemo(() => {
    const out: Record<string, number> = { all: meetings.length, mine: meetings.filter(m => m.circle && myCircles.includes(m.circle)).length }
    for (const m of meetings) if (m.circle) out[m.circle] = (out[m.circle] ?? 0) + 1
    return out
  }, [meetings, myCircles])
  const needsLead = (m: MeetingListItem) => (m.needs_review && !m.processed_at) || (taskCounts[m.id]?.drafts ?? 0) > 0
  const reviewCount = meetings.filter(needsLead).length

  const needle = q.trim().toLowerCase()
  const shown = meetings.filter(m => {
    if (filter === 'mine' && !(m.circle && myCircles.includes(m.circle))) return false
    if (filter !== 'mine' && filter !== 'all' && m.circle !== filter) return false
    if (needsReview && !needsLead(m)) return false
    if (needle && !`${m.title} ${m.summary ?? ''} ${m.attendees.join(' ')}`.toLowerCase().includes(needle)) return false
    return true
  })

  const chip = (key: string, label: string, color = 'var(--m18)') => {
    const on = filter === key
    return (
      <button key={key} onClick={() => setFilter(key)} style={{
        fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap',
        color: on ? '#fff' : 'var(--ink-2)', background: on ? color : 'var(--surface)',
        border: `1px solid ${on ? color : 'var(--rule)'}`, borderRadius: 999, padding: '5px 12px',
      }}>
        {label}{counts[key] ? ` · ${counts[key]}` : ''}
      </button>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 20px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--m18)', background: 'color-mix(in srgb, var(--m18) 10%, var(--surface))', padding: '3px 10px', borderRadius: 20, marginBottom: 12 }}>
            M18 · Meetings
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', lineHeight: 1.1, margin: 0 }}>Meeting notes</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '8px 0 0', maxWidth: 520, lineHeight: 1.5 }}>
            Every meeting the community has recorded. The agent reads each one from Fireflies, chooses its circle, and puts its tasks on the board as drafts for the leads to confirm.
          </p>
        </div>
        <Link href="/meetings/upload" style={{ padding: '10px 16px', borderRadius: 8, background: 'var(--m18)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Upload recording
        </Link>
      </div>

      <div role="group" aria-label="Show meetings of" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {myCircles.length > 0 && chip('mine', 'My circles')}
        {chip('all', 'All')}
        {usedCircles.map(c => chip(c, `${circles.meta(c).emoji} ${circles.meta(c).label}`, circles.meta(c).color))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
        <input
          type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search titles, summaries, people…" aria-label="Search meetings"
          style={{ flex: '1 1 240px', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13.5 }}
        />
        {canManage && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={needsReview} onChange={e => setNeedsReview(e.target.checked)} />
            Needs review{reviewCount ? ` (${reviewCount})` : ''}
          </label>
        )}
      </div>

      {meetings.length === 0 ? (
        <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '40px 24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14, background: 'var(--surface)' }}>
          No meeting notes yet. Upload a recording and the transcript and summary appear here.
        </div>
      ) : shown.length === 0 ? (
        <div style={{ border: '1px dashed var(--rule)', borderRadius: 12, padding: '28px 24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
          No meetings match. <button onClick={() => { setFilter('all'); setQ(''); setNeedsReview(false) }} style={{ background: 'none', border: 'none', color: 'var(--m18)', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Show all</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map(m => {
            const meta = m.circle && circles.has(m.circle) ? circles.meta(m.circle) : null
            const t = taskCounts[m.id]
            const s = STATUS[m.status] ?? STATUS.processing
            return (
              <Link key={m.id} href={`/meetings/${m.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ border: '1px solid var(--rule)', borderLeft: `3px solid ${meta?.color ?? 'var(--rule)'}`, borderRadius: 12, padding: '14px 18px', background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{m.title}</div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {m.visibility === 'circle' && <Pill label="🔒 Circle only" color="#64748b" />}
                      {m.status !== 'done' ? <Pill label={s.label} color={s.color} />
                        : m.needs_review && !m.processed_at && !m.agent_note ? <Pill label="Agent reading soon" color="#64748b" />
                        : m.needs_review && !m.processed_at ? <Pill label="Needs review" color="#b45309" />
                        : t?.drafts ? <Pill label={`${t.drafts} to confirm`} color="#b45309" />
                        : null}
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>
                    {fmtDay(m.meeting_date ?? m.created_at)}
                    {meta ? <> · <span style={{ color: meta.color, fontWeight: 600 }}>{meta.emoji} {meta.label}</span></> : m.processed_at ? ' · Community-wide' : ''}
                    {m.attendees.length > 0 && ` · ${m.attendees.slice(0, 6).join(', ')}${m.attendees.length > 6 ? ` +${m.attendees.length - 6}` : ''}`}
                  </div>
                  {m.summary && (
                    <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, margin: '8px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.summary}</p>
                  )}
                  {m.status === 'done' && (
                    <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 8, fontFamily: 'var(--mono)' }}>
                      {m.action_items.length} action item{m.action_items.length === 1 ? '' : 's'}
                      {t ? ` · ${t.total} task${t.total === 1 ? '' : 's'} on the board${t.drafts ? `, ${t.drafts} draft${t.drafts === 1 ? '' : 's'}` : ''}` : ''}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
