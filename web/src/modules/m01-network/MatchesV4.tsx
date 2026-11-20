'use client'
import { useState } from 'react'
import { Chip, ChipRow, EmptyState } from '@/core/components/v4'
import { PersonCardV4, type PersonV4 } from './PersonCardV4'

type Tab = 'all' | 'top' | 'good' | 'potential'
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'top', label: 'Top · 70%+' },
  { key: 'good', label: 'Good · 50–69%' },
  { key: 'potential', label: 'Potential · under 50%' },
]

/** Your matches in the v4 look: everyone best first, or one range (top, good, potential), as uniform cards. */
export default function MatchesV4({ people }: { people: PersonV4[] }) {
  const buckets: Record<Tab, PersonV4[]> = {
    all: people,
    top: people.filter(p => (p.score ?? 0) >= 70),
    good: people.filter(p => (p.score ?? 0) >= 50 && (p.score ?? 0) < 70),
    potential: people.filter(p => (p.score ?? 0) < 50),
  }
  const [tab, setTab] = useState<Tab>('all')
  const list = buckets[tab]
  return (
    <>
      <div className="mb4-find"><ChipRow>{TABS.map(t => <Chip key={t.key} on={tab === t.key} count={buckets[t.key].length} onClick={() => setTab(t.key)}>{t.label}</Chip>)}</ChipRow></div>
      {list.length === 0
        ? <EmptyState icon="users" title={people.length ? 'No one in this range' : 'No matches yet'} text={people.length ? 'Try another range.' : 'When other members fill in their profiles, they show up here, best match first.'} />
        : <div className="mb4-grid">{list.map(p => <PersonCardV4 key={p.id} p={p} />)}</div>}
    </>
  )
}
