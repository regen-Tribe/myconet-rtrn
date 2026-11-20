'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Chip, ChipRow, EmptyState, Icon, Tag } from '@/core/components/v4'

export type MemberCard = {
  id: string; username: string | null; name: string; avatar: string | null; headline: string | null
  circles: { slug: string; name: string; color: string }[]; offers: string[]; requests: string[]; you: boolean
}

/** Members in the v4 look (Sonia's prototype): everyone as cards, filtered by circle or searched. */
export default function MembersGridV4({ people, circles }: { people: MemberCard[]; circles: { slug: string; name: string; color: string }[] }) {
  const [circle, setCircle] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const shown = people
    .filter(p => !circle || p.circles.some(c => c.slug === circle))
    .filter(p => !query || [p.name, p.username ?? '', p.headline ?? '', ...p.offers, ...p.requests, ...p.circles.map(c => c.name)].some(s => s.toLowerCase().includes(query)))
  const inCircle = (slug: string) => people.filter(p => p.circles.some(c => c.slug === slug)).length

  return (
    <>
      <div className="v4-toolbar">
        <ChipRow>
          <Chip on={circle === null} onClick={() => setCircle(null)} count={people.length}>Everyone</Chip>
          {circles.filter(c => inCircle(c.slug) > 0).map(c => (
            <Chip key={c.slug} on={circle === c.slug} onClick={() => setCircle(c.slug)} count={inCircle(c.slug)}>{c.name}</Chip>
          ))}
        </ChipRow>
        <label className="v4-search">
          <Icon name="search" size={16} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people, offers, skills" aria-label="Search members" />
        </label>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon="users" title="Nobody matches that" text="Try another circle or clear the search." />
      ) : (
        <div className="v4-grid v4-grid--people">
          {shown.map(p => (
            <Link key={p.id} href={p.username ? `/u/${p.username}` : '#'} className="v4-card v4-card--link v4-member">
              <div className="v4-card-head">
                {p.avatar
                  ? <img loading="lazy" decoding="async" src={p.avatar} alt="" className="v4-avatar v4-avatar--md" />
                  : <span className="v4-avatar v4-avatar--md">{p.name.slice(0, 1).toUpperCase()}</span>}
                <div>
                  <b>{p.name}{p.you ? ' (you)' : ''}</b>
                  <small>{p.headline || (p.username ? `@${p.username}` : '')}</small>
                </div>
              </div>
              {p.circles.length > 0 && (
                <div className="v4-tags">
                  {p.circles.slice(0, 3).map(c => <Tag key={c.slug}><span className="v4-dot" style={{ background: c.color }} />{c.name}</Tag>)}
                </div>
              )}
              {p.offers.length > 0 && (
                <div className="v4-member__line"><small>Offers</small><div className="v4-tags">{p.offers.slice(0, 2).map(o => <Tag key={o} icon="gift">{o}</Tag>)}</div></div>
              )}
              {p.requests.length > 0 && (
                <div className="v4-member__line"><small>Looking for</small><div className="v4-tags">{p.requests.slice(0, 2).map(o => <Tag key={o} icon="hand">{o}</Tag>)}</div></div>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
