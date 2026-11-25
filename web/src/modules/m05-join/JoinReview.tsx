'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Icon, NextStep, type IconName } from '@/core/components/v4'
import { createClient } from '@/core/lib/supabase/client'
import { isFullMember, isJoiningOrAbove } from '@/core/lib/roles'
import { JOIN_REVIEWER, joinSteps, type JoinStepKey } from '@/core/lib/join-path'
import { JoinPathView } from './JoinPathView'
import { AvatarCropper } from '@/core/components/AvatarCropper'
import { uploadAvatarBlob } from '@/core/lib/avatar'
import { COMMUNITY_DESCRIPTION, COMMUNITY_NAME } from '@/core/lib/instance'
import { PillPicker } from '@/core/components/v4/PillPicker'
import { DESCRIBES, PILL_GROUPS, groupOfPill, pastel, valueList, type PillStats } from '@/core/lib/skills-interests'
import './join-review.css'

/**
 * Start joining with the design review: one focused flow (FocusShell, no menu around it), the track on top and
 * one step per screen with Back and Continue: Get to know us · About you · Apply. Everything happens here; About
 * opens in a new tab for anyone who wants to read more (Sonia, 24 Nov: "isolate more while providing links if
 * they want to read more", replacing #80's "read and sign on About"). The step is in the address (?step=).
 * The same steps as the menu's next step and the Dashboard (core/lib/join-path.ts). Words: LEXICON.md › Joining.
 * The old page (JoinClient) stays for communities without "designReview".
 */

interface Value { id: string; title: string; description: string }
interface Profile {
  first_name: string | null; last_name: string | null; headline: string | null; avatar_url?: string | null; public_bio?: string | null
  city?: string | null; country?: string | null; user_types?: string[] | null
}
/** What About you fills in user_bio and user_requests (#89, #90) */
export interface JoinBio { skills: string[]; interests: string[]; values_principles: string | null }
export interface JoinRequest { id: string; request_text: string }

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
// Two steps (#93): About you ends with Send application
const ORDER: JoinStepKey[] = ['values', 'profile']

// What each stage opens (LEXICON.md roles), folded away under the flow
const STAGES: { role: string; name: string; how: string; opens: [IconName, string][] }[] = [
  { role: 'explorer', name: 'Explorer', how: 'Create an account', opens: [['book', 'Read about the community'], ['users', 'Meet the members'], ['calendar', 'See what’s on']] },
  { role: 'joining', name: 'Joining member', how: 'Your application is accepted', opens: [['handshake', 'Offer help on tasks'], ['circles', 'Ask to join a circle'], ['chat', 'Agreements and meeting notes']] },
  { role: 'member', name: 'Member', how: 'Your first agreement is accepted', opens: [['vote', 'Vote on proposals'], ['plus', 'Suggest tasks and proposals'], ['star', 'Lead a task']] },
]

/** "Read more about Protopia", in a new tab so the flow stays where it is */
function ReadMore({ label = `Read more about ${COMMUNITY_NAME}` }: { label?: string }) {
  return <a href="/about" target="_blank" rel="noopener" className="jf-more">{label}<Icon name="external" size={14} /></a>
}

export default function JoinReview({ userId, role, values, initialSigned, questions, profile, offers = [], bio = null, requests = [], pillStats, application, initialStep, initialPart = 0 }: {
  userId: string | null
  role: string
  values: Value[]
  initialSigned: string[]
  questions: string[]
  profile: Profile | null
  /** What the person already offers (user_offers titles), so step 2 shows them chosen */
  offers?: string[]
  bio?: JoinBio | null
  requests?: JoinRequest[]
  /** How many people here list each skill and interest, and which go together (for "You might also pick") */
  pillStats: PillStats
  application: { status: string; created_at: string } | null
  initialStep: JoinStepKey | null
  /** About you's screen (0–2), from ?part= */
  initialPart?: number
}) {
  const router = useRouter()
  const [signed, setSigned] = useState(() => new Set(initialSigned))
  const [me, setMe] = useState<Profile | null>(profile)
  const [appStatus, setAppStatus] = useState<string | null>(application?.status ?? null)
  const [sentNow, setSentNow] = useState(false)
  const joined = !!userId && isJoiningOrAbove(role)
  const path = joinSteps({
    valuesSigned: values.filter(v => signed.has(v.id)).length,
    valuesTotal: values.length,
    hasPhoto: !!me?.avatar_url,
    hasHeadline: !!me?.headline,
    application: appStatus,
    joined,
  })
  const waiting = appStatus === 'pending' || appStatus === 'reviewing'
  // ?step=application (old links) opens About you's last screen, where Send is now
  const [open, setOpen] = useState<JoinStepKey | null>(userId && !joined ? (initialStep === 'application' ? 'profile' : initialStep ?? path.next?.key ?? 'values') : null)
  // What About you has saved so far, so going back and forth shows it (each screen starts from these)
  const [myOffers, setMyOffers] = useState(offers)
  const [myBio, setMyBio] = useState<JoinBio | null>(bio)
  const [myRequests, setMyRequests] = useState(requests)
  const [part, setPart] = useState(initialStep === 'application' ? 2 : initialStep === 'profile' ? Math.min(2, Math.max(0, initialPart)) : 0)

  // The open step lives in the address, so reloading or sharing the link opens the same step
  useEffect(() => {
    if (!open || typeof window === 'undefined') return
    const url = `/join?step=${open}${open === 'profile' && part > 0 ? `&part=${part + 1}` : ''}`
    if (window.location.pathname + window.location.search !== url) window.history.replaceState(null, '', url)
  }, [open, part])

  const go = (key: JoinStepKey, toPart = 0) => { setOpen(key); setPart(toPart); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const back = (key: JoinStepKey) => { const i = ORDER.indexOf(key); if (i > 0) go(ORDER[i - 1], ORDER[i - 1] === 'profile' ? 2 : 0) }
  const toPart = (n: number) => { setPart(n); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const here = userId ? (isFullMember(role) ? 'member' : role) : null
  const sent = waiting || sentNow

  return (
    <div className="jf">
      <header className="jf-head">
        <h1>{joined ? 'Joining' : sent ? 'Your application is in' : 'Start joining'}</h1>
        <p>{joined
          ? (isFullMember(role) ? `You’re a member of ${COMMUNITY_NAME}.` : 'You’re a joining member. One accepted agreement makes you a member.')
          : sent
            ? `${cap(JOIN_REVIEWER)} reads it and answers within a week.`
            : `Two short steps, about ten minutes. ${cap(JOIN_REVIEWER)} reads your application and answers within a week.`}</p>
      </header>

      {!joined && (
        <JoinPathView path={path} current={sent ? null : open} onPick={userId && !sent ? k => go(k) : undefined} />
      )}

      <section className="v4-card jf-card" aria-live="polite">
        {/* Signed out: what the two steps are, and the one way to start */}
        {!userId && (
          <div className="jf-step">
            <h2>Create an account to start</h2>
            <p className="jf-text">Then get to know us and tell us about you. You can stop at any step and come back.</p>
            <div className="jf-nav jf-nav--end">
              <Button variant="quiet" href="/auth/login">Sign in</Button>
              <Button variant="next" href="/auth/signup">Create account</Button>
            </div>
          </div>
        )}

        {userId && !joined && sent && (
          <div className="jf-step jf-done">
            <span className="jf-done__mark" aria-hidden="true"><Icon name="check" size={24} /></span>
            <h2>Sent{application?.created_at && !sentNow ? ` on ${fmt(application.created_at)}` : ''}</h2>
            <p className="jf-text">Meanwhile, look around: meet the members and see what’s on.</p>
            <div className="jf-nav jf-nav--center">
              <Button variant="next" href="/dashboard">Go to Dashboard</Button>
            </div>
          </div>
        )}

        {userId && !joined && !sent && open === 'values' && (
          <KnowUsStep userId={userId} values={values} signed={signed} onSigned={ids => setSigned(prev => new Set([...prev, ...ids]))} onNext={() => go('profile')} />
        )}
        {userId && !joined && !sent && open === 'profile' && (
          <AboutYouStep key={part} part={part} userId={userId} profile={me} offers={myOffers} bio={myBio} requests={myRequests} pillStats={pillStats} valueNames={values.map(v => v.title)}
            onSaved={p => setMe(prev => ({ ...(prev ?? { first_name: null, last_name: null, headline: null }), ...p }))}
            onData={d => {
              if (d.offers) setMyOffers(d.offers)
              if (d.bio) setMyBio(prev => ({ skills: [], interests: [], values_principles: null, ...prev, ...d.bio }))
              if (d.requests) setMyRequests(d.requests)
            }}
            questions={questions} rejected={appStatus === 'rejected'} unsignedValues={values.length - values.filter(v => signed.has(v.id)).length}
            onBackToValues={() => go('values')}
            onSent={() => { setAppStatus('pending'); setSentNow(true); window.scrollTo({ top: 0 }); router.refresh() }}
            onBack={() => (part > 0 ? toPart(part - 1) : back('profile'))} onNext={() => toPart(Math.min(2, part + 1))} />
        )}

        {joined && (
          <div className="jf-step">
            {!isFullMember(role)
              ? <NextStep title="Your first agreement" text="Offer help on a task. Once it’s accepted, you’re a member." href="/operations" />
              : <p className="jf-text">You can vote, suggest tasks and proposals, and lead a task.</p>}
          </div>
        )}
      </section>

      <div className="jf-foot">
        {/* Step 1 has its own link to About, next to the values */}
        {!(userId && !joined && !sent && open === 'values') && <ReadMore />}
        <details className="jf-opens">
          <summary>What joining opens</summary>
          <ul>
            {STAGES.map(st => (
              <li key={st.role} className={here === st.role ? 'here' : undefined}>
                <b>{st.name}{here === st.role && <span className="jf-you">You</span>}</b>
                <small>{st.how}</small>
                <span>{st.opens.map(([, text]) => text).join(' · ')}</span>
              </li>
            ))}
          </ul>
          <p>Task leads, circle leads and admins are asked by an admin.</p>
        </details>
      </div>
    </div>
  )
}

function fmt(iso: string | undefined | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Step 1: who we are in a line, the values right here, and "I share these values" (one signature per value,
// the same value_signatures rows as About's values chapter). About opens in a new tab for the full story.
function KnowUsStep({ userId, values, signed, onSigned, onNext }: {
  userId: string; values: Value[]; signed: Set<string>; onSigned: (ids: string[]) => void; onNext: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const done = values.every(v => signed.has(v.id))

  async function sign() {
    setBusy(true); setError('')
    const rows = values.filter(v => !signed.has(v.id)).map(v => ({ user_id: userId, value_id: v.id }))
    const { error: err } = rows.length ? await createClient().from('value_signatures').insert(rows) : { error: null }
    setBusy(false)
    if (err) { setError(`Couldn’t save your signature: ${err.message}. Try again.`); return }
    onSigned(rows.map(r => r.value_id))
  }

  return (
    <div className="jf-step">
      <small className="jf-eyebrow">Step 1 of 2</small>
      <h2>Get to know us</h2>
      <p className="jf-text">
        {COMMUNITY_DESCRIPTION ? `${COMMUNITY_NAME} is ${COMMUNITY_DESCRIPTION.charAt(0).toLowerCase()}${COMMUNITY_DESCRIPTION.slice(1).replace(/\.$/, '')}. ` : ''}
        {values.length > 0 ? 'These are the values we live by. If you share them, say so below.' : 'No values written yet; an admin adds them to About.'}
      </p>
      {values.length > 0 && (
        <ol className="jf-values">
          {values.map((v, i) => (
            <li key={v.id}><span className="jf-n" aria-hidden="true">{i + 1}</span><div><b>{v.title}</b>{v.description && <p>{v.description}</p>}</div></li>
          ))}
        </ol>
      )}
      <ReadMore label={`The whole story: About ${COMMUNITY_NAME}`} />
      {error && <p className="jr-error" role="alert">{error}</p>}
      <div className="jf-nav jf-nav--end">
        {done
          ? <>{values.length > 0 && <span className="jf-ok"><Icon name="check-circle" size={16} />You share these values</span>}<Button variant="next" onClick={onNext}>Continue</Button></>
          : <Button variant="next" onClick={sign} disabled={busy}>{busy ? 'Signing…' : 'I share these values'}</Button>}
      </div>
    </div>
  )
}

const PARTS = ['Tell us about you', 'What you’re good at and curious about', 'What you’d like, and what you value']
const norm = (t: string) => t.trim().toLowerCase()

// Step 2 (#81, #89): three short screens inside Start joining, each saved on Continue. 1: photo, a line about you,
// what you're up to, what best describes you, where you're based. 2: good at (the ones you share become offers,
// #90) and curious about, from one list of groups. 3: what you'd like to receive, and your values as names.
// A line about you finishes the step; everything can be skipped, since the application can be sent without it.
function AboutYouStep({ part, userId, profile, offers, bio, requests, pillStats, valueNames, questions, rejected, unsignedValues, onBackToValues, onSent, onSaved, onData, onBack, onNext }: {
  part: number; userId: string; profile: Profile | null; offers: string[]; bio: JoinBio | null; requests: JoinRequest[]; pillStats: PillStats
  valueNames: string[]; onSaved: (p: Partial<Profile>) => void
  onData: (d: { offers?: string[]; bio?: Partial<JoinBio>; requests?: JoinRequest[] }) => void
  /** The community's own questions, if its Blueprint has any; they show on the last screen, above Send */
  questions: string[]; rejected: boolean; unsignedValues: number; onBackToValues: () => void; onSent: () => void; onBack: () => void; onNext: () => void
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Screen 1
  const [photo, setPhoto] = useState<string | null>(profile?.avatar_url ?? null)
  const [pending, setPending] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [line, setLine] = useState(profile?.headline ?? '')
  const [world, setWorld] = useState(profile?.public_bio ?? '')
  const [types, setTypes] = useState<string[]>(profile?.user_types ?? [])
  const [city, setCity] = useState(profile?.city ?? '')
  const [country, setCountry] = useState(profile?.country ?? '')
  // Screen 2: what you already offer under a skill's name counts as shared
  const [good, setGood] = useState<string[]>(bio?.skills ?? [])
  const [curious, setCurious] = useState<string[]>(bio?.interests ?? [])
  const [shared, setShared] = useState<string[]>(() => (bio?.skills ?? []).filter(k => offers.some(o => norm(o) === norm(k))))
  // Screen 3
  const [asks, setAsks] = useState<{ id?: string; text: string }[]>(() => requests.length ? requests.map(r => ({ id: r.id, text: r.request_text })) : [{ text: '' }])
  const [mine, setMine] = useState<string[]>(() => valueList(bio?.values_principles) ?? [])
  const [valueDraft, setValueDraft] = useState('')
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''))
  const last = part === 2
  const oldText = bio?.values_principles && !valueList(bio.values_principles) ? bio.values_principles : null
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'You'

  async function cropped(blob: Blob) {
    setUploading(true); setError('')
    try { const url = await uploadAvatarBlob(supabase, userId, blob); setPhoto(url); onSaved({ avatar_url: url }); setPending(null) }
    catch (err) { setError(`The photo didn’t upload: ${err instanceof Error ? err.message : String(err)}`) }
    finally { setUploading(false) }
  }
  const flipType = (t: string) => setTypes(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]))
  const addValue = (v: string) => { const t = v.trim(); if (t && !mine.some(m => norm(m) === norm(t))) setMine([...mine, t]); setValueDraft('') }

  async function save() {
    setSaving(true); setError('')
    let err: { message: string } | null = null
    if (part === 0) {
      if (!line.trim()) { setSaving(false); setError('Add a line about you, or skip this for now.'); return }
      const patch = { headline: line.trim(), public_bio: world.trim() || null, user_types: types, city: city.trim() || null, country: country.trim() || null }
      ;({ error: err } = await supabase.from('user_profiles').update(patch).eq('id', userId))
      if (!err) onSaved(patch)
    }
    if (part === 1) {
      ;({ error: err } = await supabase.from('user_bio').upsert({ user_id: userId, skills: good, interests: curious }, { onConflict: 'user_id' }))
      // Shared skills become offers; a skill no longer shared takes its offer away (offers with other titles stay)
      const add = shared.filter(k => good.some(g => norm(g) === norm(k)) && !offers.some(o => norm(o) === norm(k)))
        .map(title => ({ user_id: userId, title, category: PILL_GROUPS[groupOfPill(title)]?.offerCategory ?? 'Other', compensation_model: 'Other', is_active: true }))
      const drop = offers.filter(o => [...good, ...(bio?.skills ?? [])].some(g => norm(g) === norm(o)) && !shared.some(k => norm(k) === norm(o)))
      if (!err && add.length) ({ error: err } = await supabase.from('user_offers').insert(add))
      if (!err && drop.length) ({ error: err } = await supabase.from('user_offers').delete().eq('user_id', userId).in('title', drop))
      if (!err) onData({ bio: { skills: good, interests: curious }, offers: [...offers.filter(o => !drop.includes(o)), ...add.map(a => a.title)] })
    }
    if (part === 2) {
      const values = [...mine.filter(Boolean), ...(valueDraft.trim() ? [valueDraft.trim()] : [])]
      // Older free text is kept until a value is added here
      const valuesText = values.length ? values.join('\n') : oldText
      ;({ error: err } = await supabase.from('user_bio').upsert({ user_id: userId, values_principles: valuesText }, { onConflict: 'user_id' }))
      const keep = asks.filter(a => a.text.trim())
      const gone = requests.filter(r => !keep.some(a => a.id === r.id)).map(r => r.id)
      if (!err && gone.length) ({ error: err } = await supabase.from('user_requests').delete().in('id', gone))
      const now: JoinRequest[] = []
      for (const a of keep) {
        if (err) break
        const text = a.text.trim()
        const old = requests.find(r => r.id === a.id)
        if (old && old.request_text !== text) ({ error: err } = await supabase.from('user_requests').update({ request_text: text }).eq('id', old.id))
        if (old) { now.push({ id: old.id, request_text: text }); continue }
        const res = await supabase.from('user_requests').insert({ user_id: userId, request_text: text, urgency: 'normal', is_active: true }).select('id').single()
        err = res.error
        if (res.data) now.push({ id: res.data.id as string, request_text: text })
      }
      if (!err) onData({ bio: { values_principles: valuesText }, requests: now })
    }
    // The last screen sends the application (#93). q0, q1… match the Blueprint's questions, if any; _questions keeps
    // their wording in case they're edited later (same as JoinClient)
    if (last && !err) {
      const payload: Record<string, unknown> = { _questions: questions }
      questions.forEach((_, i) => { payload[`q${i}`] = answers[i]?.trim() ?? '' })
      ;({ error: err } = await supabase.from('applications').upsert({ user_id: userId, answers: payload, status: 'pending' }, { onConflict: 'user_id' }))
    }
    setSaving(false)
    if (err) { setError(`Couldn’t ${last ? 'send' : 'save'}: ${err.message}. Try again.`); return }
    if (last) onSent()
    else onNext()
  }

  return (
    <div className="jf-step">
      {pending && <AvatarCropper file={pending} busy={uploading} onCancel={() => setPending(null)} onCropped={cropped} />}
      <small className="jf-eyebrow">Step 2 of 2 · {part + 1} of 3</small>
      <h2>{PARTS[part]}</h2>
      <ol className="jf-parts" aria-label="About you, three short screens">
        {PARTS.map((t, i) => <li key={t} className={i < part ? 'done' : i === part ? 'now' : undefined} aria-current={i === part ? 'step' : undefined}><span className="sr-only">{t}</span></li>)}
      </ol>

      {part === 0 && <>
        <p className="jf-text">Everything here goes on your profile. You can change it any time.</p>
        <label className="jr-me jr-photo">
          {photo ? <img src={photo} alt="" className="jr-av" /> : <span className="jr-av">{name.slice(0, 1).toUpperCase()}</span>}
          <span><b>{photo ? 'Change your photo' : 'Add a photo'}</b><small>{uploading ? 'Uploading…' : 'A clear face helps'}</small></span>
          <input type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) setPending(f); e.target.value = '' }} />
        </label>
        <label className="jr-field">
          <span>One line about you</span>
          <input value={line} onChange={e => setLine(e.target.value)} maxLength={120} placeholder="e.g. Permaculture designer and drummer" />
        </label>
        <label className="jr-field">
          <span>What are you up to in this world?<small className="jf-help">Tell us what you’re working on and towards.</small></span>
          <textarea rows={4} value={world} onChange={e => setWorld(e.target.value)} maxLength={1000} />
        </label>
        <fieldset className="jr-field jr-offers">
          <legend>What best describes you?<small className="jf-help">Choose all that apply.</small></legend>
          <div className="pp-describes">
            {DESCRIBES.map((d, i) => (
              <button key={d.id} type="button" style={pastel(i) as React.CSSProperties} className="pp-pick" aria-pressed={types.includes(d.id)} onClick={() => flipType(d.id)}>
                <b>{d.label}</b><small>{d.hint}</small>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="jr-field">
          <legend>Where do you call home?</legend>
          <div className="jf-two">
            <label className="jr-field"><small>Town or city</small><input value={city} onChange={e => setCity(e.target.value)} maxLength={80} autoComplete="address-level2" /></label>
            <label className="jr-field"><small>Country</small><input value={country} onChange={e => setCountry(e.target.value)} maxLength={60} autoComplete="country-name" /></label>
          </div>
        </fieldset>
      </>}

      {part === 1 && <>
        <p className="jf-text">Tap a group, then pick what fits. It helps you find people who know what you’d like to learn, and the other way round.</p>
        <PillPicker label="What are you good at?" hint="Pick from the groups, then tap the ones you’re excited to share: sessions, workshops, your time."
          value={good} onChange={setGood} stats={pillStats} share={{ value: shared, onChange: setShared }} ownExample="Pottery" />
        <PillPicker label="What are you curious about?" hint="The same groups. Pick what you’d love to learn or explore."
          value={curious} onChange={setCurious} stats={pillStats} ownExample="Mushrooms" />
      </>}

      {part === 2 && <>
        <fieldset className="jr-field">
          <legend>What would you like to receive from the community?<small className="jf-help">Any needs or requests you have.</small></legend>
          <div className="jf-asks">
            {asks.map((a, i) => (
              <span key={a.id ?? `new${i}`} className="jf-ask">
                <input value={a.text} onChange={e => setAsks(asks.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} maxLength={200}
                  placeholder={i === 0 ? 'e.g. A ride from the airport, help with Spanish' : 'Another request'} aria-label={`Request ${i + 1}`} />
                {asks.length > 1 && <button type="button" className="jf-x" aria-label="Remove this request" onClick={() => setAsks(asks.filter((_, j) => j !== i))}><Icon name="x" size={16} /></button>}
              </span>
            ))}
            <button type="button" className="jr-link jf-add" onClick={() => setAsks([...asks, { text: '' }])}>+ Add another</button>
          </div>
        </fieldset>
        <fieldset className="jr-field">
          <legend>Your values<small className="jf-help">A word or two each, the way we name ours. Just values; your days and habits have their own place.</small></legend>
          {mine.length > 0 && (
            <div className="pp-pills">
              {mine.map(v => <button key={v} type="button" className="pp-pill" aria-pressed="true" aria-label={`Remove ${v}`} onClick={() => setMine(mine.filter(x => x !== v))}>{v}<Icon name="x" size={16} /></button>)}
            </div>
          )}
          <div className="pp-own">
            <input value={valueDraft} onChange={e => setValueDraft(e.target.value)} maxLength={40} placeholder="e.g. Honesty" aria-label="Add a value"
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addValue(valueDraft) } }} />
            <button type="button" className="v4-btn v4-btn--secondary v4-btn--sm" onClick={() => addValue(valueDraft)} disabled={!valueDraft.trim()}>Add</button>
          </div>
          {valueNames.filter(v => !mine.some(m => norm(m) === norm(v))).length > 0 && (
            <div className="pp-row">
              <span className="pp-row__t">Ours, if they’re yours too</span>
              <div className="pp-pills">
                {valueNames.filter(v => !mine.some(m => norm(m) === norm(v))).map(v => (
                  <button key={v} type="button" className="pp-pill pp-pill--sug" onClick={() => addValue(v)}><Icon name="plus" size={16} />{v}</button>
                ))}
              </div>
            </div>
          )}
          {oldText && <small className="pp-note">What you wrote before stays on your profile until you add values here.</small>}
        </fieldset>
        {/* A community's own questions, when its Blueprint has them; questions are plain text, not bold labels */}
        {questions.map((q, i) => (
          <div key={i} className="jf-q">
            <label htmlFor={`jf-q${i}`}><span>{q}</span></label>
            <span className="jr-field"><textarea id={`jf-q${i}`} rows={3} value={answers[i] ?? ''} onChange={e => setAnswers(a => a.map((x, j) => (j === i ? e.target.value : x)))} /></span>
          </div>
        ))}
        <p className="jf-text jf-send">{rejected ? 'Your last application wasn’t accepted. You can send a new one. ' : ''}{cap(JOIN_REVIEWER)} reads your profile and answers within a week.</p>
        {/* Why Send waits, said next to the button, with the way to fix it */}
        {unsignedValues > 0 && (
          <p className="jf-warn"><Icon name="info" size={16} /><span>To send, first share the values in step 1. <button type="button" className="jr-link" onClick={onBackToValues}>Go to step 1</button></span></p>
        )}
      </>}

      {error && <p className="jr-error" role="alert">{error}</p>}
      <div className="jf-nav">
        <Button variant="quiet" icon="left" onClick={onBack}>Back</Button>
        <span className="jf-nav__end">
          {!last && <Button variant="quiet" onClick={onNext}>Skip for now</Button>}
          {last
            ? <Button variant="next" onClick={save} disabled={saving || unsignedValues > 0}>{saving ? 'Sending…' : 'Send application'}</Button>
            : <Button variant="next" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Continue'}</Button>}
        </span>
      </div>
    </div>
  )
}
