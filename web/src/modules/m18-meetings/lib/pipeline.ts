/**
 * The meeting pipeline — server only, with the service role. Runs when Fireflies' notes are in
 * (most meetings come straight from Fireflies; uploads too):
 *   1. the agent reads the meeting against the circles and the board (lib/draft-tasks.ts): is it a
 *      community meeting, which circle is it about (or community-wide), and which tasks came out of it,
 *      each in its own circle's best-matching project or that circle's Chores. Not a community
 *      meeting, or not sure → nothing else happens; a lead can set the circle to go on.
 *   2. the tasks go on the board as drafts (needs_review);
 *   3. the meeting gets its name ("17.11.2026 Kitchen lead handover": the title people gave, made to
 *      say what it was about) and goes to the second brain (lib/second-brain.ts): a note with the
 *      summary, Fireflies' notes and the tasks, and the transcript in its own file;
 *   4. the leads of the circles involved get the notes by email (lib/notes-email.ts);
 *   5. each step is logged in agent_actions.
 * Running it again adds only tasks that aren't there yet (meeting_action_links), rewrites the note,
 * and emails again only when asked.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { fmtTaskWhen } from '@/core/lib/tasks'
import { one } from '@/core/lib/rows'
import type { ActionItem, MeetingVisibility } from '../types'
import { draftTasks, localDay, meetingName } from './draft-tasks'
import { itemKey, matchPerson, displayName, type PersonProfile } from './people'
import { buildNote, buildTranscript, deleteFile, legacyNotePaths, listPaths, notePath, NOTES_VERSION, saveNote, secondBrainOn, transcriptPath } from './second-brain'
import type { FirefliesNotes } from './fireflies'
import { requestBoardReview } from '@/modules/m07-ops/lib/board-review'
import { buildNotesEmail, notesEmailOn, notesRecipients, sendEmails } from './notes-email'

const ACTOR = 'meeting-pipeline'
const OPEN_PROJECT = ['pending', 'backlog', 'in_progress', 'review']
// A run that died (e.g. the Worker was stopped) can be retried after this long
const STALE_MS = 10 * 60_000

export interface PipelineResult {
  ok: boolean
  skipped?: string
  added: number
  circle?: string | null
  by?: 'ai' | 'action-items' | 'none'
  note?: { url: string } | { error: string } | null
  email?: { sent: number; error?: string } | null
  errors: string[]
}


export async function processMeeting(
  admin: SupabaseClient, meetingId: string,
  opts: { requestedBy: string | null; timeoutMs: number; email: 'auto' | 'again' },
): Promise<PipelineResult> {
  const now = new Date()
  const errors: string[] = []
  const log = (action: string, detail: object, target?: { table: string; id: string }) =>
    admin.from('agent_actions').insert({
      actor: ACTOR, requested_by: opts.requestedBy, action, meeting_id: meetingId,
      target_table: target?.table ?? null, target_id: target?.id ?? null, detail,
    }).then(() => {})

  // Claim the meeting so two runs can't overlap
  const { data: claimed } = await admin.from('meeting_transcripts')
    .update({ processing_started_at: now.toISOString() })
    .eq('id', meetingId).eq('status', 'done')
    .or(`processing_started_at.is.null,processing_started_at.lt."${new Date(now.getTime() - STALE_MS).toISOString()}"`)
    .select('id, title, original_title, meeting_date, created_at, attendees, summary, action_items, transcript, fireflies_notes, circle, circle_source, visibility, notes_path, notes_emailed_at')
  const m = claimed?.[0]
  if (!m) return { ok: false, skipped: 'Not ready (no notes yet), or already running', added: 0, errors }

  const release = (fields: object) => admin.from('meeting_transcripts').update({ processing_started_at: null, ...fields }).eq('id', meetingId)
  try {
    const timeZone = process.env.COMMUNITY_TIME_ZONE || 'UTC'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const community = process.env.NEXT_PUBLIC_COMMUNITY_NAME || 'the community'
    const items = (m.action_items ?? []) as ActionItem[]
    // A person's choice of circle stands; the agent's own earlier choice can be revisited
    const fixedCircle = m.circle && m.circle_source !== 'agent' ? (m.circle as string) : null

    const [circleRes, unitRes, projRes, taskRes, peopleRes] = await Promise.all([
      admin.from('circles').select('slug, name').is('archived_at', null).order('sort_order'),
      admin.from('org_units').select('circle, description').eq('kind', 'circle'),
      admin.from('projects').select('id, title, description, status, is_chores, circle').in('status', OPEN_PROJECT),
      admin.from('deliverables').select('title, circle, projects(title)').neq('status', 'done').order('created_at', { ascending: false }).limit(300),
      admin.from('user_profiles').select('id, first_name, last_name, username'),
    ])
    const descriptions = new Map((unitRes.data ?? []).map(u => [u.circle as string, u.description as string | null]))
    const circles = (circleRes.data ?? []).map(c => ({ slug: c.slug as string, name: c.name as string, description: descriptions.get(c.slug as string) ?? null }))
    const circleName = (slug: string | null) => circles.find(c => c.slug === slug)?.name ?? slug ?? ''
    const projects = (projRes.data ?? []).filter(p => !p.is_chores)
      .map(p => ({ id: p.id as string, title: p.title as string, description: p.description as string | null, circle: p.circle as string | null }))
    const people = (peopleRes.data ?? []) as PersonProfile[]
    const openTasks = (taskRes.data ?? []).map((t: any) => ({ title: t.title as string, circle: t.circle as string | null, project_title: one(t.projects)?.title ?? null }))

    // 1. The agent reads the meeting
    const read = await draftTasks({
      // What people called it, not the agent's earlier name for it
      meeting: { title: m.original_title ?? m.title, date: m.meeting_date ?? m.created_at, summary: m.summary, transcript: m.transcript, action_items: items, attendees: (m.attendees ?? []) as string[] },
      fixedCircle, circles, projects, openTasks, people: people.map(displayName), community, timeZone,
    }, { timeoutMs: opts.timeoutMs })
    if (read.note) errors.push(read.note)

    if (!read.isCommunity) {
      // Not this community's meeting, or the agent can't tell: wait for a lead
      await release({ needs_review: true, agent_note: read.reason, processing_error: errors.join(' · ') || null, processed_at: new Date().toISOString() })
      await log('skip_meeting', { reason: read.reason, by: read.by })
      return { ok: true, skipped: read.reason ?? 'Not a community meeting', added: 0, circle: null, by: read.by, errors }
    }
    const meetingCircle = read.circle
    const day = localDay(m.meeting_date ?? m.created_at, timeZone)
    // Its name: the date, then the agent's title from the content (kept as it was without the AI)
    const title = read.title ? meetingName(day.date, read.title) : (m.title as string)
    await admin.from('meeting_transcripts').update({
      circle: meetingCircle, circle_source: fixedCircle ? 'person' : 'agent', agent_note: read.reason, needs_review: false,
      ...(title !== m.title ? { title, original_title: m.original_title ?? m.title } : {}),
      // A circle-only meeting needs a circle
      ...(m.visibility === 'circle' && !meetingCircle ? { visibility: 'community' } : {}),
    }).eq('id', meetingId)
    if (!fixedCircle) await log('choose_circle', { circle: meetingCircle, reason: read.reason })
    if (title !== m.title) await log('name_meeting', { title, was: m.title })

    // 2. The tasks, each in its circle's project or Chores. Written in batches: a Worker may make only
    // 50 outside calls per request (Cloudflare free plan), so no per-task round trips.
    let added = 0
    const seen = new Set<string>()
    const wanted = read.tasks.map(d => ({ d, key: itemKey(d.title), person: matchPerson(d.person, people) }))
      .filter(w => w.key && !seen.has(w.key) && seen.add(w.key))
    if (wanted.length) {
      const linkRow = (w: typeof wanted[number], deliverableId: string | null = null) => ({
        meeting_id: meetingId, item_key: w.key, item_index: w.d.item_index, item_text: w.d.source_text,
        person_name: w.d.person, assignee_id: w.person?.id ?? null, added_by: opts.requestedBy,
        ...(deliverableId ? { deliverable_id: deliverableId } : {}),
      })
      // Claim the items first: only the ones claimed now are written, so a re-run (or a second
      // webhook at the same time) can't add a task twice
      const { data: claimedRows, error: claimErr } = await admin.from('meeting_action_links')
        .upsert(wanted.map(w => linkRow(w)), { onConflict: 'meeting_id,item_key', ignoreDuplicates: true }).select('item_key')
      if (claimErr) errors.push(`link: ${claimErr.message}`)
      const claimedKeys = new Set((claimedRows ?? []).map(r => r.item_key as string))
      let mine = wanted.filter(w => claimedKeys.has(w.key))
      const unclaim = (keys: string[]) => keys.length
        ? admin.from('meeting_action_links').delete().eq('meeting_id', meetingId).in('item_key', keys).is('deliverable_id', null).then(() => {})
        : Promise.resolve()

      // Each circle's Chores project, once per circle
      const chores = new Map<string, string>()
      for (const c of [...new Set(mine.filter(w => !w.d.project_id).map(w => w.d.circle))]) {
        const { data, error } = await admin.rpc('chores_project_for_server', { p_circle: c })
        if (error || !data) errors.push(`chores (${c}): ${error?.message ?? 'none'}`)
        else chores.set(c, data as string)
      }
      const noProject = mine.filter(w => !w.d.project_id && !chores.has(w.d.circle))
      await unclaim(noProject.map(w => w.key))
      mine = mine.filter(w => w.d.project_id || chores.has(w.d.circle))

      // Someone without an account keeps their name in the title, so a lead can pass it on
      const rows = mine.map(w => {
        const title = w.d.person && !w.person ? `${w.d.title} (for ${w.d.person})` : w.d.title
        return {
          w, title, projectId: w.d.project_id ?? chores.get(w.d.circle)!,
        }
      })
      if (rows.length) {
        const { data: made, error: taskErr } = await admin.from('deliverables').insert(rows.map(r => ({
          project_id: r.projectId, title: r.title.slice(0, 300), assignee_id: r.w.person?.id ?? null, circle: r.w.d.circle,
          due_date: r.w.d.due_date, due_time: r.w.d.due_date ? r.w.d.due_time : null, status: 'backlog', progress: 0,
          source: 'meeting', source_meeting_id: meetingId, source_item: r.w.d.source_text, needs_review: true,
          created_by: opts.requestedBy,
        }))).select('id')
        if (taskErr || !made || made.length !== rows.length) {
          errors.push(`tasks: ${taskErr?.message ?? 'not created'}`)
          await unclaim(rows.map(r => r.w.key))
        } else {
          // PostgREST returns inserted rows in the order sent
          await admin.from('meeting_action_links')
            .upsert(rows.map((r, i) => linkRow(r.w, made[i].id as string)), { onConflict: 'meeting_id,item_key' })
          await admin.from('agent_actions').insert(rows.map((r, i) => ({
            actor: ACTOR, requested_by: opts.requestedBy, action: 'create_task', meeting_id: meetingId,
            target_table: 'deliverables', target_id: made[i].id,
            detail: { title: r.title, circle: r.w.d.circle, project_id: r.projectId, project_reason: r.w.d.project_reason, person: r.w.d.person, assignee_id: r.w.person?.id ?? null, due_date: r.w.d.due_date, due_time: r.w.d.due_time, by: read.by },
          })))
          added = rows.length
        }
      }
    }

    // Every task this meeting has on the board (this run and earlier ones), for the note and email
    const { data: linkRows } = await admin.from('meeting_action_links')
      .select('person_name, assignee_id, deliverables(id, title, project_id, circle, needs_review, due_date, due_time)')
      .eq('meeting_id', meetingId).not('deliverable_id', 'is', null).order('created_at')
    const tasks = (linkRows ?? []).map((l: any) => {
      const t = one(l.deliverables)
      if (!t) return null
      return {
        // "(for Luis)" is for the board; the note and email show the person already
        title: (t.title as string).replace(/ \(for [^)]+\)$/, ''), person: (l.person_name as string | null), onMyCoNet: !!l.assignee_id || !l.person_name,
        url: `${appUrl}/ops/${t.project_id}?task=${t.id}`, draft: !!t.needs_review, circle: t.circle as string | null,
        circleName: circleName(t.circle), when: t.due_date ? fmtTaskWhen(t.due_date, t.due_time) : null,
      }
    }).filter((t): t is NonNullable<typeof t> => !!t)
    const notOnMyCoNet = [...new Set(tasks.filter(t => t.person && !t.onMyCoNet).map(t => t.person as string))]
    const involved = [...new Set([meetingCircle, ...tasks.map(t => t.circle)].filter((c): c is string => !!c))]
    // New tasks: the project manager reviews those circles' boards on the next sweep (m07-ops/lib/board-review.ts)
    if (added > 0) await requestBoardReview(admin, involved)
    const visibility = (meetingCircle ? m.visibility : 'community') as MeetingVisibility

    // 3. The second brain: the note, and the transcript beside it
    let note: PipelineResult['note'] = null
    let notesUrl: string | null = null
    if (secondBrainOn()) {
      const path = notePath(day.date, title)
      const fileName = path.split('/').pop()!
      try {
        const base = {
          id: meetingId, title, date: day.date,
          circle: meetingCircle ? { slug: meetingCircle, name: circleName(meetingCircle) } : null,
          circles: involved.map(c => ({ slug: c, name: circleName(c) })), visibility, appUrl,
        }
        if (m.transcript) {
          await saveNote(transcriptPath(path), buildTranscript(base, m.transcript, fileName), `Meeting transcript: ${title}`)
        }
        const content = buildNote({
          ...base, attendees: (m.attendees ?? []) as string[], summary: m.summary, action_items: items, tasks,
          fireflies: (m.fireflies_notes ?? null) as FirefliesNotes | null,
          transcriptLink: m.transcript ? `transcripts/${fileName}` : null,
        })
        const saved = await saveNote(path, content, `Meeting notes: ${title}`)
        notesUrl = saved.url
        note = saved
        // Renamed (or the folder moved): remove the old copies, so each meeting is one note
        const old = [...new Set([m.notes_path as string | null, ...legacyNotePaths(day.date, [m.original_title, m.title])])]
          .filter((p): p is string => !!p && p !== path)
        const removed: string[] = []
        if (old.length) {
          const inRepo = await listPaths()
          for (const f of old.flatMap(p => [p, transcriptPath(p)]).filter(f => inRepo.has(f))) {
            if (await deleteFile(f, `Meeting renamed: ${title}`)) removed.push(f)
          }
        }
        await admin.from('meeting_transcripts').update({ notes_path: path, notes_url: saved.url, notes_version: NOTES_VERSION }).eq('id', meetingId)
        await log('save_note', { path, url: saved.url, transcript: m.transcript ? transcriptPath(path) : null, removed })
      } catch (e) {
        note = { error: (e as Error).message }
        errors.push(`second brain: ${(e as Error).message}`)
      }
    }

    // 4. Email the leads of the circles involved (once on its own; again only when asked)
    let email: PipelineResult['email'] = null
    if (notesEmailOn() && (opts.email === 'again' || !m.notes_emailed_at)) {
      const { emails, leadCount } = await notesRecipients(admin, involved)
      if (!emails.length) {
        email = { sent: 0, error: leadCount ? 'The leads have no email on their accounts' : 'No circle lead with an account yet' }
      } else {
        const when = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(m.meeting_date ?? m.created_at))
        const mail = buildNotesEmail({
          id: meetingId, title, when,
          circleName: meetingCircle ? circleName(meetingCircle) : null,
          summary: m.summary, tasks, notOnMyCoNet, notesUrl, appUrl,
        })
        const results = await sendEmails(emails, mail)
        const sent = results.filter(r => r === null).length
        const failed = results.filter((r): r is string => r !== null)
        email = { sent, ...(failed.length ? { error: `${failed.length} failed: ${failed[0]}` } : {}) }
        await log('email_notes', { sent, failed: failed.length, recipients: emails.length, circles: involved })
      }
      await admin.from('meeting_transcripts').update({
        ...(email.sent > 0 ? { notes_emailed_at: new Date().toISOString() } : {}),
        notes_email_count: email.sent, notes_email_error: email.error ?? null,
      }).eq('id', meetingId)
      if (email.error) errors.push(`email: ${email.error}`)
    }

    await release({
      processed_at: new Date().toISOString(),
      processing_error: errors.length ? errors.join(' · ').slice(0, 1000) : null,
      tasks_drafted: tasks.length,
    })
    return { ok: true, added, circle: meetingCircle, by: read.by, note, email, errors }
  } catch (e) {
    const message = (e as Error).message
    await release({ processing_error: message.slice(0, 1000) })
    return { ok: false, added: 0, errors: [...errors, message] }
  }
}
