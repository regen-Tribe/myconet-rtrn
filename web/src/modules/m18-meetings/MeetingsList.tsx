'use client'
import { Button, Icon, PageHeader, StatusPill } from '@/core/components/v4'
import { DESIGN } from '@/core/lib/instance'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useCircles } from '@/core/components/CirclesProvider'
import { taskDate } from '@/core/lib/tasks'
import type { MeetingListItem, MeetingStatus } from './types'
import { modLabel } from '@/core/lib/module-label'
import { CircleFilter, parseCircleParam } from '@/core/components/v4/CircleFilter'
import './meetings-v4.css'
import { withoutDate } from './lib/title'

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

const V4 = DESIGN === 'v4'

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
  // The circle filter: several circles at once ([] = all). In the address as ?circle=mine | all | a,b,
  // so "Meeting notes" links and the back button work; with no ?circle= it opens on My circles
  const fromParam = (raw: string): string[] => raw === 'mine' ? myCircles : raw === 'all' ? [] : parseCircleParam(raw, s => circles.has(s))
  const [picked, setPicked] = useState<string[]>(() => fromParam(initialCircle ?? (myCircles.length ? 'mine' : 'all')))
  const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x))
  const isMine = myCircles.length > 0 && sameSet(picked, myCircles)
  const filter = picked.length === 0 ? 'all' : isMine ? 'mine' : picked.join(',')
  const setFilter = (key: string) => setPicked(fromParam(key))
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
    // Community-wide meetings (no single circle) concern everyone, so they count towards My circles too
    const cw = meetings.filter(m => !m.circle && m.processed_at).length
    const out: Record<string, number> = { all: meetings.length, mine: meetings.filter(m => m.circle && myCircles.includes(m.circle)).length + cw }
    for (const m of meetings) if (m.circle) out[m.circle] = (out[m.circle] ?? 0) + 1
    return out
  }, [meetings, myCircles])
  const needsLead = (m: MeetingListItem) => (m.needs_review && !m.processed_at) || (taskCounts[m.id]?.drafts ?? 0) > 0
  const reviewCount = meetings.filter(needsLead).length

  // A community-wide meeting (the agent found no single circle, e.g. a morning sync) concerns everyone,
  // so it shows in My circles as well as All — it isn't hidden until you switch to All.
  const communityWide = (m: MeetingListItem) => !m.circle && !!m.processed_at
  const needle = q.trim().toLowerCase()
  const shown = meetings.filter(m => {
    if (picked.length && !((m.circle && picked.includes(m.circle)) || (isMine && communityWide(m)))) return false
    if (needsReview && !needsLead(m)) return false
    if (needle && !`${m.title} ${m.summary ?? ''} ${m.attendees.join(' ')}`.toLowerCase().includes(needle)) return false
    return true
  })

  const chip = (key: string, label: string, color = 'var(--m18)', dot = false) => {
    const on = filter === key
    if (V4) return (
      <button key={key} type="button" aria-pressed={on} className={`v4-chip${on ? ' v4-chip--on' : ''}`} onClick={() => setFilter(key)}>
        {dot && <i className="mt4-dot" style={{ background: color }} aria-hidden />}{label}{counts[key] ? <span className="v4-chip__count">{counts[key]}</span> : null}
      </button>
    )
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
    <div className={DESIGN === 'v4' ? 'v4-page' : undefined} style={DESIGN === 'v4' ? { maxWidth: 940 } : { maxWidth: 860, margin: '0 auto', padding: '48px 20px 80px' }}>
{DESIGN === 'v4' ? (
        <PageHeader eyebrow="Working together" title="Meetings"
          subtitle="Every meeting the community has recorded. The assistant reads each one, chooses its circle, and puts its tasks on the board as drafts for the leads to confirm."
          actions={<Button href="/meetings/upload" icon="upload">Upload recording</Button>} />
      ) : (<>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--m18)', background: 'color-mix(in srgb, var(--m18) 10%, var(--surface))', padding: '3px 10px', borderRadius: 20, marginBottom: 12 }}>
            {modLabel('18', 'Meetings')}
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', lineHeight: 1.1, margin: 0 }}>Meeting notes</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '8px 0 0', maxWidth: 520, lineHeight: 1.5 }}>
            Every meeting the community has recorded. The assistant reads each one from Fireflies, chooses its circle, and puts its tasks on the board as drafts for the leads to confirm.
          </p>
        </div>
        <Link href="/meetings/upload" style={{ padding: '10px 16px', borderRadius: 8, background: 'var(--m18)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Upload recording
        </Link>
      </div>
      </>)}

      {V4 ? (
        <div style={{ marginBottom: 12 }}>
          <CircleFilter
            options={usedCircles.map(c => ({ slug: c, label: circles.meta(c).label, color: circles.meta(c).color, count: counts[c] ?? 0 }))}
            value={picked} onChange={setPicked} mine={myCircles}
          />
        </div>
      ) : (
      <div role="group" aria-label="Show meetings of" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {myCircles.length > 0 && chip('mine', 'My circles')}
        {chip('all', 'All')}
        {usedCircles.map(c => chip(c, `${circles.meta(c).emoji} ${circles.meta(c).label}`, circles.meta(c).color))}
      </div>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
        <input
          type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search titles, summaries, people…" aria-label="Search meetings"
          className={V4 ? 'v4-input' : undefined}
          style={V4 ? { flex: '1 1 240px', width: 'auto' } : { flex: '1 1 240px', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13.5 }}
        />
        {canManage && V4 && (
          <button type="button" aria-pressed={needsReview} className={`v4-chip${needsReview ? ' v4-chip--on' : ''}`} onClick={() => setNeedsReview(v => !v)}>
            Needs review{reviewCount ? <span className="v4-chip__count">{reviewCount}</span> : null}
          </button>
        )}
        {canManage && !V4 && (
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
      ) : V4 ? (
        <V4Rows shown={shown} taskCounts={taskCounts} />
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
                      {m.visibility === 'circle' && <Pill label="Circle only" color="#64748b" />}
                      {m.status !== 'done' ? <Pill label={s.label} color={s.color} />
                        : m.needs_review && !m.processed_at && !m.agent_note ? <Pill label="Assistant reading soon" color="#64748b" />
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


/** The summary's first point as plain text (no "- **Topic:**" markdown) */
const firstPoint = (s: string) => {
  const line = s.split(/\n|(?:^|\s)-\s+(?=\*\*)/).map(l => l.trim()).find(l => l.replace(/[-*#\s]/g, '').length > 0) ?? ''
  return line.replace(/^[-*#\s]+/, '').replace(/\*\*/g, '').replace(/__/g, '').trim()
}

const dayOf = (m: MeetingListItem) => {
  const iso = m.meeting_date ?? m.created_at
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? taskDate(iso) : new Date(iso)
}

/** "This week", "Last week", then "November 2026" */
function groupLabel(d: Date, now = new Date()) {
  const monday = (x: Date) => { const y = new Date(x.getFullYear(), x.getMonth(), x.getDate()); y.setDate(y.getDate() - ((y.getDay() + 6) % 7)); return y.getTime() }
  const weeks = Math.round((monday(now) - monday(d)) / (7 * 86_400_000))
  if (weeks <= 0) return 'This week'
  if (weeks === 1) return 'Last week'
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** v4 rows: a date box, the circle by name (not only its colour), the title without its date, one line of summary */
function V4Rows({ shown, taskCounts }: { shown: MeetingListItem[]; taskCounts: Record<string, { total: number; drafts: number }> }) {
  const circles = useCircles()
  const groups: { label: string; items: MeetingListItem[] }[] = []
  for (const m of shown) {
    const label = groupLabel(dayOf(m))
    const g = groups[groups.length - 1]
    if (g && g.label === label) g.items.push(m)
    else groups.push({ label, items: [m] })
  }
  return (
    <>
      {groups.map(g => (
        <section key={g.label} className="mt4-group">
          <div className="v4-sec"><h2>{g.label}</h2><span className="v4-hint">{g.items.length} meeting{g.items.length === 1 ? '' : 's'}</span></div>
          <div className="v4-list mt4-list">
            {g.items.map(m => {
              const meta = m.circle && circles.has(m.circle) ? circles.meta(m.circle) : null
              const t = taskCounts[m.id]
              const s = STATUS[m.status] ?? STATUS.processing
              const d = dayOf(m)
              const pill = m.status !== 'done' ? <StatusPill status={m.status === 'error' ? 'no' : 'doing'} label={s.label} />
                : m.needs_review && !m.processed_at && !m.agent_note ? <StatusPill status="idea" label="Assistant reading soon" />
                : m.needs_review && !m.processed_at ? <StatusPill status="review" label="Needs review" />
                : t?.drafts ? <StatusPill status="review" label={`${t.drafts} to confirm`} />
                : null
              const facts = [
                m.status === 'done' ? `${m.action_items.length} action item${m.action_items.length === 1 ? '' : 's'}` : null,
                t ? `${t.total} task${t.total === 1 ? '' : 's'} on the board` : null,
                m.attendees.length ? `${m.attendees.length} ${m.attendees.length === 1 ? 'person' : 'people'}` : null,
              ].filter(Boolean).join(' · ')
              const point = m.summary ? firstPoint(m.summary) : ''
              return (
                <Link key={m.id} href={`/meetings/${m.id}`} className="v4-row v4-row--click mt4-row" style={{ ['--c' as string]: meta?.color ?? 'var(--ink-4)' }}
                  title={m.attendees.length ? m.attendees.join(', ') : undefined}>
                  <span className="v4-row__lead">
                    <span className="mt4-date" aria-label={fmtDay(m.meeting_date ?? m.created_at)}>
                      <small>{d.toLocaleDateString('en-US', { month: 'short' })}</small>
                      <b>{d.getDate()}</b>
                      <small>{d.toLocaleDateString('en-US', { weekday: 'short' })}</small>
                    </span>
                  </span>
                  <span className="v4-row__main">
                    <span className="mt4-circle">
                      {meta
                        ? <span className="mt4-ctag"><i className="mt4-dot" aria-hidden />{cap(meta.label)}</span>
                        : <span className="mt4-ctag mt4-ctag--none">{m.processed_at ? 'Community-wide' : 'No circle yet'}</span>}
                      {m.visibility === 'circle' && <span className="mt4-lock"><Icon name="lock" size={12} />Circle only</span>}
                      {pill && <span className="mt4-pill-phone">{pill}</span>}
                    </span>
                    <b className="mt4-title">{withoutDate(m.title)}</b>
                    {point && <small className="mt4-sum">{point}</small>}
                    {facts && <small>{facts}</small>}
                  </span>
                  <span className="v4-row__trail mt4-trail">
                    {pill && <span className="mt4-pill-wide">{pill}</span>}
                    <Icon name="right" size={16} />
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}
