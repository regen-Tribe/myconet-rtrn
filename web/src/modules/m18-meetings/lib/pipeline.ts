/**
 * The meeting pipeline — server only, with the service role. Runs when Fireflies' notes are in
 * (most meetings come straight from Fireflies; uploads too):
 *   1. the agent reads the meeting against the circles and the board (lib/draft-tasks.ts): is it a
 *      community meeting, which circle is it about (or community-wide), and which tasks came out of it,
 *      each in its own circle's best-matching project or that circle's Chores. Not a community
 *      meeting, or not sure → nothing else happens; a lead can set the circle to go on.
 *   2. the tasks go on the board as drafts (needs_review);
 *   3. the notes go to the second brain (lib/second-brain.ts): summary + tasks, never the transcript;
 *   4. the leads of the circles involved get the notes by email (lib/notes-email.ts);
 *   5. each step is logged in agent_actions.
 * Running it again adds only tasks that aren't there yet (meeting_action_links), rewrites the note,
 * and emails again only when asked.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { fmtTaskWhen } from '@/core/lib/tasks'
import type { ActionItem, MeetingVisibility } from '../types'
import { draftTasks, localDay } from './draft-tasks'
import { itemKey, matchPerson, displayName, type PersonProfile } from './people'
import { buildNote, notePath, saveNote, secondBrainOn } from './second-brain'
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

const one = (v: any) => (Array.isArray(v) ? v[0] : v)

export async function processMeeting(
  admin: SupabaseClient, meetingId: string,
  opts: { requestedBy: string | null; timeoutMs: number; email: 'auto' | 'again' | 'skip' },
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
    .select('id, title, meeting_date, created_at, attendees, summary, action_items, transcript, circle, circle_source, visibility, notes_emailed_at')
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
      meeting: { title: m.title, date: m.meeting_date ?? m.created_at, summary: m.summary, transcript: m.transcript, action_items: items, attendees: (m.attendees ?? []) as string[] },
      fixedCircle, circles, projects, openTasks, people: people.map(displayName), community, timeZone,
    }, { timeoutMs: opts.timeoutMs })
    if (read.note) errors.push(read.note)

    if (!read.isCommunity) {
      // Not this community's meeting, or the agent can't tell: wait for a lead
      await release({ needs_review: true, agent_note: read.reason, processing_error: errors.join(' · ') || null })
      await log('skip_meeting', { reason: read.reason, by: read.by })
      return { ok: true, skipped: read.reason ?? 'Not a community meeting', added: 0, circle: null, by: read.by, errors }
    }
    const meetingCircle = read.circle
    await admin.from('meeting_transcripts').update({
      circle: meetingCircle, circle_source: fixedCircle ? 'person' : 'agent', agent_note: read.reason, needs_review: false,
      // A circle-only meeting needs a circle
      ...(m.visibility === 'circle' && !meetingCircle ? { visibility: 'community' } : {}),
    }).eq('id', meetingId)
    if (!fixedCircle) await log('choose_circle', { circle: meetingCircle, reason: read.reason })

    // 2. The tasks, each in its circle's project or Chores
    let added = 0
    const chores = new Map<string, string>()
    for (const d of read.tasks) {
      const key = itemKey(d.title)
      if (!key) continue
      const person = matchPerson(d.person, people)
      // Claim the item first: a re-run (or a second webhook) can't add it twice
      const { error: claimErr } = await admin.from('meeting_action_links').insert({
        meeting_id: meetingId, item_key: key, item_index: d.item_index, item_text: d.source_text,
        person_name: d.person, assignee_id: person?.id ?? null, added_by: opts.requestedBy,
      })
      if (claimErr) { if (claimErr.code !== '23505') errors.push(`link: ${claimErr.message}`); continue }
      const unclaim = () => admin.from('meeting_action_links').delete().eq('meeting_id', meetingId).eq('item_key', key)

      let projectId = d.project_id
      if (!projectId) {
        if (!chores.has(d.circle)) {
          const { data, error } = await admin.rpc('chores_project_for_server', { p_circle: d.circle })
          if (error || !data) { errors.push(`chores (${d.circle}): ${error?.message ?? 'none'}`); await unclaim(); continue }
          chores.set(d.circle, data as string)
        }
        projectId = chores.get(d.circle)!
      }
      // Someone without an account keeps their name in the title, so a lead can pass it on
      const title = d.person && !person ? `${d.title} (for ${d.person})` : d.title
      const { data: task, error: taskErr } = await admin.from('deliverables').insert({
        project_id: projectId, title: title.slice(0, 300), assignee_id: person?.id ?? null, circle: d.circle,
        due_date: d.due_date, due_time: d.due_date ? d.due_time : null, status: 'backlog', progress: 0,
        source: 'meeting', source_meeting_id: meetingId, source_item: d.source_text, needs_review: true,
        created_by: opts.requestedBy,
      }).select('id').single()
      if (taskErr || !task) { errors.push(`task: ${taskErr?.message ?? 'not created'}`); await unclaim(); continue }
      await admin.from('meeting_action_links').update({ deliverable_id: task.id }).eq('meeting_id', meetingId).eq('item_key', key)
      await log('create_task', { title, circle: d.circle, project_id: projectId, person: d.person, assignee_id: person?.id ?? null, due_date: d.due_date, due_time: d.due_time, by: read.by }, { table: 'deliverables', id: task.id })
      added++
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
    const day = localDay(m.meeting_date ?? m.created_at, timeZone)
    const visibility = (meetingCircle ? m.visibility : 'community') as MeetingVisibility

    // 3. The second brain note
    let note: PipelineResult['note'] = null
    let notesUrl: string | null = null
    if (secondBrainOn()) {
      const path = notePath(day.date, m.title)
      try {
        const content = buildNote({
          id: meetingId, title: m.title, date: day.date,
          circle: meetingCircle ? { slug: meetingCircle, name: circleName(meetingCircle) } : null,
          circles: involved.map(c => ({ slug: c, name: circleName(c) })), visibility,
          attendees: (m.attendees ?? []) as string[], summary: m.summary, action_items: items, tasks, appUrl,
        })
        const saved = await saveNote(path, content, `Meeting notes: ${m.title} (${day.date})`)
        notesUrl = saved.url
        note = saved
        await admin.from('meeting_transcripts').update({ notes_path: path, notes_url: saved.url }).eq('id', meetingId)
        await log('save_note', { path, url: saved.url })
      } catch (e) {
        note = { error: (e as Error).message }
        errors.push(`second brain: ${(e as Error).message}`)
      }
    }

    // 4. Email the leads of the circles involved (once on its own; again only when asked)
    let email: PipelineResult['email'] = null
    if (notesEmailOn() && opts.email !== 'skip' && (opts.email === 'again' || !m.notes_emailed_at)) {
      const { emails, leadCount } = await notesRecipients(admin, involved)
      if (!emails.length) {
        email = { sent: 0, error: leadCount ? 'The leads have no email on their accounts' : 'No circle lead with an account yet' }
      } else {
        const when = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(m.meeting_date ?? m.created_at))
        const mail = buildNotesEmail({
          id: meetingId, title: m.title, when,
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
