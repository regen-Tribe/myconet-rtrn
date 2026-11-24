'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Icon, NextStep, PageHeader, type IconName } from '@/core/components/v4'
import { createClient } from '@/core/lib/supabase/client'
import { isFullMember, isJoiningOrAbove } from '@/core/lib/roles'
import { JOIN_REVIEWER, joinSteps, type JoinStepKey } from '@/core/lib/join-path'
import { JoinPathView } from './JoinPathView'
import { AvatarCropper } from '@/core/components/AvatarCropper'
import { uploadAvatarBlob } from '@/core/lib/avatar'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import './join-review.css'

/**
 * Join with the design review (instance/design/ux-review-2026-11-22.html › Join): "Start joining" as three steps,
 * Get to know us · About you · Apply (#80, #81), with the track on top and the open step under it. The same steps as the
 * menu's next step and My dashboard (core/lib/join-path.ts). No module numbers, no badges; words: LEXICON.md.
 * The old page (JoinClient) stays for communities without "designReview".
 */

interface Value { id: string; title: string; description: string }
interface Profile { first_name: string | null; last_name: string | null; headline: string | null; avatar_url?: string | null; public_bio?: string | null }

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// What each stage opens (LEXICON.md roles), shown as three columns, the current one marked
const STAGES: { role: string; name: string; how: string; opens: [IconName, string][] }[] = [
  { role: 'explorer', name: 'Explorer', how: 'Create an account', opens: [['book', 'Read about the community'], ['users', 'Meet the members'], ['calendar', 'See what’s on']] },
  { role: 'joining', name: 'Joining member', how: 'Your application is accepted', opens: [['handshake', 'Offer help on tasks'], ['circles', 'Ask to join a circle'], ['chat', 'Agreements and meeting notes']] },
  { role: 'member', name: 'Member', how: 'Your first agreement is accepted', opens: [['vote', 'Vote on proposals'], ['plus', 'Suggest tasks and proposals'], ['star', 'Lead a task']] },
]

export default function JoinReview({ userId, role, values, initialSigned, questions, profile, offers = [], application, initialStep }: {
  userId: string | null
  role: string
  values: Value[]
  initialSigned: string[]
  questions: string[]
  profile: Profile | null
  /** What the person already offers (user_offers titles), so step 2 shows them chosen */
  offers?: string[]
  application: { status: string; created_at: string } | null
  initialStep: JoinStepKey | null
}) {
  const router = useRouter()
  const signed = new Set(initialSigned)
  const [appStatus, setAppStatus] = useState<string | null>(application?.status ?? null)
  const joined = !!userId && isJoiningOrAbove(role)
  const path = joinSteps({
    valuesSigned: values.filter(v => signed.has(v.id)).length,
    valuesTotal: values.length,
    hasPhoto: !!profile?.avatar_url,
    hasHeadline: !!profile?.headline,
    application: appStatus,
    joined,
  })
  const [open, setOpen] = useState<JoinStepKey | null>(userId && !joined ? (initialStep ?? path.next?.key ?? null) : null)
  const waiting = appStatus === 'pending' || appStatus === 'reviewing'

  const go = (key: JoinStepKey | null) => { setOpen(key); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <div className="v4-page jr">
      <PageHeader
        title={joined ? 'Joining' : 'Start joining'}
        subtitle={joined
          ? (isFullMember(role) ? 'You’re a member. Here’s what each stage opens.' : 'You’re a joining member. One accepted agreement makes you a member.')
          : `Three short steps, about ten minutes in all. ${cap(JOIN_REVIEWER)} reads your application and answers within a week.`}
      />

      <section className="v4-card jr-card" aria-label="Your way in">
        <JoinPathView path={path} current={open} onPick={userId && !joined && !waiting ? k => go(k) : undefined} />

        {/* Signed out: one quiet line where it's needed, no banner (the menu holds the next step) */}
        {!userId && (
          <p className="jr-line"><Icon name="lock" size={16} /><span><Link href="/auth/signup">Create an account</Link> to start · Have one? <Link href="/auth/login">Sign in</Link></span></p>
        )}

        {userId && !joined && waiting && (
          <div className="jr-state">
            <span className="jr-result"><Icon name="clock" size={16} />Sent {fmt(application?.created_at)}</span>
            <p>{cap(JOIN_REVIEWER)} reads it and answers within a week. You can keep looking around meanwhile.</p>
          </div>
        )}

        {userId && !joined && !waiting && open === 'values' && (
          <KnowUsStep values={values} signed={signed} onNext={() => go('profile')} />
        )}
        {userId && !joined && !waiting && open === 'profile' && (
          <AboutYouStep userId={userId} profile={profile} offers={offers} onNext={() => { go('application'); router.refresh() }} />
        )}
        {userId && !joined && !waiting && open === 'application' && (
          <ApplicationStep userId={userId} questions={questions} rejected={appStatus === 'rejected'} unsignedValues={values.length - values.filter(v => signed.has(v.id)).length}
            onBackToValues={() => go('values')}
            onSent={() => { setAppStatus('pending'); setOpen(null); router.refresh() }} />
        )}
      </section>

      {joined && !isFullMember(role) && (
        <NextStep title="Your first agreement" text="Offer help on a task. Once it’s accepted, you’re a member." href="/operations" />
      )}

      <section aria-labelledby="jr-opens">
        <h2 id="jr-opens" className="jr-h">What joining opens</h2>
        <div className="jr-stages">
          {STAGES.map(st => {
            const here = (userId ? (isFullMember(role) ? 'member' : role) : null) === st.role
            return (
              <div key={st.role} className={`v4-card jr-stage${here ? ' here' : ''}`}>
                <div className="jr-stage__head"><b>{st.name}</b>{here && <span className="jr-you">You</span>}</div>
                <small>{st.how}</small>
                <ul>{st.opens.map(([icon, text]) => <li key={text}><Icon name={icon} size={16} />{text}</li>)}</ul>
              </div>
            )
          })}
        </div>
        <p className="jr-foot">Task leads, circle leads and admins are asked by an admin.</p>
      </section>
    </div>
  )
}

function fmt(iso: string | undefined | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Step 1 (#80): reading About and signing its values is one step. Start joining points there; signing lives at
// the end of About's values chapter (m04-blueprint/SignValues.tsx).
function KnowUsStep({ values, signed, onNext }: { values: Value[]; signed: Set<string>; onNext: () => void }) {
  const done = values.every(v => signed.has(v.id))
  return (
    <div className="jr-step">
      <h2 className="jr-h">Get to know us</h2>
      {done
        ? <p className="jr-hint"><Icon name="check-circle" size={16} /> You read about {COMMUNITY_NAME} and signed the values.</p>
        : <p className="jr-text">Read about {COMMUNITY_NAME}: the land, the people, a day here and how we decide. The values chapter ends with “I share these values”; signing there finishes this step.</p>}
      <div className="jr-acts">
        {done
          ? <Button onClick={onNext}>Go to step 2</Button>
          : <Button variant="next" href="/about#values" icon="book">Read About {COMMUNITY_NAME}</Button>}
      </div>
    </div>
  )
}

// What people offer most here, as one-tap chips; each becomes an offer on their profile (category as in Edit profile)
const OFFER_CHIPS: [string, string][] = [
  ['Cooking', 'Food'], ['Building', 'Construction'], ['Gardening', 'Permaculture'], ['Art', 'Art'], ['Music', 'Music'],
  ['Teaching', 'Education'], ['Healing', 'Healing'], ['Technology', 'Technology'], ['Childcare', 'Childcare'],
]

// Step 2 (#81): a short form inside Start joining, not the eight-tab editor. A line about you finishes the step
function AboutYouStep({ userId, profile, offers, onNext }: { userId: string; profile: Profile | null; offers: string[]; onNext: () => void }) {
  const supabase = createClient()
  const [photo, setPhoto] = useState<string | null>(profile?.avatar_url ?? null)
  const [pending, setPending] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [line, setLine] = useState(profile?.headline ?? '')
  const [why, setWhy] = useState(profile?.public_bio ?? '')
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(offers))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'You'

  async function cropped(blob: Blob) {
    setUploading(true); setError('')
    try { setPhoto(await uploadAvatarBlob(supabase, userId, blob)); setPending(null) }
    catch (err) { setError(`The photo didn't upload: ${err instanceof Error ? err.message : String(err)}`) }
    finally { setUploading(false) }
  }

  const flip = (t: string) => setChosen(prev => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n })

  async function save() {
    if (!line.trim()) { setError('Add a line about you to finish this step.'); return }
    setSaving(true); setError('')
    const { error: e1 } = await supabase.from('user_profiles').update({ headline: line.trim(), public_bio: why.trim() || null }).eq('id', userId)
    const added = OFFER_CHIPS.filter(([t]) => chosen.has(t) && !offers.includes(t)).map(([title, category]) => ({ user_id: userId, title, category }))
    const { error: e2 } = added.length ? await supabase.from('user_offers').insert(added) : { error: null }
    setSaving(false)
    if (e1 || e2) { setError(`Couldn't save: ${(e1 ?? e2)!.message}. Try again.`); return }
    onNext()
  }

  return (
    <div className="jr-step">
      {pending && <AvatarCropper file={pending} busy={uploading} onCancel={() => setPending(null)} onCropped={cropped} />}
      <h2 className="jr-h">Tell us about you</h2>
      <label className="jr-me jr-photo">
        {photo ? <img src={photo} alt="" className="jr-av" /> : <span className="jr-av">{name.slice(0, 1).toUpperCase()}</span>}
        <span><b>{photo ? 'Change your photo' : 'Add a photo'}</b><small>So people know who they’ll meet</small></span>
        <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) setPending(f); e.target.value = '' }} />
      </label>
      <label className="jr-field">
        <span>A line about you</span>
        <input id="jr-line" value={line} onChange={e => setLine(e.target.value)} maxLength={120} placeholder="e.g. Permaculture designer and drummer" />
      </label>
      <fieldset className="jr-field jr-offers">
        <legend>What you’d like to offer</legend>
        <div className="jr-chips">
          {OFFER_CHIPS.map(([t]) => (
            <button key={t} type="button" className={`v4-chip${chosen.has(t) ? ' v4-chip--on' : ''}`} aria-pressed={chosen.has(t)} onClick={() => flip(t)}>{t}</button>
          ))}
        </div>
      </fieldset>
      <label className="jr-field">
        <span>What brings you to {COMMUNITY_NAME} <small>Optional</small></span>
        <textarea id="jr-why" rows={3} value={why} onChange={e => setWhy(e.target.value)} placeholder="A few words" />
      </label>
      {error && <p className="jr-error" role="alert">{error}</p>}
      <div className="jr-acts">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save and go to step 3'}</Button>
        <Link href="/profile/edit" className="jr-later">Fill in the rest later</Link>
      </div>
    </div>
  )
}

function ApplicationStep({ userId, questions, rejected, unsignedValues, onBackToValues, onSent }: {
  userId: string; questions: string[]; rejected: boolean; unsignedValues: number; onBackToValues: () => void; onSent: () => void
}) {
  const supabase = createClient()
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''))
  const [extra, setExtra] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    setSending(true); setError('')
    // q0, q1… match the Blueprint's questions; _questions keeps their wording in case they're edited later (same as JoinClient)
    const payload: Record<string, unknown> = { extra, _questions: questions }
    questions.forEach((_, i) => { payload[`q${i}`] = answers[i]?.trim() ?? '' })
    const { error: err } = await supabase.from('applications').upsert({ user_id: userId, answers: payload, status: 'pending' }, { onConflict: 'user_id' })
    if (err) { setError(err.message); setSending(false); return }
    onSent()
  }

  return (
    <div className="jr-step">
      <h2 className="jr-h">{rejected ? 'A new application' : 'Your application'}</h2>
      {rejected && <p className="jr-hint">Your last application wasn’t accepted. You can send a new one.</p>}
      {unsignedValues > 0 && <p className="jr-hint"><button type="button" className="jr-link" onClick={onBackToValues}>Step 1 first: sign the values at the end of About</button></p>}
      {questions.length === 0 && <p className="jr-hint">No questions written yet. Tell the community about yourself below.</p>}
      {questions.map((q, i) => (
        <label key={i} className="jr-field">
          <span>{q}</span>
          <textarea rows={3} value={answers[i] ?? ''} onChange={e => setAnswers(a => a.map((x, j) => (j === i ? e.target.value : x)))} />
        </label>
      ))}
      <label className="jr-field">
        <span>Anything else? <small>Optional</small></span>
        <textarea rows={3} value={extra} onChange={e => setExtra(e.target.value)} />
      </label>
      {error && <p className="jr-error" role="alert">{error}</p>}
      <div className="jr-acts">
        <Button variant="next" onClick={send} disabled={sending || unsignedValues > 0}>{sending ? 'Sending…' : 'Send application'}</Button>
      </div>
    </div>
  )
}
