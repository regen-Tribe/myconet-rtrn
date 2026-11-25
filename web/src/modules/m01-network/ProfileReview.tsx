'use client'
/**
 * A person's profile with the design review on (DESIGN_REVIEW; decisions #60–#64).
 *
 * What matters first on a phone sits in the first third: the photo (or an initial on grey), the name as the
 * page's own title (the top bar says ‹ Members, #41), the headline, their circles as seals and who they are
 * here. Then seven tabs, the same as Edit profile and Start joining's questions (Sonia, 25 Nov; decision #91,
 * replacing #60's "no tabs"): About · Skills and interests · Offers and requests · Personality and signs · Growth ·
 * Travel · Links. Empty tabs are hidden (#9), except on your own profile, where each says what to add.
 *
 * The classic and plain-v4 profile stay in UserProfileClient.
 */
import Link from 'next/link'
import { useState, useSyncExternalStore } from 'react'
import { Button, Icon, NextStep, Result, Tag } from '@/core/components/v4'
import { CircleSeal } from '@/core/components/v4/CircleSeal'
import { useCircles } from '@/core/components/CirclesProvider'
import { socialLinks } from '@/core/lib/public-profile'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import { MyCircles } from '@/modules/m17-org/MyCircles'
import { factsFromRows, missingWords, profileMissing } from './lib/profile-missing'
import { valueList } from '@/core/lib/skills-interests'
import './profile-review.css'

type Ocean = { openness?: number; conscientiousness?: number; extraversion?: number; agreeableness?: number; neuroticism?: number }

export interface ReviewProfileProps {
  profile: {
    id: string; username: string; first_name: string | null; last_name: string | null
    headline: string | null; country?: string | null; city?: string | null
    avatar_url: string | null; user_types?: string[] | null
    public_bio?: string | null; website_url?: string | null
    instagram?: string | null; linkedin?: string | null; twitter?: string | null
  }
  bio: {
    values_principles: string | null; what_creating: string | null; goals: string | null
    skills: string[] | null; interests: string[] | null
    personality_details: { myersBriggs?: string | null; ocean?: Ocean | null } | null
    archetypes: { astrology?: { sun?: string | null; moon?: string | null; rising?: string | null } | null; humanDesign?: string | null; geneKey?: string | null; mayan?: string | null } | null
    places_traveling: Array<{ location: string; startDate?: string; endDate?: string; notes?: string }> | null
  } | null
  offers: { id: string; category: string | null; title: string; description: string | null; compensation_model: string | null; price: string | null }[]
  requests: { id: string; category: string | null; request_text: string; urgency: string | null }[]
  isOwn: boolean
  signedIn: boolean
  /** False for an explorer (#71): the public card and offers, then one line on what opens at joining */
  full?: boolean
  growth: { fears: string | null; traumas: string | null; visibility: string } | null
  match?: { score: number; reasons: string[] } | null
  circles: { slug: string; lead: boolean }[]
}

const OCEAN: { key: keyof Ocean; label: string }[] = [
  { key: 'openness', label: 'Openness' },
  { key: 'conscientiousness', label: 'Conscientiousness' },
  { key: 'extraversion', label: 'Extraversion' },
  { key: 'agreeableness', label: 'Agreeableness' },
  { key: 'neuroticism', label: 'Neuroticism' },
]

const GROWTH_AUDIENCE: Record<string, string> = {
  anyone: 'Anyone', explorers: 'Everyone signed up', joining: 'Joining members and up', full_members: 'Members', only_me: 'Only you',
}

const LINK_ICON = { website: 'globe', instagram: 'at', linkedin: 'at', twitter: 'at' } as const

/** "Community Member", "Community Member - Living In" → one tag, "Community Member · living in" */
function whoTags(types: string[]): string[] {
  const subs = types.filter(t => t.includes(' - '))
  const parents = new Set(subs.map(t => t.split(' - ')[0]))
  return types
    .filter(t => !parents.has(t))
    .map(t => t.includes(' - ') ? `${t.split(' - ')[0]} · ${t.split(' - ').slice(1).join(' - ').toLowerCase()}` : t)
}

function monthYear(d?: string) {
  return d ? new Date(d).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : ''
}

export default function ProfileReview({ profile: p, bio, offers, requests, isOwn, signedIn, full = true, growth, match, circles }: ReviewProfileProps) {
  // Before joining (#71): the public card and what they offer; city, matches, circles and the rest open at joining
  const limited = signedIn && !isOwn && !full
  const circleSet = useCircles()
  const displayName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username
  const initial = displayName[0]?.toUpperCase() ?? '?'
  const location = [p.city, p.country].filter(Boolean).join(', ')
  const links = socialLinks(p)
  const theirCircles = circles.filter(c => circleSet.has(c.slug)).sort((a, b) => Number(b.lead) - Number(a.lead))
  const skills = bio?.skills ?? []
  const interests = bio?.interests ?? []
  const pd = bio?.personality_details
  const arc = bio?.archetypes
  const ocean = pd?.ocean && Object.values(pd.ocean).some(v => v != null) ? pd.ocean : null
  const astro = [['Sun', arc?.astrology?.sun], ['Moon', arc?.astrology?.moon], ['Rising', arc?.astrology?.rising]].filter(([, v]) => !!v) as [string, string][]
  const otherArc = [['Human Design', arc?.humanDesign], ['Gene Key', arc?.geneKey], ['Mayan sign', arc?.mayan]].filter(([, v]) => !!v) as [string, string][]
  const travels = (bio?.places_traveling ?? []).filter(t => t.location?.trim())
  const values = valueList(bio?.values_principles)
  const done = isOwn ? profileMissing(factsFromRows(p, bio, offers.length, requests.length)) : null

  const head = (
    <header className="pfr-head">
      {p.avatar_url
        ? <img src={p.avatar_url} alt="" className="pfr-av" />
        : <span className="pfr-av pfr-av--initial" aria-hidden>{initial}</span>}
      <div className="pfr-who">
        <h1 className="v4-ph__title pfr-name">{displayName}</h1>
        {p.headline && <p className="pfr-headline">{p.headline}</p>}
        <p className="pfr-meta">
          {location && !limited && <span><Icon name="pin" size={16} />{location}</span>}
          {!isOwn && match && !limited && <span><Icon name="spark" size={16} />{match.score}% match{match.reasons[0] ? ` · ${match.reasons[0]}` : ''}</span>}
        </p>
      </div>
      {isOwn && <div className="pfr-acts"><Button variant="secondary" icon="pencil" href="/profile/edit">Edit profile</Button></div>}
    </header>
  )

  const tags = (theirCircles.length > 0 || (p.user_types ?? []).length > 0) && (
    <div className="v4-tags pfr-tags">
      {theirCircles.map(c => (
        <Link key={c.slug} href={`/circles?c=${encodeURIComponent(c.slug)}`} className="v4-tag v4-tag--seal pfr-ctag no-min-height">
          <CircleSeal slug={c.slug} size={16} />{circleSet.meta(c.slug).label}{c.lead ? <span className="pfr-ctag__role">circle lead</span> : null}
        </Link>
      ))}
      {whoTags(p.user_types ?? []).map(t => <Tag key={t}>{t}</Tag>)}
    </div>
  )

  // Your own profile: the one next step, with what's still missing (decision #11, #60)
  const next = isOwn && done && done.missing.length > 0 && (
    <NextStep eyebrow="Your next step" title={`Finish your profile · ${done.pct}%`}
      text={`Still to add: ${missingWords(done.missing)}`} href={`/profile/edit?add=${done.missing[0].key}`} />
  )

  if (!signedIn) {
    return (
      <div className="v4-page v4-page--wide pfr">
        {head}
        {p.public_bio?.trim() && <section className="v4-card pfr-card"><p className="pfr-prose">{p.public_bio}</p></section>}
        {links.length > 0 && <Links links={links} />}
        <div className="pfr-locked">
          <Icon name="lock" size={20} />
          <span>Sign in to see their offers, requests and circles.</span>
          <div className="pfr-locked__acts">
            <Button href="/auth/login?mode=register">Create account</Button>
            <Button variant="secondary" href="/auth/login">Sign in</Button>
          </div>
        </div>
      </div>
    )
  }

  const offersBlock = (offers.length > 0 || isOwn) && (
    <section className="pfr-sec" aria-labelledby="pfr-offers">
      <div className="v4-sec"><h2 id="pfr-offers">Offers</h2>{isOwn && <Link href="/profile/edit?add=offer">+ Add offer</Link>}</div>
      {offers.length > 0 && (
        <div className="v4-list">
          {offers.map(o => (
            <div key={o.id} className="v4-row pfr-row">
              <span className="v4-row__lead"><Icon name="gift" size={20} /></span>
              <span className="v4-row__main">
                <b>{o.title}</b>
                {[o.category, o.compensation_model && o.compensation_model !== 'Other' ? o.compensation_model : null, o.price].filter(Boolean).length > 0 &&
                  <small>{[o.category, o.compensation_model && o.compensation_model !== 'Other' ? o.compensation_model : null, o.price].filter(Boolean).join(' · ')}</small>}
                {o.description && <span className="pfr-row__text">{o.description}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )

  if (limited) {
    return (
      <div className="v4-page v4-page--wide pfr">
        {head}
        {p.public_bio?.trim() && <section className="v4-card pfr-card"><p className="pfr-prose">{p.public_bio}</p></section>}
        {links.length > 0 && <Links links={links} />}
        {offersBlock}
        <div className="pfr-locked">
          <Icon name="lock" size={20} />
          <span>More about {p.first_name || 'this person'} opens once you’ve joined {COMMUNITY_NAME}.</span>
          <div className="pfr-locked__acts"><Button href="/join">Start joining</Button></div>
        </div>
      </div>
    )
  }

  const requestsBlock = (requests.length > 0 || isOwn) && (
    <section className="pfr-sec" aria-labelledby="pfr-requests">
      <div className="v4-sec"><h2 id="pfr-requests">Requests</h2>{isOwn && <Link href="/profile/edit?add=request">+ Add request</Link>}</div>
      {requests.length > 0 && (
        <div className="v4-list">
          {requests.map(r => (
            <div key={r.id} className="v4-row pfr-row">
              <span className="v4-row__lead"><Icon name="hand" size={20} /></span>
              <span className="v4-row__main">
                <b className="pfr-row__wrap">{r.request_text}</b>
                {r.category && <small>{r.category}</small>}
              </span>
              {r.urgency === 'urgent' && <span className="v4-row__trail"><Result tone="attention">Urgent</Result></span>}
              {r.urgency === 'high' && <span className="v4-row__trail"><Result tone="neutral" icon="clock">Soon</Result></span>}
            </div>
          ))}
        </div>
      )}
    </section>
  )

  const hasPersonality = !!(pd?.myersBriggs || ocean || astro.length > 0 || otherArc.length > 0)
  const hasGrowth = !!(bio?.goals?.trim() || growth?.fears || growth?.traumas)
  const tabs: { key: TabKey; label: string; has: boolean; add?: { href: string; label: string } }[] = [
    { key: 'about', label: 'About', has: !!(p.public_bio?.trim() || bio?.values_principles?.trim() || bio?.what_creating?.trim()), add: { href: '/profile/edit?tab=about', label: 'Say what you’re up to' } },
    { key: 'skills', label: 'Skills and interests', has: skills.length + interests.length > 0, add: { href: '/profile/edit?add=skills', label: 'Pick what you’re good at' } },
    { key: 'offers', label: 'Offers and requests', has: offers.length + requests.length > 0, add: { href: '/profile/edit?add=offer', label: 'Add an offer' } },
    { key: 'personality', label: 'Personality and signs', has: hasPersonality, add: { href: '/profile/edit?tab=personality', label: 'Add your type or signs' } },
    { key: 'growth', label: 'Growth', has: hasGrowth, add: { href: '/profile/edit?add=goals', label: 'Add your goals' } },
    { key: 'travel', label: 'Travel', has: travels.length > 0, add: { href: '/profile/edit?add=travel', label: 'Add a trip' } },
    { key: 'links', label: 'Links', has: links.length > 0, add: { href: '/profile/edit?tab=links', label: 'Add your links' } },
  ]
  const shown = tabs.filter(t => t.has || isOwn)

  return (
    <div className="v4-page v4-page--wide pfr">
      {head}
      {tags}
      {next}
      <div className="pfr-split">
        <div className="pfr-main">
          {shown.length > 0 && <ProfileTabs tabs={shown}>{key => {
            const t = tabs.find(x => x.key === key)!
            const empty = !t.has && t.add && (
              <div className="pfr-empty"><span>Nothing here yet.</span><Link href={t.add.href}>{t.add.label} →</Link></div>
            )
            if (key === 'about') return empty || (
              <section className="v4-card pfr-card">
                {p.public_bio?.trim() && <div className="pfr-text"><h3 className="pfr-card__title">{isOwn ? 'What I’m up to' : p.first_name ? `What ${p.first_name}’s up to` : 'What they’re up to'}</h3><p className="pfr-prose">{p.public_bio}</p></div>}
                {bio?.values_principles?.trim() && (
                  <div className="pfr-text"><h3 className="pfr-card__title">Values</h3>
                    {values ? <div className="v4-tags">{values.map(v => <Tag key={v}>{v}</Tag>)}</div> : <p className="pfr-prose">{bio.values_principles}</p>}
                  </div>
                )}
                {bio?.what_creating?.trim() && <div className="pfr-text"><h3 className="pfr-card__title">Creating</h3><p className="pfr-prose">{bio.what_creating}</p></div>}
              </section>
            )
            if (key === 'skills') return empty || (
              <section className="pfr-sec">
                {skills.length > 0 && <><div className="pfr-label">Good at</div><div className="v4-tags">{skills.map(s => <Tag key={s}>{s}</Tag>)}</div></>}
                {interests.length > 0 && <><div className="pfr-label">Curious about</div><div className="v4-tags">{interests.map(s => <Tag key={s}>{s}</Tag>)}</div></>}
                {isOwn && <Link className="pfr-small pfr-edit" href="/profile/edit?add=skills">Change</Link>}
              </section>
            )
            if (key === 'offers') return <>{offersBlock}{requestsBlock}</>
            if (key === 'personality') return empty || (
              <section className="v4-card pfr-card">
                {pd?.myersBriggs && <p className="pfr-mbti">{pd.myersBriggs}</p>}
                {ocean && (
                  <div className="pfr-ocean">
                    {OCEAN.map(({ key: k, label }) => {
                      const v = ocean[k] ?? 50
                      return (
                        <div key={k} className="pfr-ocean__row">
                          <span>{label}</span><span className="pfr-ocean__n">{v}%</span>
                          <i className="pfr-ocean__bar" aria-hidden><i style={{ width: `${v}%` }} /></i>
                        </div>
                      )
                    })}
                  </div>
                )}
                {(astro.length > 0 || otherArc.length > 0) && (
                  <dl className="pfr-facts">
                    {[...astro, ...otherArc].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                  </dl>
                )}
              </section>
            )
            if (key === 'growth') return empty || (
              <section className="v4-card pfr-card">
                {bio?.goals?.trim() && <div className="pfr-text"><h3 className="pfr-card__title">Goals</h3><p className="pfr-prose">{bio.goals}</p></div>}
                {growth?.fears && <div className="pfr-text"><h3 className="pfr-card__title">Fears & challenges</h3><p className="pfr-prose">{growth.fears}</p></div>}
                {growth?.traumas && <div className="pfr-text"><h3 className="pfr-card__title">Healing journey</h3><p className="pfr-prose">{growth.traumas}</p></div>}
                {isOwn && growth && (growth.fears || growth.traumas) && <p className="pfr-small"><Icon name="eye" size={16} />{GROWTH_AUDIENCE[growth.visibility] ?? growth.visibility} · <Link href="/profile/edit?add=growth">change</Link></p>}
              </section>
            )
            if (key === 'travel') return empty || (
              <section className="pfr-sec">
                <div className="v4-list">
                  {travels.map((t, i) => (
                    <div key={i} className="v4-row pfr-row">
                      <span className="v4-row__lead"><Icon name="plane" size={20} /></span>
                      <span className="v4-row__main">
                        <b>{t.location}</b>
                        {(t.startDate || t.endDate) && <small>{[monthYear(t.startDate), monthYear(t.endDate)].filter(Boolean).join(' – ')}</small>}
                        {t.notes && <span className="pfr-row__text">{t.notes}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )
            return empty || <section className="pfr-sec"><Links links={links} /></section>
          }}</ProfileTabs>}
        </div>

        <aside className="pfr-side">
          {theirCircles.length > 0 && (
            <div className="pfr-side__circles">
              <div className="v4-sec"><h2>Circles</h2><Link href="/circles">All circles →</Link></div>
              <div className="v4-list">
                {theirCircles.map(c => (
                  <Link key={c.slug} href={`/circles?c=${encodeURIComponent(c.slug)}`} className="v4-row v4-row--click">
                    <span className="v4-row__lead"><CircleSeal slug={c.slug} size={24} /></span>
                    <span className="v4-row__main"><b>{circleSet.meta(c.slug).label}</b><small>{c.lead ? 'Circle lead' : 'Member'}</small></span>
                    <Icon name="right" size={20} />
                  </Link>
                ))}
              </div>
            </div>
          )}
          {isOwn && <div className="pfr-ask"><MyCircles userId={p.id} askOnly /></div>}
        </aside>
      </div>
    </div>
  )
}

const onHash = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb) }

type TabKey = 'about' | 'skills' | 'offers' | 'personality' | 'growth' | 'travel' | 'links'

/** The profile's tabs: a row of chips that scrolls sideways on a phone; the open tab is in the address (#tab) */
function ProfileTabs({ tabs, children }: { tabs: { key: TabKey; label: string }[]; children: (key: TabKey) => React.ReactNode }) {
  // The address's #tab opens that tab (read after load; the server has no address hash)
  const hash = useSyncExternalStore(onHash, () => window.location.hash.slice(1), () => '') as TabKey
  const [picked, setPicked] = useState<TabKey | null>(null)
  const pick = (k: TabKey) => { setPicked(k); window.history.replaceState(null, '', `#${k}`) }
  const want = picked ?? hash
  const current = tabs.some(t => t.key === want) ? want : tabs[0].key
  return (
    <>
      <div className="v4-chiprow pfr-tabs" role="tablist" aria-label="Profile">
        {tabs.map(t => (
          <button key={t.key} type="button" role="tab" id={`pfr-tab-${t.key}`} aria-selected={t.key === current} aria-controls="pfr-panel"
            className={`v4-chip${t.key === current ? ' v4-chip--on' : ''}`} onClick={() => pick(t.key)}>{t.label}</button>
        ))}
      </div>
      <div className="pfr-panel" id="pfr-panel" role="tabpanel" aria-labelledby={`pfr-tab-${current}`}>{children(current)}</div>
    </>
  )
}

function Links({ links }: { links: { key: string; label: string; href: string }[] }) {
  return (
    <div className="v4-tags pfr-links">
      {links.map(l => (
        <a key={l.key} href={l.href} target="_blank" rel="noopener noreferrer nofollow" className="v4-tag">
          <Icon name={LINK_ICON[l.key as keyof typeof LINK_ICON] ?? 'link'} size={16} />{l.label}
        </a>
      ))}
    </div>
  )
}
