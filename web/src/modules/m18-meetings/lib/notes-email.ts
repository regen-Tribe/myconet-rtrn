/**
 * The meeting notes email — server only. Based on Sonia's (PR #53).
 *
 * Goes to the leads of the meeting's circle, at the email on their account, and to the
 * `alwaysTo` usernames in instance/config.jsonc. Not to outside attendees. People named in the
 * meeting who aren't on MyCoNet yet are listed, so the lead can pass their tasks on.
 * On when meetings.notesEmail is set (MEETINGS_EMAIL_FROM, MEETINGS_SMTP_HOST…) and the
 * MEETINGS_SMTP_PASSWORD secret exists. One email per person, so nobody sees anyone else's address.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { smtpSendAll } from './smtp'
import type { NotesTask } from '../types'

const MAX_RECIPIENTS = 30

export const notesEmailOn = () =>
  Boolean(process.env.MEETINGS_EMAIL_FROM && process.env.MEETINGS_SMTP_HOST && process.env.MEETINGS_SMTP_PASSWORD)


export interface EmailInput {
  id: string
  title: string
  when: string
  circleName: string | null
  summary: string | null
  tasks: NotesTask[]
  /** Named in the meeting, no account yet */
  notOnMyCoNet: string[]
  notesUrl: string | null
  appUrl: string
}

/** Leads of the circles involved (circle_lead or admin with the circle in lead_circles) and the alwaysTo usernames */
export async function notesRecipients(admin: SupabaseClient, circles: string[]): Promise<{ emails: string[]; leadCount: number }> {
  const ids = new Set<string>()
  let leadCount = 0
  if (circles.length) {
    const { data } = await admin.from('user_profiles').select('id, role').overlaps('lead_circles', circles)
    for (const p of data ?? []) if (p.role === 'circle_lead' || p.role === 'admin') { ids.add(p.id); leadCount++ }
  }
  const always = (process.env.MEETINGS_EMAIL_ALWAYS_TO ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (always.length) {
    const { data } = await admin.from('user_profiles').select('id').in('username', always)
    for (const p of data ?? []) ids.add(p.id)
  }
  const emails = await Promise.all([...ids].map(async id => {
    const { data } = await admin.auth.admin.getUserById(id)
    return data.user?.email?.toLowerCase() ?? null
  }))
  return { emails: [...new Set(emails.filter((e): e is string => !!e))].slice(0, MAX_RECIPIENTS), leadCount }
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export function buildNotesEmail(m: EmailInput) {
  const link = `${m.appUrl}/meetings/${m.id}`
  const subject = `Meeting notes: ${m.title}`.slice(0, 200)
  const drafts = m.tasks.filter(t => t.draft).length
  const several = new Set(m.tasks.map(t => t.circleName)).size > 1
  const taskLine = (t: NotesTask) =>
    `${several ? `[${t.circleName}] ` : ''}${t.person ? `${t.person}${t.onMyCoNet ? '' : ' (not on MyCoNet yet)'}: ` : ''}${t.title}${t.when ? ` · ${t.when}` : ''}`

  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:640px;color:#18181b;line-height:1.55">
<h2 style="margin:0 0 4px">${esc(m.title)}</h2>
<div style="color:#71717a;font-size:13px;margin-bottom:20px">${esc(m.when)} · ${m.circleName ? `${esc(m.circleName)} circle` : 'community-wide'}</div>
${m.summary ? `<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#71717a">Summary</h3><div style="white-space:pre-wrap;font-size:15px">${esc(m.summary)}</div>` : ''}
<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#71717a;margin-top:24px">Tasks on the board${drafts ? ` · ${drafts} to confirm` : ''}</h3>
${m.tasks.length ? `<ul style="margin:4px 0 0;padding-left:20px">${m.tasks.map(t => `<li><a href="${esc(t.url)}" style="color:#0f766e">${esc(taskLine(t))}</a>${t.draft ? ' <span style="color:#b45309;font-size:12px">draft</span>' : ''}</li>`).join('')}</ul>` : '<p>No tasks came out of this meeting.</p>'}
${m.notOnMyCoNet.length ? `<div style="margin-top:18px;padding:12px 14px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:14px"><strong>Not on MyCoNet yet:</strong> ${esc(m.notOnMyCoNet.join(', '))}. Their tasks are on the board without an assignee: pass them on, or invite them to the portal.</div>` : ''}
<p style="margin-top:28px"><a href="${esc(link)}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#0f766e;color:#fff;text-decoration:none;font-weight:600">Open the meeting · confirm the tasks</a></p>
<p style="color:#a1a1aa;font-size:12px">You're getting this because you lead a circle this meeting was about, or get every meeting's notes. The MyCoNet assistant chose the circles from what was said; a lead can change them on the meeting page.${m.notesUrl ? ' The notes are also in the second brain.' : ''}</p>
</div>`

  const text = [
    m.title, `${m.when} · ${m.circleName ? `${m.circleName} circle` : 'community-wide'}`, '',
    ...(m.summary ? ['SUMMARY', m.summary, ''] : []),
    `TASKS ON THE BOARD${drafts ? ` (${drafts} to confirm)` : ''}`,
    ...(m.tasks.length ? m.tasks.map(t => `  - ${taskLine(t)}${t.draft ? ' [draft]' : ''}  ${t.url}`) : ['  No tasks came out of this meeting.']),
    '',
    ...(m.notOnMyCoNet.length ? [`Not on MyCoNet yet: ${m.notOnMyCoNet.join(', ')}. Pass their tasks on, or invite them.`, ''] : []),
    `Open the meeting and confirm the tasks: ${link}`,
  ].join('\n')
  return { subject, html, text }
}

/** Sends one email per recipient over one SMTP connection; an error (or null) per recipient */
export function sendEmails(to: string[], mail: { subject: string; html: string; text: string }) {
  const from = process.env.MEETINGS_EMAIL_FROM!
  const name = process.env.NEXT_PUBLIC_COMMUNITY_NAME || 'MyCoNet'
  return smtpSendAll({
    host: process.env.MEETINGS_SMTP_HOST!, port: Number(process.env.MEETINGS_SMTP_PORT || 465),
    username: from, password: process.env.MEETINGS_SMTP_PASSWORD!, from, fromName: `${name} meetings`,
  }, to.map(t => ({ to: t, ...mail })))
}
