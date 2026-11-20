'use client'
import { useState } from 'react'
import { Chip, ChipRow, IconTile, List, ListRow, SectionHead, StatusPill, statusFromDb } from '@/core/components/v4'

export type DashTask = {
  id: string; title: string; status: string; due: string | null
  projectId: string | null; projectTitle: string | null; circle: string | null
}

const FILTERS: [string, string][] = [['open', 'Not done'], ['backlog', 'To do'], ['in_progress', 'In progress'], ['review', 'Review'], ['done', 'Done']]

/** Your tasks on My dashboard (My tasks is no longer its own page). Filters are the board's own columns. */
export default function YourTasks({ tasks }: { tasks: DashTask[] }) {
  const [f, setF] = useState('open')
  const [all, setAll] = useState(false)
  const list = tasks.filter(t => f === 'open' ? t.status !== 'done' : t.status === f)
  const shown = all ? list : list.slice(0, 5)
  const openCount = tasks.filter(t => t.status !== 'done').length

  return (
    <>
      <SectionHead title={`Your tasks · ${openCount} not done`} action={{ href: '/operations', label: 'Open Operations →' }} />
      <ChipRow>
        {FILTERS.map(([k, label]) => <Chip key={k} on={f === k} onClick={() => { setF(k); setAll(false) }}>{label}</Chip>)}
      </ChipRow>
      <List>
        {shown.length ? shown.map(t => (
          <ListRow key={t.id} href={t.projectId ? `/operations/${t.projectId}` : `/operations?task=${t.id}`}
            lead={<IconTile name="tasks" tone="grey" />}
            title={t.title}
            meta={[t.projectTitle ?? 'On the board', t.due ? `due ${new Date(t.due + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}` : null].filter(Boolean).join(' · ')}
            trail={<StatusPill status={statusFromDb(t.status)} />} />
        )) : <ListRow title="No tasks with this status" />}
      </List>
      {list.length > 5 && !all && (
        <p className="v4-more"><button type="button" className="v4-btn v4-btn--quiet" onClick={() => setAll(true)}>See all {list.length} tasks →</button></p>
      )}
    </>
  )
}
