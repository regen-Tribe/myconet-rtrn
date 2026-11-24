import Link from 'next/link'
import { Icon } from '@/core/components/v4'
import { MATCH_DIMENSIONS } from './lib/match-dimensions'
import { DESIGN_REVIEW } from '@/core/lib/instance'
import './members-v4.css'

export type PersonV4 = {
  id: string; username: string | null; name: string; avatar: string | null
  sub: string | null; score: number | null; reason: string | null
  /** Skills and interests; null hides the line (visitors can't read them) */
  tags: string[] | null
}

/** One person as a uniform v4 card (Matches, Discover): avatar, name, a line under it, match %, why, skills. */
export function PersonCardV4({ p }: { p: PersonV4 }) {
  return (
    <Link href={p.username ? `/u/${p.username}` : '/members'} className="mb4-card">
      <span className="mb4-card__head">
        {p.avatar
          ? <img loading="lazy" decoding="async" src={p.avatar} alt="" className="v4-avatar mb4-card__av" />
          : <span className="v4-avatar mb4-card__av">{p.name.slice(0, 1).toUpperCase()}</span>}
        <span className="mb4-card__who"><b>{p.name}</b><small>{p.sub ?? ''}</small></span>
        {p.score !== null && <span className="mb4-score">{p.score}%</span>}
      </span>
      {p.reason !== null && <span className="mb4-line mb4-line--why"><Icon name="spark" size={13} /><span>{p.reason || 'Shared interests'}</span></span>}
      {p.tags !== null && (p.tags.length > 0 || !DESIGN_REVIEW) && <span className="mb4-skills">{p.tags.length ? p.tags.slice(0, 3).map(t => <i key={t}>{t}</i>) : <em>No skills listed yet</em>}</span>}
    </Link>
  )
}

/** "How matching works", folded away under the list. */
export function HowMatchingWorks({ open = false }: { open?: boolean }) {
  return (
    <details className="mb4-how" open={open}>
      <summary>How matching works <small>· up to 100 points</small></summary>
      <ul>
        {MATCH_DIMENSIONS.map(d => <li key={d.label}><span><b>{d.label}</b><small>{d.note}</small></span><em>{d.max} pts</em></li>)}
      </ul>
    </details>
  )
}
