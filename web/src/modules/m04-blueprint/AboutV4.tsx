import type { SupabaseClient } from '@supabase/supabase-js'
import { Button, Card, Icon, IconTile, Tag, type IconName } from '@/core/components/v4'
import { loadBranding } from '@/core/lib/branding-server'
import { roleAtLeast } from '@/core/lib/roles'
import { COMMUNITY_DESCRIPTION, DESIGN_REVIEW } from '@/core/lib/instance'
import { fetchCircleDirectory } from '@/core/lib/ops-permissions'
import { loadCircleRows } from '@/core/lib/circles-server'
import { FW_DATA } from './lib/wizard-data'
import { computeGatesPassed, computeOverallReadiness, computePillarScores } from './lib/blueprint-compute'
import AskAboutButton from './AskAboutButton'
import AboutNav from './AboutNav'
import { fact, glance, splitName } from './lib/about-text'
import AboutFacts from './AboutFacts'
import SignValues from './SignValues'
import './about-v4.css'

/**
 * About {community} in the v4 look, laid out as Sonia's prototype (design/redesign-prototype/app.js › pAbout):
 * a full-bleed photo with the name, a strip of facts, chapters (why we're here, our story, the land, a day
 * here, what we value, how we decide, living here, people, where we're going) and the Blueprint's progress.
 * Everything comes from the community's Blueprint answers, values, photos and circle leads, so it changes
 * when they do. Every other answered field stays under "The whole Blueprint". Editing is the wizard
 * (`/about?edit=1`, or any `?step=` link).
 */

const str = (v: unknown) => (typeof v === 'string' && v.trim().length > 1 ? v.trim() : null)

/** "First sentence. The rest…" → [first sentence, rest] (for a chapter's headline and its text). */
function headline(text: string | null, max = 110): [string | null, string | null] {
  if (!text) return [null, null]
  const t = text.replace(/\s+/g, ' ').trim()
  const cut = t.search(/(?<=[a-z0-9)%"”])[.!?]\s/i)
  if (cut > 20 && cut < max) return [t.slice(0, cut + 1), t.slice(cut + 2).trim() || null]
  return [null, text]
}

/** A list written as lines, bullets or "a; b; c" → items. */
function items(text: string | null): string[] {
  if (!text) return []
  const clean = (parts: string[]) => parts.map(l => l.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, '').trim()).filter(l => l.length > 1)
  // One item per line when there are lines, so a "; " inside a value's sentences doesn't split it (#92);
  // a single paragraph still splits at bullets and semicolons
  const lines = clean(text.split(/\n+/))
  if (lines.length > 1) return lines
  const parts = clean(text.split(/(?:^|\s)[•·▪]\s|;\s+/))
  return parts.length > 1 ? parts : []
}

/** "Care — we look after…" or "Care: we look after…" → [Care, we look after…]. */
function titled(line: string): [string, string | null] {
  const m = line.match(/^(.{2,48}?)\s*(?:[:—–]|\s-\s)\s*(.+)$/)
  return m ? [m[1], m[2]] : [line, null]
}

/** "…in La Cabanga, Costa Rica, between…" → "La Cabanga, Costa Rica" (the place tag on the photo). */
function place(...texts: (string | null)[]): string | null {
  // "in La Cabanga, Costa Rica" or "hills of La Cabanga, Costa Rica": a place with its country wins over one without
  const found = texts.flatMap(t => [...(t ?? '').matchAll(/\b(?:in|of) ((?:[A-Z][\p{L}'-]+ ?){1,3}(?:, ?(?:[A-Z][\p{L}'-]+ ?){1,3})?)/gu)].map(m => m[1].trim().replace(/,$/, '')))
  return found.find(f => f.includes(',')) ?? found[0] ?? null
}

/** "Our weekday …: movement from 7:00–8:00 AM, breakfast, a short 8:45–9:00 AM sync-up, work, … and evening activity
 *  from 7:00 PM. The rest…" → the day as steps (with their times when given) and the rest of the answer. */
function rhythm(text: string | null): { steps: [time: string | null, what: string][]; rest: string | null } {
  if (!text) return { steps: [], rest: null }
  const t = text.replace(/\s+/g, ' ').trim()
  const m = t.match(/^([^:]{3,120}):\s*(.+?)\.(?=\s+\p{Lu}|$)/u)
  const parts = m ? m[2].split(/,\s*|\s+and\s+(?=[a-z])/).map(x => x.trim()).filter(Boolean) : []
  if (parts.length < 4) return { steps: [], rest: t }
  const TIMES = /(?:from\s+)?(\d{1,2}(?:[:.]\d{2})?\s*(?:[–-]\s*\d{1,2}(?:[:.]\d{2})?)?\s*(?:AM|PM|am|pm)?)(?=\s|$)/
  const steps = parts.map(part => {
    const tm = part.match(TIMES)
    const time = tm && /\d[:.]\d|am|pm/i.test(tm[1]) ? tm[1].trim() : null
    const what = (time ? part.replace(tm![0], ' ') : part).replace(/^\s*(?:a|an|the)\s+(?:short|quick)?\s*/i, '').replace(/\s+/g, ' ').trim()
    return [time, what.replace(/^\p{Ll}/u, c => c.toUpperCase())] as [string | null, string]
  })
  const rest = t.slice(m![0].length).trim()
  return { steps, rest: rest || null }
}

const TIME = /^(\d{1,2}[:.]\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))\s*[–—-]?\s*(.*)$/i

/** Blueprint field, label, and the chapter where its whole answer lives (the strip links there) */
const FACTS: [string, string, 'why' | 'land' | 'live'][] = [
  ['land_size', 'The land', 'land'], ['community_size', 'People', 'live'], ['planned_homes', 'Homes', 'live'], ['climate', 'Climate', 'land'], ['project_country', 'Where', 'land'], ['community_type', 'What we are', 'why'],
]

type Tone = 'blue' | 'red' | 'yellow' | 'green' | 'violet' | 'grey'
/** One topic of a chapter: a row with its title and the first sentence; it opens to the whole answer. */
export type Topic = { id?: string; icon: IconName; title: string; text: string | null; note?: string | null }

/** A chapter: the headline, a short lead and a photo on one side (it stays in view on a computer); the
 *  topics as quiet rows on the other. Rows instead of a grid of text cards (Sonia, 20 Nov: "significantly
 *  more pleasant to go through"). */
function Chapter({ id, eyebrow, title, lead, photo, side, children }: {
  id: string; eyebrow: string; title: string | null; lead?: string | null
  photo?: { url: string; caption: string; href?: string } | null; side?: React.ReactNode; children?: React.ReactNode
}) {
  return (
    <section className="ab-ch" id={id}>
      <div className="ab-ch__side">
        <div className="v4-eyebrow">{eyebrow}</div>
        {title && <h2 className="ab-h">{title}</h2>}
        {lead && <Short text={lead} max={300} lead />}
        {photo && (
          <figure className="ab-ch__photo">
            {photo.href ? <a href={photo.href} style={{ backgroundImage: `url(${photo.url})` }} aria-label={photo.caption} /> : <div style={{ backgroundImage: `url(${photo.url})` }} role="img" aria-label={photo.caption} />}
            <figcaption>{photo.caption}</figcaption>
          </figure>
        )}
        {side}
      </div>
      <div className="ab-ch__main">{children}</div>
    </section>
  )
}

const firstSentence = (t: string) => { const m = t.replace(/\s+/g, ' ').match(/^.{20,}?[.!?](?=\s|$)/); return m ? m[0] : t }

function Topics({ title, topics, tone = 'blue' }: { title?: string; topics: Topic[]; tone?: Tone }) {
  const shown = topics.filter(t => t.text || t.note)
  if (!shown.length) return null
  return (
    <div className="ab-topics">
      {title && <h3 className="ab-topics__h">{title}</h3>}
      <div className="ab-topics__list">
        {shown.map(t => (
          <details key={t.title} id={t.id} className="ab-topic">
            <summary>
              <IconTile name={t.icon} tone={tone} />
              <span className="ab-topic__t"><b>{t.title}</b><span className="ab-topic__peek">{firstSentence(t.text ?? t.note!)}</span></span>
              <Icon name="down" size={16} />
            </summary>
            <div className="ab-topic__body">
              {t.text && <p className="v4-prose">{t.text}</p>}
              {t.note && <p className="v4-prose ab-topic__note">{t.note}</p>}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}


/** Long answers show their first two sentences; the rest opens with "Read more" (nothing is cut). */
function Short({ text, max = 260, lead }: { text: string | null; max?: number; lead?: boolean }) {
  if (!text) return null
  const t = text.trim()
  const cls = `v4-prose${lead ? ' ab-lead' : ''}`
  if (t.length <= max) return <p className={cls}>{t}</p>
  const parts = t.split(/(?<=[.!?])\s+/)
  let head = ''
  for (const p of parts) { if ((head + ' ' + p).trim().length > max && head) break; head = (head + ' ' + p).trim() }
  if (!head || head.length >= t.length) head = t.slice(0, t.lastIndexOf(' ', max)) + '…'
  return (
    <details className={`ab-more${lead ? ' ab-more--lead' : ''}`}>
      <summary><span className={cls}>{head}</span><span className="ab-more__btn">Read more</span></summary>
      <p className={cls}>{t.slice(head.replace(/…$/, '').length).trim()}</p>
    </details>
  )
}

export default async function AboutV4({ supabase, communityName, role, canEdit, signedIn = true }: {
  supabase: SupabaseClient; communityName: string; role: string; canEdit: boolean
  /** Signed out: with the design review the first action is Create account, as in the menu (design/decisions.md #27) */
  signedIn?: boolean
}) {
  const [{ data: bp }, branding, { data: values }, directory, circles] = await Promise.all([
    supabase.from('blueprints').select('answers').eq('is_community', true).maybeSingle(),
    loadBranding(supabase),
    supabase.from('community_values').select('id, title, description').order('sort_order'),
    fetchCircleDirectory(supabase).catch(() => ({ leads: {}, admins: [] } as unknown as Awaited<ReturnType<typeof fetchCircleDirectory>>)),
    loadCircleRows(supabase),
  ])
  const a = ((bp?.answers as Record<string, unknown> | null) ?? {})
  const { data: mapRow } = await supabase.from('community_settings').select('site_map_url').maybeSingle().then(r => r, () => ({ data: null }))
  const mapUrl = (mapRow as { site_map_url?: string | null } | null)?.site_map_url ?? null
  // Photos of places from the Map, one per chapter; places are for signed-in people (as on the Map), so a
  // visitor who isn't signed in sees the chapters without them
  const { data: placeRows } = await supabase.from('places').select('slug, name, photo_url').not('photo_url', 'is', null).then(r => r, () => ({ data: null }))
  const photoOf = (...slugs: string[]) => {
    const p = slugs.map(sl => (placeRows ?? []).find(r => r.slug === sl)).find(Boolean)
    return p?.photo_url ? { url: p.photo_url as string, caption: p.name as string, href: `/map?place=${p.slug}` } : null
  }
  const s = (k: string) => str(a[k])
  const { name, tagline } = splitName(s('project_name'), communityName)
  const where = place(s('project_name'), s('project_country'), s('location_setting'), s('community_type'))
  const factRows = FACTS.map(([k, label, ch]) => ({ k, label, ch, short: fact(s(k)), full: s(k) })).filter(f => f.short && f.full)
  // At a glance: figures with a line each (what we are is the line under the name, so it isn't a tile)
  const tiles = glance(s)
  // Design review: the one description set in instance config, the same on sign in
  const heroLine = (DESIGN_REVIEW && COMMUNITY_DESCRIPTION) || (tagline ?? fact(s('community_type')))
  const FACT_ICON: Record<string, IconName> = { land_size: 'tree', community_size: 'users', planned_homes: 'bed', climate: 'drop', project_country: 'pin', community_type: 'home' }
  const factsIn = (ch: string): Topic[] => factRows.filter(f => f.ch === ch).map(f => ({ id: `fact-${f.k}`, icon: FACT_ICON[f.k] ?? 'star', title: f.label, text: f.full }))
  const whyFacts = factsIn('why'), landFacts = factsIn('land'), liveFacts = factsIn('live')
  const explorer = !roleAtLeast(role, 'joining')
  // Joining step 1 (#80): a signed-in explorer signs the values at the end of their chapter
  let signer: { userId: string; signed: string[] } | null = null
  if (DESIGN_REVIEW && signedIn && explorer && values?.length) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: sig } = await supabase.from('value_signatures').select('value_id').eq('user_id', user.id)
      signer = { userId: user.id, signed: (sig ?? []).map(r => r.value_id as string) }
    }
  }
  // A visitor's first action is Create account everywhere (same link as the menu's card); signed-in explorers: Start joining
  // with Sign in beside it, as on the sign-in pages (design/decisions.md #69)
  const firstAct = DESIGN_REVIEW && !signedIn
    ? <><Button variant="next" href="/auth/signup">Create account</Button><a className="ab-signin" href="/auth/login">Sign in</a></>
    : explorer ? <Button variant="next" href="/join">Start joining</Button> : null

  // Chapters, each only when the Blueprint has something for it
  const [whyQuote, whyRest] = headline(s('purpose'), 320)
  const [storyTitle, storyText] = headline(s('dream_origin') ?? s('why_personal'))
  const [landTitle, landText] = headline(s('location_setting') ?? s('eco_assessment'))
  const systems = ([
    ['sprout', 'Food', s('food_systems'), s('c_food_note')], [DESIGN_REVIEW ? 'drop' : 'globe', 'Water', s('water_fresh'), s('c_water_note')], [DESIGN_REVIEW ? 'sun' : 'spark', 'Energy', s('energy_source'), s('c_energy_note')], ['building', 'Shared spaces', s('amenities'), s('c_buildings_note')],
  ] as [IconName, string, string | null, string | null][]).filter(([, , t, n]) => t || n)
  // Day to day on the land (the Blueprint's checklist notes): getting here, internet, waste
  const practical = ([
    ['pin', 'Getting here', s('c_roads_note')], ['laptop', 'Internet and work', s('c_connectivity_note')], ['trash', 'Waste', s('c_waste_note')], ['alert', 'When the weather turns', s('climate_emergencies')],
  ] as [IconName, string, string | null][]).filter(([, , t]) => t)
  // How we live together, in practice (the agreements checklist notes)
  const together = ([
    ['calendar', 'How we meet', s('a_meeting_note')], ['chat', 'How we talk', s('a_communication_note')], ['scale', 'How we decide, day to day', s('a_decision_note')], ['handshake', 'When we disagree', s('a_conflict_note')],
  ] as [IconName, string, string | null][]).filter(([, , t]) => t)
  const staying = ([
    ['Before you join', s('a_membership_note')], ['Money', s('a_money_note')], ['When someone leaves', s('a_offboarding_note')],
  ] as [string, string | null][]).filter(([, t]) => t)
  const dayItems = items(s('daily_rhythms'))
  const day = rhythm(s('daily_rhythms'))
  const rituals = items(s('rituals'))
  const valueItems: [string, string | null][] = values?.length ? values.map(v => [v.title, v.description] as [string, string | null]) : items(s('values')).map(titled)
  // The Blueprint's values answer, shown in full when it isn't the list itself
  const valuesText = values?.length || !items(s('values')).length ? s('values') : null
  const decide = ([['How we govern', s('governance_model')], ['How decisions are made', s('decision_method')], ['When we disagree', s('conflict_process')], ['What we decide together', s('scope')]] as [string, string | null][]).filter(([, t]) => t)
  const ways = ([['Living here', s('resident_finances')], ['Buying in', s('real_estate_model')], ['What you give and get', s('value_exchange')]] as [string, string | null][]).filter(([, t]) => t)
  const joinSteps = items(s('onboarding')).map(titled)
  const going = ([['Next three years', s('goals_3yr')], ['Five and ten years', s('goals_5_10yr')], ['What we want to become', s('next_horizon')]] as [string, string | null][]).filter(([, t]) => t)
  const circleName = new Map(circles.map(c => [c.slug, c.name]))
  const people = [
    ...Object.entries(directory.leads ?? {}).flatMap(([c, ps]) => (ps ?? []).map(p => ({ ...p, role: `Lead · ${circleName.get(c) ?? c}` }))),
    ...(directory.admins ?? []).map(p => ({ ...p, role: 'Admin' })),
  ].filter((p, i, all) => all.findIndex(q => q.id === p.id) === i).slice(0, 9)

  // Blueprint progress (the wizard's own scoring)
  const pillarScores = computePillarScores(a)
  const readiness = computeOverallReadiness(a)
  const gates = computeGatesPassed(a)
  const pillars = FW_DATA.pillars.map(p => [p.name, Math.round((pillarScores[p.id] ?? 0) * 10) / 10] as const)

  // Every other answered field, so nothing the Blueprint holds is hidden
  const used = new Set(['purpose', 'dream_origin', 'why_personal', 'why_now', 'location_setting', 'eco_assessment', 'ecological_philosophy', 'food_systems', 'water_fresh', 'energy_source', 'amenities', 'daily_rhythms', 'rituals', 'values', 'governance_model', 'decision_method', 'conflict_process', 'scope', 'resident_finances', 'real_estate_model', 'value_exchange', 'onboarding', 'goals_3yr', 'goals_5_10yr', 'next_horizon', 'project_name', 'mission_statement', 'vision_statement', 'why_world', 'ideal_archetypes', 'gatherings_internal', 'community_agreements', 'climate_emergencies', ...FACTS.map(([k]) => k)])
  const rest = FW_DATA.phases.map(p => ({
    phase: p,
    steps: p.steps.map(st => ({ step: st, items: (st.fields ?? []).filter(f => !used.has(f.id) && s(f.id)).map(f => [f.label, s(f.id)!] as const) })).filter(x => x.items.length),
  })).filter(p => p.steps.length)

  // Chapters in the order a visitor asks: who you are, the place, how you work, then how to join
  const nav = ([
    ['why', 'Why we’re here', !!(whyQuote || whyRest || s('mission_statement') || s('vision_statement') || whyFacts.length)],
    ['story', 'Our story', !!(storyTitle || storyText)], ['values', 'What we value', valueItems.length > 0 || !!valuesText],
    ['land', 'The land', !!(landTitle || landText || systems.length || practical.length || landFacts.length)], ['day', 'A day here', !!(dayItems.length || s('daily_rhythms') || rituals.length)],
    ['decide', 'How we decide', decide.length > 0 || together.length > 0], ['people', 'People', people.length > 0], ['next', 'Where we’re going', going.length > 0],
    ['live', explorer ? 'Join us' : 'Living here', !!(s('ideal_archetypes') || ways.length || staying.length || joinSteps.length || liveFacts.length)],
    ['blueprint', 'The Blueprint', true],
  ] as [string, string, boolean][]).filter(([, , on]) => on)

  return (
    <div className="v4-page v4-about">
      <header id="top" className="ab-hero" style={branding.banner_url ? { backgroundImage: `url(${branding.banner_url})` } : undefined}>
        <div className="ab-hero-in">
          {where && <span className="ab-place"><Icon name="pin" size={14} />{where}</span>}
          <h1>{name}</h1>
          {heroLine && <p>{heroLine}</p>}
          <div className="ab-hero-acts">
            {firstAct}
            <AskAboutButton name={name} />
            {canEdit && <Button variant="secondary" href="/about?edit=1" icon="pencil">Edit Blueprint</Button>}
          </div>
        </div>
      </header>

      {tiles.length > 0 && (
        // Each tile jumps to its whole answer in a chapter below (Sonia, 20 Nov)
        <AboutFacts tiles={tiles} />
      )}

      {nav.length > 1 && <AboutNav name={name} chapters={nav.map(([id, label]) => [id, label] as [string, string])} canEdit={canEdit} />}

      {(whyQuote || whyRest || s('mission_statement') || s('vision_statement') || whyFacts.length > 0) && (
        <section className="ab-why" id="why">
          <div className="v4-eyebrow">Why we’re here</div>
          {whyQuote && <blockquote>{whyQuote}</blockquote>}
          <Short text={whyRest} max={320} lead />
          <Topics tone="yellow" topics={[
            ...whyFacts,
            { icon: 'compass', title: 'The question we’re asking', text: s('why_world') },
            { icon: 'target', title: 'Our mission', text: s('mission_statement') },
            { icon: 'eye', title: 'Our vision', text: s('vision_statement') },
          ]} />
        </section>
      )}

      {(storyTitle || storyText) && (
        <Chapter id="story" eyebrow="Our story" title={storyTitle ?? 'How it started'} lead={storyText} photo={photoOf('main-fireplace', 'honey-house')}>
          <Topics tone="red" topics={[
            { icon: 'heart', title: 'Why it matters to us', text: s('dream_origin') ? s('why_personal') : null },
            { icon: 'clock', title: 'Why now', text: s('why_now') },
          ]} />
        </Chapter>
      )}

      {(valueItems.length > 0 || valuesText) && (
        <Chapter id="values" eyebrow="What we value" title={valueItems.length >= 2 && valueItems.length <= 6 ? `${['', '', 'Two things', 'Three things', 'Four things', 'Five things', 'Six things'][valueItems.length]} we hold to` : 'What we hold to'} lead={valuesText}>
          {valueItems.length > 0 && <ol className="ab-vals">
            {valueItems.map(([t, d], i) => <li key={t + i} className="ab-val"><span className="n">{i + 1}</span><div><b>{t}</b>{d && <p className="v4-prose">{d}</p>}</div></li>)}
          </ol>}
          {signer && values && <SignValues userId={signer.userId} valueIds={values.map(v => v.id as string)} initialSigned={signer.signed} />}
          <Topics tone="yellow" topics={[{ icon: 'handshake', title: 'Our community agreements', text: s('community_agreements') }]} />
        </Chapter>
      )}

      {(landTitle || landText || systems.length > 0 || practical.length > 0 || landFacts.length > 0) && (
        <Chapter id="land" eyebrow="The land" title={landTitle ?? 'Where we live'} lead={landText}
          photo={photoOf('waterfall-1') ?? (mapUrl ? { url: mapUrl, caption: 'The map of the land', href: '/map' } : null)}
          side={mapUrl && photoOf('waterfall-1') ? <p className="ab-links"><Button variant="quiet" href="/map" icon="map">Open the map</Button></p> : null}>
          <Topics title="The place" tone="green" topics={[
            ...landFacts,
            { icon: DESIGN_REVIEW ? 'map' : 'search', title: 'What the land is like', text: s('location_setting') ? s('eco_assessment') : null },
            { icon: 'sprout', title: 'How we care for it', text: s('ecological_philosophy') },
          ]} />
          <Topics title="What sustains us" tone="green" topics={systems.map(([icon, title, text, note]) => ({ icon, title, text, note }))} />
          <Topics title="Day to day" tone="blue" topics={practical.map(([icon, title, text]) => ({ icon, title, text }))} />
        </Chapter>
      )}

      {(dayItems.length > 0 || s('daily_rhythms') || rituals.length > 0) && (
        <Chapter id="day" eyebrow="A day here" title="A weekday has a rhythm" lead={day.steps.length ? day.rest : null} photo={photoOf('honey-house', 'movement-house')}
          side={(rituals.length > 0 && rituals.every(r => r.length <= 40)) ? <div className="v4-tags ab-ch__tags">{rituals.map(r => <Tag key={r} icon="star">{r}</Tag>)}</div> : null}>
          {day.steps.length
            ? <ol className="ab-day">{day.steps.map(([time, what], i) => <li key={i}><span className="t">{time ?? ''}</span><b>{what}</b></li>)}</ol>
            : dayItems.length > 0 && dayItems.every(l => TIME.test(l))
              ? <ol className="ab-day">{dayItems.map((line, i) => { const m = line.match(TIME)!; return <li key={i}><span className="t">{m[1]}</span><b>{m[2]}</b></li> })}</ol>
              : <ul className="ab-day ab-day--plain">{(dayItems.length ? dayItems : [s('daily_rhythms')!]).map((line, i) => <li key={i}><p className="v4-prose">{line}</p></li>)}</ul>}
          <Topics tone="violet" topics={[
            { icon: 'star', title: 'Rituals', text: rituals.length && rituals.every(r => r.length <= 40) ? null : s('rituals') },
            { icon: 'users', title: 'Gatherings', text: s('gatherings_internal') },
          ]} />
          <p className="ab-links"><Button variant="quiet" href="/calendar">Open Calendar →</Button></p>
        </Chapter>
      )}

      {(decide.length > 0 || together.length > 0) && (
        <Chapter id="decide" eyebrow="How we decide" title="Decisions sit with the people they affect" photo={photoOf('movement-house')}
          side={<p className="ab-links"><Button variant="quiet" href="/circles">Open Circles →</Button><Button variant="quiet" href="/governance">Open Governance →</Button></p>}>
          <Topics title="How it’s set up" tone="violet" topics={decide.map(([title, text], i) => ({ icon: (['circles', 'scale', 'handshake', 'globe'] as IconName[])[i] ?? 'circles', title, text }))} />
          <Topics title="In practice" tone="violet" topics={together.map(([icon, title, text]) => ({ icon, title, text }))} />
        </Chapter>
      )}

      {people.length > 0 && (
        <section className="ab-sec" id="people">
          <div className="v4-eyebrow">People</div>
          <h2 className="ab-h">Who carries the culture</h2>
          <div className="ab-three">
            {people.map(p => (
              <Card key={p.id} href={p.username ? `/u/${p.username}` : undefined}>
                <div className="v4-card-head" style={{ margin: 0 }}><span className="v4-avatar v4-avatar--md">{p.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()}</span><div><b>{p.name}</b><small>{p.role}</small></div></div>
              </Card>
            ))}
          </div>
          <p className="ab-links"><Button variant="quiet" href="/members">See all members →</Button></p>
        </section>
      )}

      {going.length > 0 && (
        <Chapter id="next" eyebrow="Where we’re going" title="Still evolving">
          <Topics tone="blue" topics={going.map(([title, text], i) => ({ icon: (['flag', 'compass', 'spark'] as IconName[])[i] ?? 'flag', title, text }))} />
        </Chapter>
      )}

      {(s('ideal_archetypes') || ways.length > 0 || staying.length > 0 || joinSteps.length > 0 || liveFacts.length > 0) && (
        <Chapter id="live" eyebrow="Living here" title="Who we’re looking for, and how to stay" lead={s('ideal_archetypes')} photo={photoOf('private-rooms-and-dorms', 'bamboo-house')}
          side={firstAct ? <div className="v4-mt">{firstAct}</div> : null}>
          <Topics title="Staying here" tone="green" topics={[
            ...liveFacts,
            ...ways.map(([title, text], i) => ({ icon: (['home', 'building', 'gift'] as IconName[])[i] ?? 'home', title, text })),
            ...staying.map(([title, text], i) => ({ icon: (['check', 'badge', 'logout'] as IconName[])[i] ?? 'check', title, text })),
          ]} />
          {joinSteps.length > 0 && (
            <div className="ab-topics">
              <h3 className="ab-topics__h">How joining works</h3>
              <ol className="ab-steps">{joinSteps.map(([t, d], i) => <li key={i}><span>{i + 1}</span><b>{t}</b>{d && <small>{d}</small>}</li>)}</ol>
            </div>
          )}
        </Chapter>
      )}

      <section className="ab-sec" id="blueprint">
        <div className="ab-split ab-split--even">
          <Card>
            <div className="v4-sec" style={{ marginTop: 0 }}><h2>Blueprint progress</h2><a href="/about?edit=1">{canEdit ? 'Open the steps →' : 'See the plan →'}</a></div>
            <div className="ab-score"><b>{readiness.toFixed(1)}</b><span>/ 10 ready · {gates} of 4 gates</span></div>
            <div className="ab-bars">{pillars.map(([t, v]) => <div key={t}><div className="ab-bars__row"><span>{t}</span><span>{v}/10</span></div><div className="ab-bar"><i style={{ width: `${Math.min(100, v * 10)}%` }} /></div></div>)}</div>
          </Card>
          {rest.length > 0 && (
            <Card>
              <div className="v4-sec" style={{ marginTop: 0 }}><h2>The whole Blueprint</h2></div>
              {rest.map(({ phase, steps }) => (
                <details key={phase.id} className="v4-fold">
                  <summary><Tag>{phase.name}</Tag> {phase.subtitle}</summary>
                  {steps.map(({ step, items: its }) => (
                    <div key={step.id} className="v4-fold__step"><h3>{step.title}</h3>{its.map(([l, t]) => <div key={l} className="v4-answer"><h4>{l}</h4><p className="v4-prose">{t}</p></div>)}</div>
                  ))}
                </details>
              ))}
            </Card>
          )}
        </div>
      </section>
    </div>
  )
}
