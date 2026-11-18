'use client'

import { DraftSwipe } from '@/modules/m07-ops/DraftSwipe'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCircles } from '@/core/components/CirclesProvider'
import { fmtTaskWhen } from '@/core/lib/tasks'
import NotesText from './NotesText'
import SummaryCards from './SummaryCards'
import type { Meeting, MeetingTask } from './types'

const sectionStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
  color: 'color-mix(in srgb, var(--ink) 55%, transparent)', margin: '28px 0 12px',
}
const btn = (primary = false): React.CSSProperties => ({
  fontSize: 13, fontWeight: 600, borderRadius: 8, padding: '7px 13px', cursor: 'pointer', whiteSpace: 'nowrap',
  color: primary ? '#fff' : 'var(--ink-2)', background: primary ? 'var(--m18)' : 'var(--surface)',
  border: primary ? 'none' : '1px solid var(--rule)',
})
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const ago = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** The leads' bar: circle, Circle only, run the pipeline, confirm drafts, email again */
function LeadBar({ m, drafts, emailOn, secondBrainOn }: { m: Meeting; drafts: number; emailOn: boolean; secondBrainOn: boolean }) {
  const circles = useCircles()
  const router = useRouter()
  const [circle, setCircle] = useState(m.circle ?? '')
  const [circleOnly, setCircleOnly] = useState(m.visibility === 'circle')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const ready = m.status === 'done'
  const running = !!m.processing_started_at && Date.now() - new Date(m.processing_started_at).getTime() < 10 * 60_000

  async function act(action: string, extra: object = {}, label = action) {
    setBusy(label); setMsg(null)
    try {
      const res = await fetch(`/api/meetings/${m.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) })
      const r = await res.json().catch(() => ({})) as {
        error?: string; skipped?: string; added?: number; confirmed?: number; by?: string; errors?: string[]
        email?: { sent: number; error?: string } | null; pipeline?: { added?: number; skipped?: string; errors?: string[]; email?: { sent: number; error?: string } | null }
      }
      if (!res.ok || r.error) { setMsg(r.error ?? 'That didn’t work.'); return }
      const p = r.pipeline ?? (r.added !== undefined || r.skipped ? r : null)
      if (r.confirmed !== undefined) setMsg(r.confirmed ? `Confirmed ${r.confirmed} task${r.confirmed === 1 ? '' : 's'}.` : 'Nothing to confirm.')
      else if (p?.skipped) setMsg(p.skipped)
      else if (p) {
        const parts = [`${p.added ?? 0} new task${p.added === 1 ? '' : 's'} on the board`]
        if (p.email) parts.push(p.email.sent ? `emailed ${p.email.sent} lead${p.email.sent === 1 ? '' : 's'}` : `email: ${p.email.error ?? 'not sent'}`)
        if (p.errors?.length) parts.push(p.errors.join(' · '))
        setMsg(parts.join(' · '))
      } else setMsg('Saved.')
      router.refresh()
    } finally { setBusy(null) }
  }

  const saveSettings = (process: boolean) =>
    act('settings', { circle: circle || null, visibility: circle && circleOnly ? 'circle' : 'community', process }, process ? 'settings+process' : 'settings')
  const changed = (circle || null) !== m.circle || (circleOnly ? 'circle' : 'community') !== m.visibility

  return (
    <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--m18) 30%, var(--rule))', background: 'color-mix(in srgb, var(--m18) 5%, var(--surface))', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--m18)' }}>For leads</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={circle} onChange={e => setCircle(e.target.value)} aria-label="Circle" style={{ fontSize: 13, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}>
          <option value="">No circle yet</option>
          {circles.slugs.map(c => <option key={c} value={c}>{circles.meta(c).emoji} {circles.meta(c).label}</option>)}
        </select>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: circle ? 'var(--ink-2)' : 'var(--ink-4)', cursor: circle ? 'pointer' : 'default' }}>
          <input type="checkbox" checked={circleOnly && !!circle} disabled={!circle} onChange={e => setCircleOnly(e.target.checked)} />
          🔒 Circle only
        </label>
        {changed && (
          <button onClick={() => saveSettings(!m.processed_at && ready)} disabled={!!busy} style={btn(true)}>
            {busy?.startsWith('settings') ? 'Saving…' : !m.processed_at && ready ? 'Save and put tasks on the board' : 'Save'}
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {drafts > 0 && <button onClick={() => act('confirm')} disabled={!!busy} style={btn(true)}>{busy === 'confirm' ? 'Confirming…' : `Confirm all ${drafts} draft${drafts === 1 ? '' : 's'}`}</button>}
        {ready && !changed && (
          <button onClick={() => act('process')} disabled={!!busy || running} style={btn()} title="The agent reads the meeting again: adds tasks that aren’t on the board yet and rewrites the second-brain note">
            {busy === 'process' || running ? 'Working…' : m.processed_at ? 'Look for new tasks again' : m.circle ? 'Put tasks on the board' : 'Let the agent read it'}
          </button>
        )}
        {emailOn && ready && m.processed_at && (
          <button onClick={() => act('email')} disabled={!!busy} style={btn()}>{busy === 'email' ? 'Sending…' : m.notes_emailed_at ? 'Email the notes again' : 'Email the notes'}</button>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6 }}>
        {!ready ? 'Waiting for the notes from Fireflies.'
          : running ? 'The agent is reading this meeting…'
          : m.processed_at
            ? <>Agent ran {ago(m.processed_at)}. {m.circle_source === 'agent' ? (m.circle ? 'It chose the circle' : 'It found this meeting community-wide') : m.circle ? 'The circle was set by a person' : ''}{m.agent_note ? `: ${m.agent_note}` : '.'} Change the circle above if it’s wrong (tasks already on the board stay where they are).</>
          : m.needs_review && m.agent_note
            ? <>The agent didn’t put anything on the board: {m.agent_note} If this is a community meeting, choose its circle and save.</>
            : 'The agent hasn’t read this meeting yet: it reads each new meeting within a few minutes.'}
        {m.notes_emailed_at ? ` Emailed ${m.notes_email_count ?? 0} on ${ago(m.notes_emailed_at)}.` : ''}
        {!emailOn && ' Notes email is off (no SMTP password set).'}
        {!secondBrainOn && ' Saving to the second brain is off.'}
        {m.processing_error && <div style={{ color: '#b45309' }}>Last run: {m.processing_error}</div>}
        {msg && <div style={{ color: 'var(--ink)', fontWeight: 600 }}>{msg}</div>}
      </div>
    </div>
  )
}

const box: React.CSSProperties = { background: 'color-mix(in srgb, var(--ink) 4%, var(--surface))', padding: '16px 18px', borderRadius: 12 }
const chip: React.CSSProperties = { fontSize: 13, color: 'var(--ink-2)', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 999, padding: '3px 10px' }

/** The meeting's documents, one tab each: Fireflies' notes, the second-brain note, the transcript */
function DocTabs({ m, brainNote }: { m: Meeting; brainNote: string | null }) {
  const f = m.fireflies_notes ?? {}
  const tabs: { key: string; label: string; body: React.ReactNode }[] = []
  if (f.notes) tabs.push({ key: 'notes', label: 'Notes', body: <NotesText text={f.notes} /> })
  if (f.outline) tabs.push({ key: 'outline', label: 'Outline', body: <NotesText text={f.outline} /> })
  if (f.bullet_gist || f.shorthand_bullet) tabs.push({
    key: 'bullets', label: 'Bullet points',
    body: <>{f.bullet_gist && <NotesText text={f.bullet_gist} />}{f.bullet_gist && f.shorthand_bullet && <hr style={{ border: 0, borderTop: '1px solid var(--rule)', margin: '14px 0' }} />}{f.shorthand_bullet && <NotesText text={f.shorthand_bullet} />}</>,
  })
  if (f.topics?.length || f.keywords?.length) tabs.push({
    key: 'topics', label: 'Topics & keywords',
    body: <>{[['Topics discussed', f.topics], ['Keywords', f.keywords]].filter(([, v]) => (v as string[] | undefined)?.length).map(([label, v]) => (
      <div key={label as string} style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>{label as string}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{(v as string[]).map(x => <span key={x} style={chip}>{x}</span>)}</div>
      </div>
    ))}</>,
  })
  if (brainNote) tabs.push({
    key: 'brain', label: 'Second brain',
    body: <><NotesText text={brainNote} />{m.notes_url && <a href={m.notes_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--m18)' }}>Open in the second brain ↗</a>}</>,
  })
  if (m.transcript) tabs.push({
    key: 'transcript', label: 'Transcript',
    body: <pre style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--mono, ui-monospace, monospace)', margin: 0 }}>{m.transcript}</pre>,
  })
  // The first document opens; the transcript (long) only when asked. The open tab again closes it.
  const [open, setOpen] = useState<string | null>(tabs[0] && tabs[0].key !== 'transcript' ? tabs[0].key : null)
  if (!tabs.length) return null
  const current = tabs.find(t => t.key === open)
  return (
    <>
      <div style={sectionStyle}>Meeting documents</div>
      <div role="tablist" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {tabs.map(t => (
          <button key={t.key} role="tab" aria-selected={open === t.key} onClick={() => setOpen(o => (o === t.key ? null : t.key))}
            style={{ ...btn(open === t.key), fontSize: 13, padding: '6px 12px' }}>{t.label}</button>
        ))}
      </div>
      {current && <div role="tabpanel" style={box}>{current.body}</div>}
    </>
  )
}

export default function MeetingDetail({ meeting: m, tasks, canManage, emailOn, secondBrainOn, brainNote }: {
  meeting: Meeting; tasks: MeetingTask[]; canManage: boolean; emailOn: boolean; secondBrainOn: boolean; brainNote: string | null
}) {
  const router = useRouter()
  const circles = useCircles()
  const meta = m.circle && circles.has(m.circle) ? circles.meta(m.circle) : null
  const drafts = tasks.filter(t => t.needs_review).length

  const byPerson: Record<string, string[]> = {}
  for (const item of m.action_items ?? []) (byPerson[item.speaker || 'Action items'] ??= []).push(item.text)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 80px' }}>
      <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
        <Link href="/meetings" style={{ color: 'var(--m18)', textDecoration: 'none' }}>← Meetings</Link>
        {meta && <Link href={`/meetings?circle=${m.circle}`} style={{ color: meta.color, textDecoration: 'none' }}>{meta.emoji} {meta.label} meetings</Link>}
      </div>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 27, color: 'var(--ink)', lineHeight: 1.15, margin: '16px 0 8px' }}>{m.title}</h1>
      {m.original_title && m.original_title !== m.title && (
        <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 6 }}>Recorded as “{m.original_title}”</div>
      )}
      <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
        {fmtDay(m.meeting_date ?? m.created_at)}
        {meta ? <> · <span style={{ color: meta.color, fontWeight: 600 }}>{meta.emoji} {meta.label}</span>{m.circle_source === 'agent' && <span title={m.agent_note ?? ''}> (chosen by the agent)</span>}</>
          : m.processed_at ? ' · Community-wide' : ''}
        {m.visibility === 'circle' && ' · 🔒 Circle only'}
        {m.attendees.length > 0 && ` · ${m.attendees.join(', ')}`}
      </div>
      {m.notes_url && <div style={{ fontSize: 12.5, marginTop: 6 }}><a href={m.notes_url} target="_blank" rel="noreferrer" style={{ color: 'var(--m18)' }}>Notes in the second brain ↗</a></div>}

      {canManage && <LeadBar m={m} drafts={drafts} emailOn={emailOn} secondBrainOn={secondBrainOn} />}
      {!canManage && m.needs_review && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'color-mix(in srgb, var(--m18) 10%, var(--surface))', color: 'var(--m18)', fontSize: 13.5 }}>
          The agent wasn’t sure this is a community meeting, so a lead is checking it before anything goes on the board.
        </div>
      )}

      {m.status === 'processing' && (
        <div style={{ marginTop: 28, padding: '18px 20px', borderRadius: 12, background: 'color-mix(in srgb, #b45309 10%, var(--surface))', color: '#92400e', fontSize: 14 }}>
          Transcribing this recording — check back in a few minutes.
        </div>
      )}
      {m.status === 'error' && (
        <div style={{ marginTop: 28, padding: '18px 20px', borderRadius: 12, background: 'color-mix(in srgb, #b91c1c 10%, var(--surface))', color: '#991b1b', fontSize: 14 }}>
          This recording couldn’t be transcribed.{m.error ? ` (${m.error})` : ''}
        </div>
      )}
      {m.status === 'done' && (
        <>
          {m.summary && (
            <>
              <div style={sectionStyle}>Summary</div>
              <SummaryCards text={m.summary} accent={meta?.color} />
            </>
          )}

          <div style={sectionStyle}>Tasks on the board{drafts ? ` · ${drafts} to confirm` : ''}</div>
          {tasks.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>
              {m.processed_at ? 'No tasks came out of this meeting.' : m.needs_review ? 'Nothing on the board: this meeting is waiting for a lead.' : 'The agent hasn’t read this meeting yet.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasks.map(t => (
                <Link key={t.deliverable_id} href={t.project_id ? `/ops/${t.project_id}?task=${t.deliverable_id}` : `/ops?task=${t.deliverable_id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ border: '1px solid var(--rule)', borderRadius: 10, padding: '10px 14px', background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                        {t.needs_review && <DraftSwipe taskId={t.deliverable_id} canDecide={!!t.can_decide} onApproved={() => router.refresh()} onDeclined={() => router.refresh()} />}
                        {t.title}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{t.project_title ?? 'On the board'} ↗</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                      {t.assignee ?? (t.person_name ? `${t.person_name} (not on MyCoNet yet)` : 'No one assigned')}
                      {t.due_date && ` · ${fmtTaskWhen(t.due_date, t.due_time)}`}
                      {t.item_text && t.item_text !== t.title && <span style={{ color: 'var(--ink-4)' }}> · “{t.item_text.slice(0, 120)}”</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {Object.keys(byPerson).length > 0 && (
            <>
              <div style={sectionStyle}>Action items (as Fireflies wrote them)</div>
              {Object.entries(byPerson).map(([person, items]) => (
                <div key={person} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{person}</div>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {items.map((t, i) => <li key={i} style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' }}>{t}</li>)}
                  </ul>
                </div>
              ))}
            </>
          )}

          <DocTabs m={m} brainNote={brainNote} />
        </>
      )}
    </div>
  )
}
