'use client'

import { CircleSeal } from '@/core/components/v4/CircleSeal'
import { DraftSwipe } from '@/modules/m07-ops/DraftSwipe'
import { DecisionList } from '@/modules/m07-ops/DecisionList'
import type { DecisionRow } from '@/modules/m07-ops/lib/decisions'
import type { TaskPerson, TaskProjectOption, TaskTeamOption } from '@/modules/m07-ops/TaskModal'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCircles } from '@/core/components/CirclesProvider'
import { fmtTaskWhen, taskDate } from '@/core/lib/tasks'
import NotesText from './NotesText'
import SummaryCards from './SummaryCards'
import type { Meeting } from './types'
import { DESIGN, DESIGN_REVIEW } from '@/core/lib/instance'
import { Button, Icon, Tag, InlineIcon, Result } from '@/core/components/v4'
import './meetings-v4.css'
import { withoutDate } from './lib/title'

const V4 = DESIGN === 'v4'

const sectionStyle: React.CSSProperties = DESIGN === 'v4' ? { fontSize: 17, fontWeight: 600, color: 'var(--ink)', margin: '26px 0 10px' } : {
  fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
  color: 'color-mix(in srgb, var(--ink) 55%, transparent)', margin: '28px 0 12px',
}
const btn = (primary = false): React.CSSProperties => ({
  fontSize: 13, fontWeight: 600, borderRadius: 8, padding: '7px 13px', cursor: 'pointer', whiteSpace: 'nowrap',
  color: primary ? '#fff' : 'var(--ink-2)', background: primary ? 'var(--m18)' : 'var(--surface)',
  border: primary ? 'none' : '1px solid var(--rule)',
})
// A date-only meeting_date is a local day: "2026-11-18" read as UTC showed Nov 17 west of Greenwich
const fmtDay = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? taskDate(iso) : new Date(iso)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const ago = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** The leads' bar: circle, Circle only, run the pipeline, confirm drafts, email again */
function LeadBar({ m, drafts, onBoard = 0, emailOn, secondBrainOn, teams = null }: { m: Meeting; drafts: number; onBoard?: number; emailOn: boolean; secondBrainOn: boolean; teams?: TaskTeamOption[] | null }) {
  const circles = useCircles()
  const router = useRouter()
  const [circle, setCircle] = useState(m.circle ?? '')
  const [circleOnly, setCircleOnly] = useState(m.visibility === 'circle')
  // Its subcircle (v4.108.0): one of the chosen circle's, or the whole circle
  const [team, setTeam] = useState(m.team_id ?? '')
  const circleTeams = (teams ?? []).filter(t => t.circle === circle)
  const pickCircle = (c: string) => { setCircle(c); if (team && !(teams ?? []).some(t => t.id === team && t.circle === c)) setTeam('') }
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

  const teamChanged = !!teams && (team || null) !== (m.team_id ?? null)
  const saveSettings = (process: boolean) =>
    act('settings', { circle: circle || null, ...(teamChanged ? { team_id: team || null } : {}), visibility: circle && circleOnly ? 'circle' : 'community', process }, process ? 'settings+process' : 'settings')
  const changed = (circle || null) !== m.circle || (circleOnly ? 'circle' : 'community') !== m.visibility || teamChanged

  if (V4) {
    // v4: the leads' review as numbered steps. The first step not done yet gets the one green next button.
    const assistant = !ready ? 'Waiting for the notes from Fireflies.'
      : running ? 'The assistant is reading this meeting…'
      : m.processed_at
        ? `Read ${ago(m.processed_at)}. ${m.circle_source === 'agent' ? (m.circle ? 'It chose the circle' : 'It found this meeting community-wide') : m.circle ? 'A person set the circle' : 'No circle'}${m.agent_note ? `: ${m.agent_note}` : '.'}`
        : m.needs_review && m.agent_note
          ? `It didn’t put anything on the board: ${m.agent_note} If this is a community meeting, choose its circle and save.`
          : 'Not read yet: the assistant reads each new meeting within a few minutes.'
    const circleDone = !!m.circle || !!m.processed_at
    const tasksDone = !!m.processed_at && drafts === 0
    const emailDone = !!m.notes_emailed_at
    const next = !ready ? 0 : changed || !circleDone ? 1 : !tasksDone ? 2 : emailOn && !emailDone ? 3 : 0
    const step = (n: number, title: string, done: boolean, body: React.ReactNode, status?: React.ReactNode) => (
      <li className={`mt4-step${done ? ' mt4-step--done' : ''}${next === n ? ' mt4-step--now' : ''}`}>
        <span className="mt4-step__n" aria-hidden>{done ? <Icon name="check" size={14} /> : n}</span>
        <div className="mt4-step__body">
          <b>{title}</b>
          {status && <small>{status}</small>}
          {body}
        </div>
      </li>
    )
    const tasksStatus = m.processed_at
      ? `${onBoard} on the board${drafts ? ` · ${drafts} ${DESIGN_REVIEW ? `draft${drafts === 1 ? '' : 's'} to confirm` : 'to confirm'}` : ''}`
      : m.needs_review ? 'Nothing on the board yet' : 'The assistant hasn’t read it yet'
    return (
      <section className="v4-card mt4-lead" aria-label="For leads">
        <div className="mt4-lead__eyebrow">For leads</div>
        <h2 className="mt4-h">Review this meeting</h2>
        <div className="mt4-said"><Icon name="spark" size={15} /><span>{assistant}</span></div>
        {m.processing_error && <p className="mt4-warn">Last run: {m.processing_error}</p>}
        <ol className="mt4-steps">
          {step(1, 'Circle', circleDone && !changed, (
            <>
              <div className="mt4-step__row">
                <select className="v4-select" value={circle} onChange={e => pickCircle(e.target.value)} aria-label="Circle">
                  <option value="">No circle yet</option>
                  {circles.slugs.map(c => <option key={c} value={c}>{DESIGN_REVIEW ? cap(circles.meta(c).label) : circles.meta(c).label}</option>)}
                </select>
                {teams && circleTeams.length > 0 && (
                  <select className="v4-select" value={team} onChange={e => setTeam(e.target.value)} aria-label="Subcircle">
                    <option value="">The whole circle</option>
                    {circleTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
                <label className="v4-check mt4-only">
                  <input type="checkbox" checked={circleOnly && !!circle} disabled={!circle} onChange={e => setCircleOnly(e.target.checked)} />
                  <span><b>Circle only</b> · only this circle’s members can read it</span>
                </label>
              </div>
              {changed && (
                <Button variant={next === 1 ? 'next' : 'primary'} size="sm" disabled={!!busy} onClick={() => saveSettings(!m.processed_at && ready)}>
                  {busy?.startsWith('settings') ? 'Saving…' : !m.processed_at && ready ? 'Save and put tasks on the board' : 'Save'}
                </Button>
              )}
            </>
          ), m.circle ? (m.circle_source === 'agent' ? 'Chosen by the assistant. Tasks already on the board stay where they are if you change it.' : 'Set by a person.') : m.processed_at ? 'Community-wide' : undefined)}
          {step(2, 'Tasks on the board', tasksDone, (
            <div className="mt4-step__row">
              {drafts > 0 && (
                <Button variant={next === 2 ? 'next' : 'primary'} size="sm" disabled={!!busy} onClick={() => act('confirm')}>
                  {busy === 'confirm' ? 'Confirming…' : `Confirm all ${drafts} draft${drafts === 1 ? '' : 's'}`}
                </Button>
              )}
              {ready && !changed && (
                <Button variant={next === 2 && drafts === 0 ? 'next' : 'secondary'} size="sm" disabled={!!busy || running} onClick={() => act('process')}
                  title="The assistant reads the meeting again: adds tasks that aren’t on the board yet and rewrites the second-brain note">
                  {busy === 'process' || running ? 'Working…' : m.processed_at ? 'Look for new tasks again' : m.circle ? 'Put tasks on the board' : 'Let the assistant read it'}
                </Button>
              )}
            </div>
          ), <>{tasksStatus}{drafts > 0 ? '. Or swipe each draft in the list.' : ''}</>)}
          {step(3, 'Email the notes', emailDone, emailOn ? (
            ready && m.processed_at ? (
              <div className="mt4-step__row">
                <Button variant={next === 3 ? 'next' : 'secondary'} size="sm" disabled={!!busy} onClick={() => act('email')} icon="mail">
                  {busy === 'email' ? 'Sending…' : emailDone ? 'Email the notes again' : 'Email the notes'}
                </Button>
              </div>
            ) : null
          ) : null, !emailOn ? 'Off: no SMTP password set.' : emailDone ? `Emailed ${m.notes_email_count ?? 0} on ${ago(m.notes_emailed_at!)}.` : m.processed_at ? 'To the leads of this meeting’s circle.' : 'After the tasks are on the board.')}
          {step(4, 'Second brain', !!m.notes_url, m.notes_path ? (
            m.notes_url
              ? <a className="mt4-path" href={m.notes_url} target="_blank" rel="noreferrer"><Icon name="brain" size={14} /><code>{m.notes_path}</code></a>
              : <span className="mt4-path"><Icon name="brain" size={14} /><code>{m.notes_path}</code></span>
          ) : null, !secondBrainOn ? 'Saving to the second brain is off.' : m.notes_path ? `Saved${m.visibility === 'circle' ? ' (Circle only)' : ' (members can read)'}. The transcript sits beside it, for leads only.` : 'Saved when the assistant reads the meeting.')}
        </ol>
        {msg && <p className="mt4-msg" role="status">{msg}</p>}
      </section>
    )
  }

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
          <InlineIcon name="lock" />Circle only
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
          <button onClick={() => act('process')} disabled={!!busy || running} style={btn()} title="The assistant reads the meeting again: adds tasks that aren’t on the board yet and rewrites the second-brain note">
            {busy === 'process' || running ? 'Working…' : m.processed_at ? 'Look for new tasks again' : m.circle ? 'Put tasks on the board' : 'Let the assistant read it'}
          </button>
        )}
        {emailOn && ready && m.processed_at && (
          <button onClick={() => act('email')} disabled={!!busy} style={btn()}>{busy === 'email' ? 'Sending…' : m.notes_emailed_at ? 'Email the notes again' : 'Email the notes'}</button>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6 }}>
        {!ready ? 'Waiting for the notes from Fireflies.'
          : running ? 'The assistant is reading this meeting…'
          : m.processed_at
            ? <>Agent ran {ago(m.processed_at)}. {m.circle_source === 'agent' ? (m.circle ? 'It chose the circle' : 'It found this meeting community-wide') : m.circle ? 'The circle was set by a person' : ''}{m.agent_note ? `: ${m.agent_note}` : '.'} Change the circle above if it’s wrong (tasks already on the board stay where they are).</>
          : m.needs_review && m.agent_note
            ? <>The assistant didn’t put anything on the board: {m.agent_note} If this is a community meeting, choose its circle and save.</>
            : 'The assistant hasn’t read this meeting yet: it reads each new meeting within a few minutes.'}
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
    body: <>{f.bullet_gist && <NotesText text={f.bullet_gist} />}{f.bullet_gist && f.shorthand_bullet && <hr style={DESIGN_REVIEW ? { border: 0, margin: '10px 0' } : { border: 0, borderTop: '1px solid var(--rule)', margin: '14px 0' }} />}{f.shorthand_bullet && <NotesText text={f.shorthand_bullet} />}</>,
  })
  if (f.topics?.length || f.keywords?.length) tabs.push({
    key: 'topics', label: 'Topics & keywords',
    body: <>{[['Topics discussed', f.topics], ['Keywords', f.keywords]].filter(([, v]) => (v as string[] | undefined)?.length).map(([label, v]) => (
      <div key={label as string} style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>{label as string}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{(v as string[]).map(x => DESIGN_REVIEW ? <span key={x} className="v4-tag">{x}</span> : <span key={x} style={chip}>{x}</span>)}</div>
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
  // Design review (#13, #31, #37): a section heading like the others, tabs with the one soft fill (chosen = black),
  // the open document a white card on the page, and topics as tags
  if (DESIGN_REVIEW) return (
    <div className="mt4-o-docs">
      <div className="v4-sec"><h2>Meeting documents</h2></div>
      <div role="tablist" className="mt4-doctabs">
        {tabs.map(t => (
          <button key={t.key} type="button" role="tab" aria-selected={open === t.key} className={`v4-chip${open === t.key ? ' v4-chip--on' : ''}`}
            onClick={() => setOpen(o => (o === t.key ? null : t.key))}>{t.label}</button>
        ))}
      </div>
      {current && <div role="tabpanel" className="v4-card mt4-doc">{current.body}</div>}
    </div>
  )
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

export default function MeetingDetail({ meeting: m, tasks: loaded, taskOptions = null, decider, teams = null, canManage, emailOn, secondBrainOn, brainNote }: {
  meeting: Meeting; tasks: DecisionRow[]; canManage: boolean; emailOn: boolean; secondBrainOn: boolean; brainNote: string | null
  /** For changing an action item right here (v4.105.0); null when the viewer may change none */
  taskOptions?: { people: TaskPerson[]; projectOptions: TaskProjectOption[]; teams: TaskTeamOption[] } | null
  /** Who decides the project manager's suggestions here (v4.114.0): admins and the circle's leads, as on the board */
  decider?: { role: string; leadCircles: string[] }
  /** The circles' subcircles, for the leads' Subcircle picker (v4.108.0); null when the community hasn't the column */
  teams?: TaskTeamOption[] | null
}) {
  const router = useRouter()
  const circles = useCircles()
  const meta = m.circle && circles.has(m.circle) ? circles.meta(m.circle) : null
  const tasks = loaded
  const drafts = tasks.filter(t => t.needs_review).length
  // The drafts this person can confirm (decision #45: leads for their circles, admins for all)
  const myDrafts = tasks.filter(t => t.needs_review && t.can_decide).length
  const canDecide = (c: string) => decider?.role === 'admin' || (decider?.role === 'circle_lead' && decider.leadCircles.includes(c))

  const byPerson: Record<string, string[]> = {}
  for (const item of m.action_items ?? []) (byPerson[item.speaker || 'Action items'] ??= []).push(item.text)

  if (V4) {
    const notice = !canManage && m.needs_review ? (
      <div className={`v4-card v4-note${DESIGN_REVIEW ? ' mt4-wait' : ''}`}><Icon name="clock" /><span>The assistant wasn’t sure this is a community meeting, so a lead is checking it before anything goes on the board.</span></div>
    ) : null
    return (
      <div className="v4-page v4-page--wide mt4">
        {/* Design review (#41): the top bar has ‹ Meetings; the circle's meetings are one tap on its tag */}
        {!DESIGN_REVIEW && (
          <div className="mt4-back">
            <Link href="/meetings" className="v4-back"><Icon name="left" size={14} />Meetings</Link>
            {meta && <Link href={`/meetings?circle=${m.circle}`} className="v4-back">{meta.label} meetings</Link>}
          </div>
        )}
        <header className="v4-ph">
          <div className="v4-tags mt4-tags">
            {meta && DESIGN_REVIEW ? (
              <Link href={`/meetings?circle=${m.circle}`} className="mt4-ctag mt4-ctag--seal mt4-ctag--link no-min-height" title={`All ${cap(meta.label)} meetings`}>
                <CircleSeal slug={m.circle} size={16} />{cap(meta.label)}{m.circle_source === 'agent' ? <span className="mt4-by"> · chosen by the assistant</span> : null}
              </Link>
            ) : meta ? <span className={`mt4-ctag${DESIGN_REVIEW ? ' mt4-ctag--seal' : ''}`} style={{ ['--c' as string]: meta.color }}>{DESIGN_REVIEW ? <CircleSeal slug={m.circle} size={16} /> : <i className="mt4-dot" aria-hidden />}{meta.label.charAt(0).toUpperCase() + meta.label.slice(1)}{m.circle_source === 'agent' ? <span className="mt4-by"> · chosen by the assistant</span> : null}</span>
              : m.processed_at ? <Tag>Community-wide</Tag> : null}
            <Tag icon="calendar">{fmtDay(m.meeting_date ?? m.created_at)}</Tag>
            {m.attendees.length > 0 && <span className="v4-tag" title={m.attendees.join(', ')}><Icon name="users" size={13} />{m.attendees.length} {m.attendees.length === 1 ? 'person' : 'people'}</span>}
            {m.visibility === 'circle' && <Tag icon="lock">Circle only</Tag>}
            {DESIGN_REVIEW && myDrafts > 0 && (
              // Waiting on you (#34, #45): yellow, and one tap to the drafts
              <a href="#mt4-tasks" className="v4-result v4-result--attention mt4-draftlink no-min-height"><Icon name="alert" size={12} />{myDrafts} draft{myDrafts === 1 ? '' : 's'} to confirm</a>
            )}
          </div>
          <h1 className="v4-ph__title">{withoutDate(m.title)}</h1>
          {m.original_title && withoutDate(m.original_title) !== withoutDate(m.title) && <p className="v4-ph__sub">Recorded as “{m.original_title}”</p>}
          {m.attendees.length > 0 && <p className="v4-hint mt4-people">{m.attendees.join(', ')}</p>}
        </header>

        {m.status === 'processing' && <div className="v4-card v4-note"><Icon name="clock" /><span>Transcribing this recording. Check back in a few minutes.</span></div>}
        {m.status === 'error' && <div className="v4-card v4-note"><Icon name="alert" /><span>This recording couldn’t be transcribed.{m.error ? ` (${m.error})` : ''}</span></div>}

        <div className="mt4-split">
          <div className="mt4-main">
            {notice}
            {m.status === 'done' && (
              <>
                {m.summary && <div className="v4-card mt4-sumcard"><h2 className="mt4-h">Summary</h2><SummaryCards text={m.summary} accent={DESIGN_REVIEW ? undefined : meta?.color} /></div>}

                <div className="mt4-o-tasks">
                {DESIGN_REVIEW ? (
                  // Design review (#45, LEXICON): these are tasks; the ones waiting are drafts, counted for those who confirm them
                  <div className="v4-sec" id="mt4-tasks"><h2>Tasks</h2>{myDrafts > 0 ? <Result tone="attention">{myDrafts} draft{myDrafts === 1 ? '' : 's'} to confirm</Result> : tasks.length > 0 ? <span className="v4-hint">On the board</span> : null}</div>
                ) : (
                  <div className="v4-sec"><h2>Action items{drafts ? ` · ${drafts} to confirm` : ''}</h2><span className="v4-hint">They become tasks on the board</span></div>
                )}
                {tasks.length === 0 ? (
                  <p className="v4-hint">{m.processed_at ? 'No tasks came out of this meeting.' : m.needs_review ? 'Nothing on the board: this meeting is waiting for a lead.' : 'The assistant hasn’t read this meeting yet.'}</p>
                ) : (
                  <DecisionList rows={tasks} options={taskOptions} canDecide={canDecide} />
                )}
                </div>

                {Object.keys(byPerson).length > 0 && (
                  <details className="v4-card mt4-ff mt4-o-ff">
                    <summary>Action items as Fireflies wrote them</summary>
                    {Object.entries(byPerson).map(([person, items]) => (
                      <div key={person} className="mt4-ffp">
                        <b>{person}</b>
                        <ul>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
                      </div>
                    ))}
                  </details>
                )}

                <DocTabs m={m} brainNote={brainNote} />
              </>
            )}
          </div>

          <div className="mt4-side">
            {/* Design review (#45): the drafts this person can confirm, so a lead of another circle gets no Confirm all */}
            {canManage && <LeadBar m={m} drafts={DESIGN_REVIEW ? myDrafts : drafts} onBoard={tasks.length} emailOn={emailOn} secondBrainOn={secondBrainOn} teams={teams} />}
            <div className="mt4-o-files">
            <div className="v4-sec"><h2>Files</h2></div>
            <div className="v4-list">
              <div className="v4-row"><span className="v4-row__lead"><span className="v4-tile v4-tile--grey"><Icon name="file" /></span></span><span className="v4-row__main"><b>Meeting notes</b><small>{m.visibility === 'circle' ? 'This circle can read' : 'Members can read'}</small></span></div>
              <div className={`v4-row${m.transcript ? '' : ' mt4-off'}`}><span className="v4-row__lead"><span className="v4-tile v4-tile--grey"><Icon name={m.transcript ? 'mic' : 'lock'} /></span></span><span className="v4-row__main"><b>Transcript</b><small>{m.transcript ? 'You can read it (in the documents)' : 'Only circle leads and admins'}</small></span></div>
            </div>
            </div>
            {m.notes_url && !canManage && (
              <a href={m.notes_url} target="_blank" rel="noreferrer" className="mt4-brain"><Icon name="brain" size={15} /><span>Saved in the second brain</span><Icon name="right" size={14} /></a>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 80px' }}>
      <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
        <Link href="/meetings" style={{ color: 'var(--m18)', textDecoration: 'none' }}>← Meetings</Link>
        {meta && <Link href={`/meetings?circle=${m.circle}`} style={{ color: meta.color, textDecoration: 'none' }}>{meta.emoji} {meta.label} meetings</Link>}
      </div>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 27, color: 'var(--ink)', lineHeight: 1.15, margin: '16px 0 8px' }}>{withoutDate(m.title)}</h1>
      {m.original_title && withoutDate(m.original_title) !== withoutDate(m.title) && (
        <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 6 }}>Recorded as “{m.original_title}”</div>
      )}
      <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
        {fmtDay(m.meeting_date ?? m.created_at)}
        {meta ? <> · <span style={{ color: meta.color, fontWeight: 600 }}>{meta.emoji} {meta.label}</span>{m.circle_source === 'agent' && <span title={m.agent_note ?? ''}> (chosen by the assistant)</span>}</>
          : m.processed_at ? ' · Community-wide' : ''}
        {m.visibility === 'circle' && <> · <InlineIcon name="lock" />Circle only</>}
        {m.attendees.length > 0 && ` · ${m.attendees.join(', ')}`}
      </div>
      {m.notes_url && <div style={{ fontSize: 12.5, marginTop: 6 }}><a href={m.notes_url} target="_blank" rel="noreferrer" style={{ color: 'var(--m18)' }}>Notes in the second brain ↗</a></div>}

      {canManage && <LeadBar m={m} drafts={drafts} emailOn={emailOn} secondBrainOn={secondBrainOn} />}
      {!canManage && m.needs_review && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'color-mix(in srgb, var(--m18) 10%, var(--surface))', color: 'var(--m18)', fontSize: 13.5 }}>
          The assistant wasn’t sure this is a community meeting, so a lead is checking it before anything goes on the board.
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
              {m.processed_at ? 'No tasks came out of this meeting.' : m.needs_review ? 'Nothing on the board: this meeting is waiting for a lead.' : 'The assistant hasn’t read this meeting yet.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasks.map(t => (
                <Link key={t.deliverable_id} href={t.project_id ? `/operations/${t.project_id}?task=${t.deliverable_id}` : `/operations?task=${t.deliverable_id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ border: '1px solid var(--rule)', borderRadius: 10, padding: '10px 14px', background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                        {t.needs_review && <DraftSwipe taskId={t.deliverable_id} canDecide={!!t.can_decide} onApproved={() => router.refresh()} onDeclined={() => router.refresh()} />}
                        {t.title}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{t.project_title ? `Subtask of “${t.project_title}”` : 'On the board'} ↗</span>
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
