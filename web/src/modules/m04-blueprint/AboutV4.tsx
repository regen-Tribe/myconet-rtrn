import type { SupabaseClient } from '@supabase/supabase-js'
import { Button, Card, Icon, IconTile, Tag, type IconName } from '@/core/components/v4'
import { loadBranding } from '@/core/lib/branding-server'
import { roleAtLeast } from '@/core/lib/roles'
import { fetchCircleDirectory } from '@/core/lib/ops-permissions'
import { loadCircleRows } from '@/core/lib/circles-server'
import { FW_DATA } from './lib/wizard-data'
import { computeGatesPassed, computeOverallReadiness, computePillarScores } from './lib/blueprint-compute'
import AskAboutButton from './AskAboutButton'

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
  const lines = text.split(/\n+|(?:^|\s)[•·▪]\s|;\s+/).map(l => l.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, '').trim()).filter(l => l.length > 1)
  return lines.length > 1 ? lines : []
}

/** "Care — we look after…" or "Care: we look after…" → [Care, we look after…]. */
function titled(line: string): [string, string | null] {
  const m = line.match(/^(.{2,48}?)\s*(?:[:—–]|\s-\s)\s*(.+)$/)
  return m ? [m[1], m[2]] : [line, null]
}

const NUM: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20', thirty: '30', forty: '40', fifty: '50', hundred: '100' }

/** A fact for the strip, as short as the prototype's ("14 hectares", "30 people at a time"): the first clause
 *  without its lead-in ("Our property is…", "We are in…"), number words as digits. */
function fact(text: string | null): string | null {
  if (!text) return null
  const t = text.replace(/\s+/g, ' ').trim()
  let clause = t.split(/[,;.(]| — | – /)[0].trim()
  clause = clause.replace(/^(?:our [\w-]+ (?:is|are)|we (?:are|currently have|have)(?: in| a| an)?|about|it is|it's|there (?:is|are))\s+/i, '')
  clause = clause.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|hundred)\b/gi, w => NUM[w.toLowerCase()])
  // Long clauses lose their place ("… in the hills of La Cabanga") and, when they count things, their second half
  if (clause.length > 36) clause = clause.replace(/\s+in (?:the |a )?[\p{L} ,'-]+$/u, '')
  if (clause.length > 30 && /\d/.test(clause) && / and /.test(clause)) clause = clause.slice(0, clause.indexOf(' and '))
  clause = clause.replace(/^\p{Ll}/u, c => c.toUpperCase())
  return clause.length > 44 ? clause.slice(0, clause.lastIndexOf(' ', 42)) + '…' : clause
}

/** "…in La Cabanga, Costa Rica, between…" → "La Cabanga, Costa Rica" (the place tag on the photo). */
function place(...texts: (string | null)[]): string | null {
  for (const t of texts) {
    const m = t?.match(/\bin ((?:[A-Z][\p{L}'-]+ ?){1,3}(?:, ?(?:[A-Z][\p{L}'-]+ ?){1,3})?)/u)
    if (m) return m[1].trim().replace(/,$/, '')
  }
  return null
}

const TIME = /^(\d{1,2}[:.]\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))\s*[–—-]?\s*(.*)$/i

const FACTS: [string, string][] = [
  ['land_size', 'The land'], ['community_size', 'People'], ['planned_homes', 'Homes'], ['climate', 'Climate'], ['project_country', 'Where'], ['community_type', 'What we are'],
]

function splitName(projectName: string | null, fallback: string) {
  if (!projectName) return { name: fallback, tagline: null as string | null }
  const m = projectName.match(/^(.{2,40}?)\s+[—–-]\s+([\s\S]+)$/)
  if (m) return { name: m[1].replace(/\s+Community$/i, '').trim(), tagline: m[2].trim().replace(/^\p{Ll}/u, c => c.toUpperCase()) }
  return projectName.length <= 40 ? { name: projectName, tagline: null } : { name: fallback, tagline: projectName }
}

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string | null; children: React.ReactNode }) {
  return (
    <section className="ab-sec" id={id}>
      <div className="v4-eyebrow">{eyebrow}</div>
      {title && <h2 className="ab-h">{title}</h2>}
      {children}
    </section>
  )
}

const Prose = ({ text, lead }: { text: string | null; lead?: boolean }) => text ? <p className={`v4-prose${lead ? ' ab-lead' : ''}`}>{text}</p> : null

/** Long answers show their first two sentences; the rest opens with "Read more" (nothing is cut). */
function Short({ text, max = 260 }: { text: string | null; max?: number }) {
  if (!text) return null
  const t = text.trim()
  if (t.length <= max) return <p className="v4-prose">{t}</p>
  const parts = t.split(/(?<=[.!?])\s+/)
  let head = ''
  for (const p of parts) { if ((head + ' ' + p).trim().length > max && head) break; head = (head + ' ' + p).trim() }
  if (!head || head.length >= t.length) head = t.slice(0, t.lastIndexOf(' ', max)) + '…'
  return (
    <details className="ab-more">
      <summary><span className="v4-prose">{head}</span><span className="ab-more__btn">Read more</span></summary>
      <p className="v4-prose">{t.slice(head.replace(/…$/, '').length).trim()}</p>
    </details>
  )
}

export default async function AboutV4({ supabase, communityName, role, canEdit }: {
  supabase: SupabaseClient; communityName: string; role: string; canEdit: boolean
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
  const s = (k: string) => str(a[k])
  const { name, tagline } = splitName(s('project_name'), communityName)
  const where = place(s('project_name'), s('project_country'), s('location_setting'))
  const facts = FACTS.map(([k, label]) => [label, fact(s(k)), s(k)] as const).filter(([, v]) => v)
  const explorer = !roleAtLeast(role, 'joining')

  // Chapters, each only when the Blueprint has something for it
  const [whyQuote, whyRest] = headline(s('purpose'), 220)
  const [storyTitle, storyText] = headline(s('dream_origin') ?? s('why_personal'))
  const [landTitle, landText] = headline(s('location_setting') ?? s('eco_assessment'))
  const systems = ([
    ['sprout', 'Food', s('food_systems'), s('c_food_note')], ['globe', 'Water', s('water_fresh'), s('c_water_note')], ['spark', 'Energy', s('energy_source'), s('c_energy_note')], ['building', 'Shared spaces', s('amenities'), s('c_buildings_note')],
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

  const nav = ([
    ['story', 'Our story', !!(storyTitle || storyText)], ['land', 'The land', !!(landTitle || landText || systems.length || practical.length)],
    ['day', 'A day here', !!(dayItems.length || s('daily_rhythms') || rituals.length)], ['values', 'What we value', valueItems.length > 0 || !!valuesText],
    ['decide', 'How we decide', decide.length > 0 || together.length > 0], ['live', 'Living here', !!(s('ideal_archetypes') || ways.length || staying.length || joinSteps.length)],
    ['people', 'People', people.length > 0], ['next', 'Where we’re going', going.length > 0],
  ] as [string, string, boolean][]).filter(([, , on]) => on)

  return (
    <div className="v4-page v4-about">
      <header className="ab-hero" style={branding.banner_url ? { backgroundImage: `url(${branding.banner_url})` } : undefined}>
        <div className="ab-hero-in">
          {where && <span className="ab-place"><Icon name="pin" size={14} />{where}</span>}
          <h1>{name}</h1>
          {tagline && <p>{tagline}</p>}
          <div className="ab-hero-acts">
            {explorer && <Button variant="next" href="/join">Start joining</Button>}
            <AskAboutButton name={name} />
            {canEdit && <Button variant="secondary" href="/about?edit=1" icon="pencil">Edit Blueprint</Button>}
          </div>
        </div>
      </header>

      {facts.length > 0 && (
        // Label on top, the short fact, and the whole answer when you open the tile (Sonia, 20 Nov)
        <div className="ab-facts">{facts.map(([label, v, full]) => (
          <details key={label} className="ab-fact">
            <summary><span>{label}</span><b>{v}</b><i className="ab-fact__more">More</i></summary>
            <p className="v4-prose">{full}</p>
          </details>
        ))}</div>
      )}

      {nav.length > 1 && (
        <nav className="v4-chiprow ab-nav" aria-label="Chapters">
          {nav.map(([id, label]) => <a key={id} href={`#${id}`} className="v4-chip">{label}</a>)}
        </nav>
      )}

      {(whyQuote || whyRest || s('mission_statement') || s('vision_statement')) && (
        <section className="ab-why">
          <div className="v4-eyebrow">Why we’re here</div>
          {whyQuote && <blockquote>{whyQuote}</blockquote>}
          <Short text={whyRest} max={320} />
          {s('why_world') && <Short text={s('why_world')} max={320} />}
          {(s('mission_statement') || s('vision_statement')) && (
            <div className="ab-two">
              {s('mission_statement') && <Card><div className="v4-eyebrow">Mission</div><Short text={s('mission_statement')} max={300} /></Card>}
              {s('vision_statement') && <Card><div className="v4-eyebrow">Vision</div><Short text={s('vision_statement')} max={300} /></Card>}
            </div>
          )}
        </section>
      )}

      {(storyTitle || storyText) && (
        <Section id="story" eyebrow="Our story" title={storyTitle}>
          <div>
            <div><Prose text={storyText} lead />{s('dream_origin') && <Short text={s('why_personal')} max={320} />}<Short text={s('why_now')} max={360} /></div>

          </div>
        </Section>
      )}

      {(landTitle || landText || systems.length > 0 || practical.length > 0) && (
        <Section id="land" eyebrow="The land" title={landTitle}>
          <div className={mapUrl ? 'ab-split' : undefined}>
            <div><Prose text={landText} lead />{s('location_setting') && <Short text={s('eco_assessment')} max={320} />}<Short text={s('ecological_philosophy')} max={360} /></div>
            {mapUrl && <a href="/amenities" className="ab-photo ab-photo--map" style={{ backgroundImage: `url(${mapUrl})` }} aria-label="Open the map of the land" />}
          </div>
          {practical.length > 0 && (
            <>
              <h3 className="ab-h3">Day to day</h3>
              <div className="ab-two">{practical.map(([icon, t, d]) => <Card key={t}><div className="v4-card-head"><IconTile name={icon} tone="blue" /><div><b>{t}</b></div></div><Short text={d} max={220} /></Card>)}</div>
            </>
          )}
          {systems.length > 0 && (
            <div className="ab-two">
              {systems.map(([icon, t, d, n]) => (
                <Card key={t}><div className="v4-card-head"><IconTile name={icon} tone="green" /><div><b>{t}</b></div></div><Short text={d} />{n && <div className="ab-note"><Short text={n} max={200} /></div>}</Card>
              ))}
            </div>
          )}
        </Section>
      )}

      {(dayItems.length > 0 || s('daily_rhythms') || rituals.length > 0) && (
        <Section id="day" eyebrow="A day here" title="A weekday has a rhythm">
          <div className="ab-split">
            {dayItems.length > 0 && dayItems.every(l => TIME.test(l))
              ? <ol className="ab-day">{dayItems.map((line, i) => { const m = line.match(TIME)!; return <li key={i}><span className="t">{m[1]}</span><b>{m[2]}</b></li> })}</ol>
              : <ul className="ab-day ab-day--plain">{(dayItems.length ? dayItems : [s('daily_rhythms')!]).map((line, i) => <li key={i}><p className="v4-prose">{line}</p></li>)}</ul>}
            <div className="ab-stack">
              {(rituals.length > 0 || s('rituals')) && <Card><div className="v4-eyebrow">Rituals</div>{rituals.length && rituals.every(r => r.length <= 40) ? <div className="v4-tags">{rituals.map(r => <Tag key={r} icon="star">{r}</Tag>)}</div> : rituals.length ? <ul className="ab-list">{rituals.map(r => <li key={r}>{r}</li>)}</ul> : <Short text={s('rituals')} />}</Card>}
              {s('gatherings_internal') && <Card><div className="v4-eyebrow">Gatherings</div><Short text={s('gatherings_internal')} /><p className="v4-mt"><Button variant="quiet" href="/calendar">Open Calendar →</Button></p></Card>}
            </div>
          </div>
        </Section>
      )}

      {(valueItems.length > 0 || valuesText) && (
        <Section id="values" eyebrow="What we value" title={valueItems.length >= 2 && valueItems.length <= 6 ? `${['', '', 'Two things', 'Three things', 'Four things', 'Five things', 'Six things'][valueItems.length]} we hold to` : 'What we hold to'}>
          {valuesText && <Short text={valuesText} max={420} />}
          {valueItems.length > 0 && <div className="ab-two v4-mt">
            {valueItems.map(([t, d], i) => <div key={t + i} className="ab-val"><span className="n">{i + 1}</span><b>{t}</b>{d && <p className="v4-prose">{d}</p>}</div>)}
          </div>}
          {s('community_agreements') && <Card className="ab-banner"><IconTile name="handshake" tone="yellow" /><div><b>Our community agreements</b><Prose text={s('community_agreements')} /></div></Card>}
        </Section>
      )}

      {(decide.length > 0 || together.length > 0) && (
        <Section id="decide" eyebrow="How we decide" title="Decisions sit with the people they affect">
          <div className="ab-two">{decide.map(([t, d]) => <Card key={t}><b className="ab-cardtitle">{t}</b><Short text={d} /></Card>)}</div>
          {together.length > 0 && (
            <>
              <h3 className="ab-h3">In practice</h3>
              <div className="ab-two">{together.map(([icon, t, d]) => <Card key={t}><div className="v4-card-head"><IconTile name={icon} tone="violet" /><div><b>{t}</b></div></div><Short text={d} max={220} /></Card>)}</div>
            </>
          )}
          <p className="ab-links"><Button variant="quiet" href="/circles">Open Circles →</Button><Button variant="quiet" href="/governance">Open Governance →</Button></p>
        </Section>
      )}

      {(s('ideal_archetypes') || ways.length > 0 || staying.length > 0 || joinSteps.length > 0) && (
        <Section id="live" eyebrow="Living here" title="Who we’re looking for, and how to stay">
          <Prose text={s('ideal_archetypes')} lead />
          {ways.length > 0 && <div className="ab-ways">{ways.map(([t, d]) => <Card key={t}><small className="v4-eyebrow">{t}</small><Short text={d} /></Card>)}</div>}
          {staying.length > 0 && <div className="ab-ways v4-mt">{staying.map(([t, d]) => <Card key={t}><small className="v4-eyebrow">{t}</small><Short text={d} max={220} /></Card>)}</div>}
          {joinSteps.length > 0 && (
            <>
              <h3 className="ab-h3">How joining works</h3>
              <ol className="ab-steps">{joinSteps.map(([t, d], i) => <li key={i}><span>{i + 1}</span><b>{t}</b>{d && <small>{d}</small>}</li>)}</ol>
            </>
          )}
          {explorer && <div className="v4-mt"><Button variant="next" href="/join">Start joining</Button></div>}
        </Section>
      )}

      {people.length > 0 && (
        <Section id="people" eyebrow="People" title="Who carries the culture">
          <div className="ab-three">
            {people.map(p => (
              <Card key={p.id} href={p.username ? `/u/${p.username}` : undefined}>
                <div className="v4-card-head" style={{ margin: 0 }}><span className="v4-avatar v4-avatar--md">{p.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()}</span><div><b>{p.name}</b><small>{p.role}</small></div></div>
              </Card>
            ))}
          </div>
          <p className="ab-links"><Button variant="quiet" href="/members">See all members →</Button></p>
        </Section>
      )}

      {going.length > 0 && (
        <Section id="next" eyebrow="Where we’re going" title="Still evolving">
          <div className="ab-three">{going.map(([t, d]) => <Card key={t}><div className="v4-eyebrow">{t}</div><Short text={d} /></Card>)}</div>
        </Section>
      )}

      <section className="ab-sec">
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
