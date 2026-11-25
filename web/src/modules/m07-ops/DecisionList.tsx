'use client'

import { DESIGN_REVIEW } from '@/core/lib/instance'
import { useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCircles } from '@/core/components/CirclesProvider'
import { createClient } from '@/core/lib/supabase/client'
import { fmtTaskWhen } from '@/core/lib/tasks'
import { Icon, InlineIcon, StatusPill } from '@/core/components/v4'
import { DraftSwipe } from './DraftSwipe'
import { TaskQuickEdit } from './TaskQuickEdit'
import { ModalShell } from '@/core/components/ModalShell'
import { DONE, KIND, explain } from './suggestion-text'
import { TaskModal, type TaskPerson, type TaskProjectOption, type TaskTeamOption } from './TaskModal'
import type { AgentSuggestion, Deliverable, PmAction } from './types'
import type { DecisionRow } from './lib/decisions'
import { EDITABLE_SELECT } from './lib/task-edit'
import '@/modules/m18-meetings/meetings-v4.css'

/** What the task's window needs, as the board loads it (app/operations/page.tsx) */
const TASK_SELECT = 'id, project_id, title, assignee_id, assignee_name, team_id, created_by, priority, due_date, due_time, circle, needs_review, status, progress, notes, source, source_meeting_id, source_item, user_profiles(username, first_name)'

export type DecisionOptions = { people: TaskPerson[]; projectOptions: TaskProjectOption[]; teams: TaskTeamOption[] }

const onHash = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb) }
const atPm = () => window.location.hash === '#pm'

/**
 * Everything to decide, as one list in the action items' style (v4.114.0: Oscar, "all the things that need to be
 * decided should show up on one list"). Each row is a task:
 *   - its fields, changed right there, and "✦ What should the assistant do?" (TaskQuickEdit)
 *   - the Draft pill: slide right to approve, left to decline; it then reads Approved / Declined
 *   - Later: set aside on the Ideas for later list
 *   - the project manager's suggestions about it, with Accept / Dismiss
 * A row with a suggestion but no draft has no pill. Rows stay, with what was decided, until the page is reloaded.
 * The board shows it grouped by meeting (`grouped`); a meeting's page shows its own action items.
 */
export function DecisionList({ rows: loaded, options, canDecide, grouped = false, onPill }: {
  rows: DecisionRow[]
  options: DecisionOptions | null
  canDecide: (circle: string) => boolean
  grouped?: boolean
  // Told when a pill is approved / declined / undone, so the panel's counts follow
  onPill?: (id: string, d: { kind: 'approved' } | { kind: 'declined'; log: string | null } | null) => void
}) {
  const circles = useCircles()
  const [patch, setPatch] = useState<Record<string, Partial<DecisionRow>>>({})
  // A task re-read from the database (after a suggestion was accepted) remounts its fields
  const [version, setVersion] = useState<Record<string, number>>({})
  const [editing, setEditing] = useState<Set<string>>(() => new Set(loaded.filter(t => t.needs_review && t.can_edit).map(t => t.deliverable_id)))
  const [decided, setDecided] = useState<Record<string, 'accepted' | 'dismissed'>>({})
  const [where, setWhere] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ id: string; text: string } | null>(null)
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set())
  // Swiped here (v4.130.0): the pill stays, reading Approved / Declined with Undo, until the page is reloaded
  // Swiped here (v4.130.0; kept across collapsing a group since v4.130.2): what each pill decided, so it reads
  // Approved / Declined with Undo until the page is reloaded
  const [decidedPills, setDecidedPills] = useState<Record<string, { kind: 'approved' } | { kind: 'declined'; log: string | null }>>({})
  const rememberPill = (id: string, d: { kind: 'approved' } | { kind: 'declined'; log: string | null } | null) => {
    setDecidedPills(prev => { const n = { ...prev }; if (d) n[id] = d; else delete n[id]; return n })
    onPill?.(id, d)
  }
  // Subcircles made from a row's Subcircle picker (v4.127.0): every row offers them straight away
  const [madeTeams, setMadeTeams] = useState<DecisionOptions['teams']>([])
  const opts = options ? { ...options, teams: [...options.teams, ...madeTeams] } : null

  // The task's window over this screen (Oscar: "when I click on a task in the drafts to confirm section, id like the pop
  // up to happen with the existing screen in the background"), instead of going to its page. Cmd/Ctrl-click still does.
  const [openTask, setOpenTask] = useState<{ task: Deliverable; userId: string | null; canManage: boolean } | null>(null)
  const [opening, setOpening] = useState<string | null>(null)
  const [removed, setRemoved] = useState<Set<string>>(() => new Set())
  const rows = loaded.filter(t => !removed.has(t.deliverable_id)).map(t => ({ ...t, ...patch[t.deliverable_id] }))
  const set = (id: string, p: Partial<DecisionRow>) => setPatch(prev => ({ ...prev, [id]: { ...prev[id], ...p } }))
  const titleOf = (id?: string) => rows.find(r => r.deliverable_id === id)?.title
  const projectTitle = (id?: string) => options?.projectOptions.find(p => p.id === id)?.title
  const toggle = (setter: typeof setEditing, id: string) => setter(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })

  async function reread(ids: string[]) {
    const { data } = await createClient().from('deliverables').select(`id, ${EDITABLE_SELECT}`).in('id', ids)
    for (const d of (data ?? []) as unknown as (Partial<DecisionRow> & { id: string })[]) {
      const { id, ...rest } = d
      set(id, { ...rest, project_title: rest.project_id ? projectTitle(rest.project_id) ?? null : null, assignee: rest.assignee_id ? options?.people.find(p => p.id === rest.assignee_id)?.name.split(' ')[0] ?? null : null })
    }
    setVersion(prev => ({ ...prev, ...Object.fromEntries(ids.map(id => [id, (prev[id] ?? 0) + 1])) }))
  }

  const overrides = (v: string | undefined) => {
    if (!v) return {}
    if (v.startsWith('c:')) return { circle: v.slice(2) }
    if (v.startsWith('t:')) { const t = options?.teams.find(x => x.id === v.slice(2)); return t ? { circle: t.circle, team_id: t.id } : {} }
    if (v.startsWith('p:')) return { project_id: v.slice(2) }
    return {}
  }
  async function decide(s: AgentSuggestion, action: 'accept' | 'dismiss') {
    setBusy(s.id); setMsg(null)
    const res = await fetch(`/api/ops/suggestions/${s.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...(action === 'accept' ? overrides(where[s.id]) : {}) }) })
    const data = await res.json().catch(() => ({})) as { error?: string }
    setBusy(null)
    if (!res.ok) { setMsg({ id: s.id, text: data.error ?? 'That didn’t work.' }); return }
    setDecided(prev => ({ ...prev, [s.id]: action === 'accept' ? 'accepted' : 'dismissed' }))
    if (action === 'accept') {
      const p = s.payload as { keep?: string; drop?: string; task?: string; tasks?: string[] }
      if (p.drop) set(p.drop, { status: 'merged' })
      await reread([p.keep, p.task, ...(p.tasks ?? [])].filter((x): x is string => !!x))
    }
  }
  // Later is a status (v4.123.0): the task goes to the board's Later column; Undo puts back the status it had
  const [before, setBefore] = useState<Record<string, { status: string; needs_review: boolean }>>({})
  async function later(t: DecisionRow, on: boolean) {
    setBusy(t.deliverable_id); setMsg(null)
    const back = before[t.deliverable_id] ?? { status: 'pending', needs_review: false }
    const change = on ? { status: 'later', needs_review: false } : back
    const { data, error } = await createClient().from('deliverables').update(change).eq('id', t.deliverable_id).select('id')
    setBusy(null)
    if (error || !data?.length) { setMsg({ id: t.deliverable_id, text: error?.message ?? 'The database didn’t allow this change for your account.' }); return }
    if (on) setBefore(prev => ({ ...prev, [t.deliverable_id]: { status: t.status, needs_review: t.needs_review } }))
    set(t.deliverable_id, change)
    setVersion(prev => ({ ...prev, [t.deliverable_id]: (prev[t.deliverable_id] ?? 0) + 1 }))
  }

  async function openHere(e: React.MouseEvent, t: DecisionRow) {
    if (!options || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    if (opening) return
    setOpening(t.deliverable_id); setMsg(null)
    const supabase = createClient()
    const [{ data }, { data: { user } }] = await Promise.all([
      supabase.from('deliverables').select(TASK_SELECT).eq('id', t.deliverable_id).maybeSingle(),
      supabase.auth.getUser(),
    ])
    setOpening(null)
    if (!data) { setMsg({ id: t.deliverable_id, text: 'That task couldn’t be opened. It may have been removed.' }); return }
    setOpenTask({ task: data as unknown as Deliverable, userId: user?.id ?? null, canManage: !!t.can_edit })
  }
  function savedInWindow(d: Deliverable) {
    const was = rows.find(r => r.deliverable_id === d.id)
    set(d.id, {
      title: d.title, status: d.status, circle: d.circle ?? null, team_id: d.team_id ?? null, project_id: d.project_id,
      assignee_id: d.assignee_id, assignee_name: d.assignee_name ?? null, priority: d.priority ?? null, due_date: d.due_date,
      due_time: d.due_time ?? null, notes: d.notes ?? null, needs_review: !!d.needs_review,
      assignee: d.assignee_id ? options?.people.find(p => p.id === d.assignee_id)?.name.split(' ')[0] ?? null : null,
      project_title: d.project_id ? projectTitle(d.project_id) ?? null : null,
    })
    setVersion(prev => ({ ...prev, [d.id]: (prev[d.id] ?? 0) + 1 }))
    // Saving a draft in the window confirms it: the row reads Approved, as if its pill was slid right
    if (was?.needs_review && !d.needs_review) rememberPill(d.id, { kind: 'approved' })
    setOpenTask(null)
  }
  function deletedInWindow(id: string) {
    // Gone from the list, and out of the counts like a declined draft
    if (rows.find(r => r.deliverable_id === id)?.needs_review) rememberPill(id, { kind: 'declined', log: null })
    setRemoved(prev => new Set(prev).add(id))
    setOpenTask(null)
  }
  const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null)
  // Why it's suggested, in a small pop-up over the page (Oscar: "see a simple pop up that shows why this is being
  // suggested with out taking me to another page"): what was said and by whom, the meeting, what it was about, and the
  // project manager's reasons. The meeting's summary is read when the pop-up opens.
  const [why, setWhy] = useState<{ id: string; summary: string | null; loading: boolean } | null>(null)
  async function openWhy(t: DecisionRow) {
    setWhy({ id: t.deliverable_id, summary: null, loading: !!t.meeting?.title })
    if (!t.meeting?.title) return
    const { data } = await createClient().from('meeting_transcripts').select('summary').eq('id', t.meeting.id).maybeSingle()
    setWhy(prev => (prev?.id === t.deliverable_id ? { ...prev, summary: (data?.summary as string | null) ?? null, loading: false } : prev))
  }
  const whyRow = why ? rows.find(r => r.deliverable_id === why.id) : null
  const whyLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }
  const whyWindow = why && whyRow && typeof document !== 'undefined' ? createPortal(
    <ModalShell title="Why this draft" onClose={() => setWhy(null)} maxWidth={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>
        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{whyRow.title}</div>
        {whyRow.item_text && (
          <div>
            <div style={whyLabel}>What was said</div>
            “{whyRow.item_text}”{whyRow.said_by && <span style={{ color: 'var(--ink-3)' }}> · {whyRow.said_by}</span>}
          </div>
        )}
        {whyRow.meeting && (
          <div>
            <div style={whyLabel}>Where</div>
            {whyRow.meeting.title ?? <em>A meeting you can’t open</em>}
            {whyRow.meeting.date && <span suppressHydrationWarning style={{ color: 'var(--ink-3)' }}> · {day(whyRow.meeting.date)}</span>}
          </div>
        )}
        {whyRow.meeting?.title && (
          <div>
            <div style={whyLabel}>What the meeting was about</div>
            {why.loading ? <span style={{ color: 'var(--ink-4)' }}>Loading…</span>
              : why.summary ? <div style={{ whiteSpace: 'pre-line', maxHeight: 220, overflowY: 'auto' }}>{why.summary.length > 900 ? `${why.summary.slice(0, 900).trimEnd()}…` : why.summary}</div>
              : <span style={{ color: 'var(--ink-4)' }}>No summary for this meeting yet.</span>}
          </div>
        )}
        {whyRow.suggestions.some(x => x.reason) && (
          <div>
            <div style={whyLabel}>The project manager’s reasons</div>
            {whyRow.suggestions.filter(x => x.reason).map(x => <div key={x.id}>{x.reason}</div>)}
          </div>
        )}
        {!whyRow.item_text && !whyRow.meeting && !whyRow.suggestions.some(x => x.reason) && (
          <div style={{ color: 'var(--ink-3)' }}>This draft wasn’t made from a meeting, so there’s no line or meeting behind it.</div>
        )}
        {whyRow.meeting?.title && (
          <Link href={`/meetings/${whyRow.meeting.id}`} className="dl4-basis__link" style={{ fontSize: 12.5 }}>Open the meeting’s notes →</Link>
        )}
      </div>
    </ModalShell>,
    document.body,
  ) : null

  const taskWindow = openTask && options && typeof document !== 'undefined' ? createPortal(
    <TaskModal task={openTask.task} canManage={openTask.canManage} userId={openTask.userId}
      people={options.people} projects={options.projectOptions} teams={opts!.teams}
      onClose={() => setOpenTask(null)} onSaved={savedInWindow} onDeleted={deletedInWindow} />,
    document.body,
  ) : null

  // What the suggestion is based on (v4.128.0: Oscar, "see why it's suggesting this, and click a link to meeting notes
  // explaining why"): each of its tasks, the meeting it came from (a link to its notes), the line that was said and who
  // said it; or who added it by hand
  const basedOn = (s: AgentSuggestion) => {
    const list = s.sources ?? []
    if (!list.length) return null
    return (
      <div className="dl4-basis">
        <div className="dl4-basis__title">Based on</div>
        {list.map(x => (
          <div key={x.task_id} className="dl4-basis__row">
            <b>{x.title}</b>
            {x.meeting ? (
              <span className="dl4-basis__src">
                {x.meeting.title
                  ? <Link href={`/meetings/${x.meeting.id}`} className="dl4-basis__link">{x.meeting.title} →</Link>
                  : <em>a meeting you can’t open</em>}
                {x.meeting.date && <span suppressHydrationWarning> · {day(x.meeting.date)}</span>}
              </span>
            ) : (
              <span className="dl4-basis__src">Added by hand{x.added_by ? ` by ${x.added_by}` : ''}{x.added_at ? <span suppressHydrationWarning> on {day(x.added_at)}</span> : null}</span>
            )}
            {x.said && <span className="dl4-basis__said">“{x.said}”{x.said_by && <> · {x.said_by}</>}</span>}
          </div>
        ))}
      </div>
    )
  }

  const suggestion = (s: AgentSuggestion) => {
    const state = decided[s.id]
    const plain = explain(s, titleOf, projectTitle)
    const mayDecide = canDecide(s.circle)
    const v = where[s.id] ?? ''
    return (
      <div key={s.id} className={`dl4-sug${state ? ' dl4-sug--done' : ''}`}>
        <div className="dl4-sug__head"><InlineIcon name="compass" /><b>{KIND[s.kind] ?? 'Suggested'}</b>{state && <span className={`dl4-sug__state dl4-sug__state--${state}`}>{state === 'accepted' ? '✓ Accepted' : 'Dismissed'}</span>}</div>
        <div className="dl4-sug__what">{plain.what}</div>
        {s.reason && <div className="dl4-sug__why"><b>Why:</b> {s.reason}</div>}
        {basedOn(s)}
        {mayDecide && !state && (
          <div className="dl4-sug__acts">
            {(s.kind === 'new_project' || s.kind === 'move') && options && (
              <select className="dl4-select" value={v} onChange={e => setWhere(prev => ({ ...prev, [s.id]: e.target.value }))} aria-label="Put it in">
                <option value="">{s.kind === 'new_project' ? 'Put it in: as suggested' : 'Into: the suggested task'}</option>
                {s.kind === 'new_project' && (
                  <optgroup label="A new task in…">
                    {circles.slugs.map(c => [
                      <option key={c} value={`c:${c}`}>{circles.meta(c).emoji} {circles.meta(c).label}</option>,
                      ...(opts ?? options).teams.filter(t => t.circle === c).map(t => <option key={t.id} value={`t:${t.id}`}>{'    '}{circles.meta(c).label} › {t.name}</option>),
                    ])}
                  </optgroup>
                )}
                <optgroup label={s.kind === 'new_project' ? 'Or add them to a task' : 'Another task'}>
                  {options.projectOptions.map(x => <option key={x.id} value={`p:${x.id}`}>{x.title}</option>)}
                </optgroup>
              </select>
            )}
            <button type="button" className="dl4-btn dl4-btn--primary" disabled={!!busy} onClick={() => decide(s, 'accept')}>{busy === s.id ? '…' : v.startsWith('p:') ? 'Move them in' : plain.button}</button>
            <button type="button" className="dl4-btn" disabled={!!busy} onClick={() => decide(s, 'dismiss')}>Dismiss</button>
          </div>
        )}
        {msg?.id === s.id && <div className="dl4-err">{msg.text}</div>}
      </div>
    )
  }

  const row = (t: DecisionRow) => {
    const who = t.assignee ?? (t.assignee_name ? `${t.assignee_name} (not on MyCoNet yet)` : t.person_name ? `${t.person_name} (not on MyCoNet yet)` : 'Not assigned yet')
    const canEdit = t.can_edit && !!options && t.status !== 'merged'
    const decidable = t.can_edit
    const open = editing.has(t.deliverable_id)
    return (
      <div key={t.deliverable_id} className="mt4-taskwrap">
        <div className="v4-row mt4-task">
          <span className="v4-row__lead"><span className="v4-avatar">{(t.assignee ?? t.person_name ?? '?').slice(0, 1).toUpperCase()}</span></span>
          <Link href={t.project_id ? `/operations/${t.project_id}?task=${t.deliverable_id}` : `/operations?task=${t.deliverable_id}`} className="v4-row__main mt4-tlink" onClick={e => openHere(e, t)} aria-busy={opening === t.deliverable_id}>
            <b className={t.status === 'done' ? 'mt4-done' : undefined}>{t.title}</b>
            <small>{who}{t.due_date ? ` · ${fmtTaskWhen(t.due_date, t.due_time)}` : ''}{t.project_title ? ` · subtask of “${t.project_title}”` : ''}</small>
            {t.item_text && t.item_text !== t.title && <small className="mt4-quote">“{t.item_text.slice(0, 120)}”</small>}
          </Link>
          <span className="v4-row__trail">
            {t.status === 'merged' ? <span className="dl4-tag dl4-tag--grey">Merged</span>
              : t.status === 'later' ? <span className="dl4-tag dl4-tag--idea"><Icon name="clock" size={12} />Later{decidable && <> · <button type="button" className="dl4-link" onClick={() => later(t, false)}>Undo</button></>}</span>
              : t.needs_review || decidedPills[t.deliverable_id] ? <DraftSwipe keepLabel taskId={t.deliverable_id} decided={decidedPills[t.deliverable_id]} canDecide={!!t.can_decide || !!decidedPills[t.deliverable_id]} onApproved={() => { rememberPill(t.deliverable_id, { kind: 'approved' }); set(t.deliverable_id, { needs_review: false }) }} onDeclined={log => rememberPill(t.deliverable_id, { kind: 'declined', log })} onUndone={() => { rememberPill(t.deliverable_id, null); set(t.deliverable_id, { needs_review: true }) }} />
              : t.suggestions.length ? null
              : <StatusPill status={t.status === 'done' ? 'done' : 'todo'} label={t.status === 'done' ? 'Done' : 'On the board'} />}
            {decidable && t.status !== 'later' && t.status !== 'merged' && (
              <button type="button" className="mt4-editbtn" disabled={busy === t.deliverable_id} onClick={() => later(t, true)} title="Move it to the board's Later column"><Icon name="clock" size={13} />Later</button>
            )}
            {canEdit && (
              <button type="button" className="mt4-editbtn" aria-expanded={open} onClick={() => toggle(setEditing, t.deliverable_id)}>
                <Icon name="pencil" size={13} />{open ? 'Done' : 'Edit'}
              </button>
            )}
          </span>
        </div>
        {/* Where it came from (v4.130.0: Oscar didn't see "the source of inspiration" on a draft's row): the meeting, a link
            to its notes, its date, and who said the line */}
        {t.meeting && (
          <div className="mt4-taskedit dl4-source">
            From {t.meeting.title
              ? <Link href={`/meetings/${t.meeting.id}`} className="dl4-basis__link">{t.meeting.title} →</Link>
              : <em>a meeting you can’t open</em>}
            {t.meeting.date && <span suppressHydrationWarning> · {day(t.meeting.date)}</span>}
            {t.said_by && <> · said by <b>{t.said_by}</b></>}
            {' · '}<button type="button" className="dl4-link" onClick={() => openWhy(t)} aria-haspopup="dialog">Why?</button>
          </div>
        )}
        {msg?.id === t.deliverable_id && <div className="mt4-taskedit dl4-err">{msg.text}</div>}
        {canEdit && open && (
          <div className="mt4-taskedit">
            <TaskQuickEdit
              key={version[t.deliverable_id] ?? 0}
              task={{ id: t.deliverable_id, title: t.title, status: t.status, circle: t.circle, team_id: t.team_id, project_id: t.project_id, assignee_id: t.assignee_id, assignee_name: t.assignee_name, priority: t.priority, due_date: t.due_date, due_time: t.due_time, needs_review: t.needs_review, notes: t.notes ?? null }}
              {...opts!}
              onTeamAdded={x => setMadeTeams(prev => [...prev, x])}
              onSaved={x => set(t.deliverable_id, {
                title: x.title,
                status: x.status, circle: x.circle ?? null, team_id: x.team_id ?? null, project_id: x.project_id,
                assignee_id: x.assignee_id, assignee_name: x.assignee_name ?? null, priority: x.priority ?? null, due_date: x.due_date, due_time: x.due_time ?? null, notes: x.notes ?? null, needs_review: false,
                assignee: x.assignee_id ? options!.people.find(p => p.id === x.assignee_id)?.name.split(' ')[0] ?? null : null,
                project_title: x.project_id ? projectTitle(x.project_id) ?? t.project_title : null,
              })}
            />
          </div>
        )}
        {t.suggestions.length > 0 && <div className="mt4-taskedit dl4-sugs">{t.suggestions.map(suggestion)}</div>}
      </div>
    )
  }

  if (!grouped) return <div className="v4-list">{rows.map(row)}{taskWindow}{whyWindow}</div>

  // The board: by meeting, newest first; tasks not from a meeting last. A group's rows are drawn once it's opened.
  const groups = [...rows.reduce((m, t) => {
    const k = t.meeting?.id ?? 'board'
    m.set(k, [...(m.get(k) ?? []), t])
    return m
  }, new Map<string, DecisionRow[]>())].map(([id, list]) => ({ id, meeting: list[0].meeting, list }))
    .sort((a, b) => (a.id === 'board' ? 1 : b.id === 'board' ? -1 : (b.meeting?.date ?? '').localeCompare(a.meeting?.date ?? '')))
  const tag = (c: string | null | undefined) => (c && circles.has(c) ? <span className="dl4-circle" style={{ ['--c' as string]: circles.meta(c).color }}>{circles.meta(c).emoji} {circles.meta(c).label}</span> : null)
  return (
    <div className="pm4-drafts">
      {groups.map(g => {
        const isOpen = openGroups.has(g.id)
        // A declined draft keeps its pill (Declined · Undo) but no longer counts (Oscar)
        const drafts = g.list.filter(t => t.needs_review && decidedPills[t.deliverable_id]?.kind !== 'declined').length
        const sugs = g.list.filter(t => t.suggestions.some(s => !decided[s.id])).length
        return (
          <div key={g.id} className="v4-card pm4-meeting">
            <button type="button" className="pm4-meeting__head" aria-expanded={isOpen} onClick={() => toggle(setOpenGroups, g.id)}>
              <span className="pm4-meeting__name"><b>{g.id === 'board' ? 'On the board' : g.meeting?.title ?? 'A meeting'}</b>
                <small suppressHydrationWarning>{[g.meeting?.date ? new Date(g.meeting.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : null, drafts ? `${drafts} draft${drafts === 1 ? '' : 's'}` : null, sugs ? `${sugs} with a suggestion` : null].filter(Boolean).join(' · ') || 'Nothing left to decide'}</small>
              </span>
              {tag(g.meeting?.circle)}
              <span className="pm4-meeting__chev" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <>
                <div className="v4-list">{g.list.map(row)}</div>
                {g.meeting && <Link href={`/meetings/${g.meeting.id}`} className="pm4-meeting__open">Open the meeting →</Link>}
              </>
            )}
          </div>
        )
      })}
      {taskWindow}{whyWindow}
    </div>
  )
}

/**
 * The board's To decide panel (v4.114.0), replacing the project manager panel: everything to decide, by meeting, and
 * what the assistant changed itself in the last two weeks (Undo). Follows the board's circle filter; starts collapsed
 * unless opened at #pm.
 */
export function ToDecidePanel({ rows, actions, options, canDecide, circle }: {
  rows: DecisionRow[]; actions: PmAction[]; options: DecisionOptions | null
  canDecide: (circle: string) => boolean
  circle: string | string[] | null
}) {
  const circles = useCircles()
  const router = useRouter()
  const [toggled, setToggled] = useState<boolean | null>(null)
  // Review again (v4.120.0): the project manager reviews each circle now, seeing what was just decided
  const [review, setReview] = useState<{ done: number; total: number; suggested: number; changed: number; errors: string[]; finished: boolean } | null>(null)
  const linkedHere = useSyncExternalStore(onHash, atPm, () => false)
  const open = toggled ?? linkedHere
  const [undone, setUndone] = useState<Set<string>>(() => new Set())
  const [busy, setBusy] = useState<string | null>(null)
  // Pills slid in the list below (Oscar, "when I decline … the count on the top row should decrease")
  const [pilled, setPilled] = useState<Set<string>>(() => new Set())
  const onPill = (id: string, d: unknown) => setPilled(prev => { const n = new Set(prev); if (d) n.add(id); else n.delete(id); return n })
  const inFilter = (c: string | null | undefined) => !circle || circle.length === 0 || (Array.isArray(circle) ? !!c && circle.includes(c) : c === circle)
  const shown = rows.filter(r => inFilter(r.circle))
  const done = actions.filter(a => inFilter(a.circle) && !undone.has(a.id))
  const reviewable = circles.slugs.filter(c => canDecide(c) && inFilter(c))
  if (!shown.length && !done.length && !reviewable.length) return null

  async function reviewAgain() {
    const list = [...reviewable]
    const total = list.length
    let doneN = 0, suggested = 0, changed = 0
    const errors: string[] = []
    setReview({ done: 0, total, suggested: 0, changed: 0, errors: [], finished: false })
    // Three circles at a time: each is one AI read of that circle's whole board
    const worker = async () => {
      for (let c = list.shift(); c; c = list.shift()) {
        try {
          const res = await fetch('/api/ops/board-review/now', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ circle: c }) })
          const r = await res.json().catch(() => ({})) as { suggested?: number; merged?: number; moved?: number; error?: string }
          if (!res.ok) errors.push(`${circles.meta(c).label}: ${r.error ?? 'didn’t finish'}`)
          suggested += r.suggested ?? 0; changed += (r.merged ?? 0) + (r.moved ?? 0)
        } catch { errors.push(`${circles.meta(c).label}: didn’t finish`) }
        doneN++
        setReview({ done: doneN, total, suggested, changed, errors: [...errors], finished: false })
      }
    }
    await Promise.all([worker(), worker(), worker()])
    setReview({ done: doneN, total, suggested, changed, errors, finished: true })
    setToggled(true)
    router.refresh()
  }
  const drafts = shown.filter(r => r.needs_review && !pilled.has(r.deliverable_id)).length
  const sugs = shown.filter(r => r.suggestions.length).length

  async function undo(a: PmAction) {
    setBusy(a.id)
    const res = await fetch(`/api/ops/agent-actions/${a.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'undo' }) })
    setBusy(null)
    if (res.ok) setUndone(prev => new Set(prev).add(a.id))
  }
  const tag = (c: string) => (circles.has(c) ? <span className="dl4-circle" style={{ ['--c' as string]: circles.meta(c).color }}>{circles.meta(c).emoji} {circles.meta(c).label}</span> : null)

  return (
    <section id="pm" className="v4-card dl4-panel">
      <div className="dl4-panel__head">
        {/* Design review (#45): one name with the drafts button, and "decide" is Governance's word (LEXICON) */}
        <b><InlineIcon name="compass" />{DESIGN_REVIEW ? 'Drafts to confirm' : 'To decide'}</b>
        <small>{[drafts ? `${drafts} draft${drafts === 1 ? '' : 's'}` : null, sugs ? `${sugs} with a suggestion` : null, done.length ? `${done.length} change${done.length === 1 ? '' : 's'} by the assistant` : null].filter(Boolean).join(' · ')}</small>
        {reviewable.length > 0 && (
          <button type="button" className="dl4-btn dl4-btn--review" disabled={!!review && !review.finished} onClick={reviewAgain}
            title="The project manager looks at everything pending again, with what you just decided">
            <Icon name="spark" size={13} />{review && !review.finished ? `Reviewing… ${review.done} of ${review.total}` : 'Review again'}
          </button>
        )}
        <button type="button" className="dl4-btn" onClick={() => setToggled(!open)}>{open ? 'Hide' : 'Show'}</button>
      </div>
      {review?.finished && (
        <div className={`dl4-review${review.errors.length ? ' dl4-review--warn' : ''}`}>
          Reviewed {review.total} circle{review.total === 1 ? '' : 's'}: {review.suggested} suggestion{review.suggested === 1 ? '' : 's'}{review.changed ? `, and ${review.changed} change${review.changed === 1 ? '' : 's'} it made itself (Undo below)` : ''}.
          {review.errors.length > 0 && <> Not reviewed: {review.errors.join(' · ')}</>}
        </div>
      )}
      {open && (
        <>
          {shown.length > 0 && <DecisionList rows={shown} options={options} canDecide={canDecide} grouped onPill={onPill} />}
          {done.length > 0 && (
            <div className="dl4-done">
              <div className="dl4-done__title">Done by the assistant (last 2 weeks)</div>
              {done.map(a => (
                <div key={a.id} className="dl4-done__row">
                  <span className="dl4-done__what">{a.action.startsWith('do_') ? 'Asked for' : DONE[a.action] ?? a.action}:</span>
                  <span>{a.label}</span>
                  {tag(a.circle)}
                  {a.reason && <span className="dl4-done__why">· {a.reason}</span>}
                  {canDecide(a.circle) && <button type="button" className="dl4-btn" disabled={busy === a.id} onClick={() => undo(a)}>{busy === a.id ? '…' : 'Undo'}</button>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
