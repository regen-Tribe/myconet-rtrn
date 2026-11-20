'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { EmptyState, Icon } from '@/core/components/v4'
import { CircleFilter, parseCircleParam, setCircleParam } from '@/core/components/v4/CircleFilter'
import './members-v4.css'

export type MemberCard = {
  id: string; username: string | null; name: string; avatar: string | null; headline: string | null
  circles: { slug: string; name: string; color: string }[]; offers: string[]; requests: string[]; you: boolean
  /** Your match % with them (signed in, with your bio filled in); null otherwise */
  score: number | null
}

/** Members in the v4 look (Sonia's prototype): everyone as cards, filtered by circle or searched. */
export default function MembersGridV4({ people, circles, signedIn }: { people: MemberCard[]; circles: { slug: string; name: string; color: string }[]; signedIn: boolean }) {
  // The circle filter (several at once; [] = everyone), kept in the address as ?circle=a,b
  const params = useSearchParams()
  const [picked, setPicked] = useState<string[]>(() => parseCircleParam(params.get('circle'), () => true))
  const pick = (next: string[]) => { setPicked(next); setCircleParam(next) }
  const active = picked.filter(s => circles.some(c => c.slug === s))
  const circle = active.length > 0
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const shown = people
    .filter(p => !circle || p.circles.some(c => active.includes(c.slug)))
    .filter(p => !query || [p.name, p.username ?? '', p.headline ?? '', ...p.offers, ...p.requests, ...p.circles.map(c => c.name)].some(s => s.toLowerCase().includes(query)))
  const inCircle = (slug: string) => people.filter(p => p.circles.some(c => c.slug === slug)).length

  return (
    <section className="mb4-people" aria-label="Everyone">
      <div className="mb4-find">
        <label className="mb4-search">
          <Icon name="search" size={18} />
          <input type="search" className="mb4-search__input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, skill, offer or circle" aria-label="Search members" />
          {q && <button type="button" className="mb4-search__clear" onClick={() => setQ('')} aria-label="Clear search"><Icon name="x" size={14} /></button>}
        </label>
        <CircleFilter
          options={circles.filter(c => inCircle(c.slug) > 0).map(c => ({ slug: c.slug, label: c.name, color: c.color, count: inCircle(c.slug) }))}
          value={picked} onChange={pick}
          mine={people.find(p => p.you)?.circles.map(c => c.slug) ?? []}
        />
      </div>
      {(query || circle) && <p className="mb4-count">{shown.length} of {people.length} people</p>}

      {shown.length === 0 ? (
        <EmptyState icon="users" title="Nobody matches that" text="Try another circle or clear the search." />
      ) : (
        <div className="mb4-grid">
          {shown.map(p => (
            <Link key={p.id} href={p.username ? `/u/${p.username}` : '#'} className={`mb4-card${p.you ? ' mb4-card--you' : ''}`}>
              <div className="mb4-card__head">
                {p.avatar
                  ? <img loading="lazy" decoding="async" src={p.avatar} alt="" className="v4-avatar mb4-card__av" />
                  : <span className="v4-avatar mb4-card__av">{p.name.slice(0, 1).toUpperCase()}</span>}
                <div className="mb4-card__who">
                  <b>{p.name}</b>
                  <small>{p.headline || (p.username ? `@${p.username}` : '')}</small>
                </div>
                {p.you ? <span className="mb4-you">you</span> : p.score != null && <span className="mb4-score" title="Your match with them">{p.score}%</span>}
              </div>
              <div className="mb4-circles" title={p.circles.map(c => c.name).join(', ')}>
                {p.circles.length === 0 ? <span className="mb4-none">No circle yet</span> : <>
                  {p.circles.slice(0, 2).map(c => <span key={c.slug}><i style={{ background: c.color }} />{c.name}</span>)}
                  {p.circles.length > 2 && <span className="mb4-more">+{p.circles.length - 2}</span>}
                </>}
              </div>
              {/* Visitors can't read offers and requests, so their cards leave these lines out */}
              {signedIn && <>
                <Line icon="gift" tone="offer" items={p.offers} empty="No offers yet" />
                <Line icon="hand" tone="need" items={p.requests} empty="No requests yet" />
              </>}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

/** One line on a card: the first offer (or request), and how many more. Always there, so cards line up. */
function Line({ icon, tone, items, empty }: { icon: 'gift' | 'hand'; tone: 'offer' | 'need'; items: string[]; empty: string }) {
  if (items.length === 0) return <div className="mb4-line mb4-line--empty"><Icon name={icon} size={13} /><span>{empty}</span></div>
  return (
    <div className={`mb4-line mb4-line--${tone}`} title={items.join(' · ')}>
      <Icon name={icon} size={13} /><span>{items[0]}</span>{items.length > 1 && <em>+{items.length - 1}</em>}
    </div>
  )
}
