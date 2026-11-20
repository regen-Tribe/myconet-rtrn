import type { Metadata } from 'next'
import {
  Button, Card, Chip, ChipRow, EmptyState, Icon, IconTile, List, ListRow, NextStep, PageHeader, SectionHead,
  StatusPill, Tag, type IconName, type Status,
} from '@/core/components/v4'
import { ICONS } from '@/core/components/v4/icons'

export const metadata: Metadata = { title: 'Design · MyCoNet', robots: { index: false } }

const STATUSES: Status[] = ['idea', 'todo', 'doing', 'review', 'done', 'paused', 'no']

/** The v4 building blocks in one place (DESIGN-SYSTEM.md › v4). Sample words only, no real data. */
export default function DesignPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 28px 80px' }}>
      <PageHeader
        eyebrow="Design system · v4"
        title="Building blocks"
        subtitle={<>Every page is made from these. They follow <b>DESIGN-SYSTEM.md › v4</b> and the words in <b>LEXICON.md</b>.</>}
        actions={<><Button variant="secondary" href="/changelog">Open Changelog →</Button><Button icon="plus">Add task</Button></>}
      />

      <NextStep title="Your first agreement" text="One accepted agreement makes you a member." href="/operations" />

      <SectionHead title="Buttons" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <Button>Save</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="next">Offer to help</Button>
          <Button variant="danger">Delete</Button>
          <Button variant="quiet">See all tasks →</Button>
          <Button size="sm" icon="plus">Add offer</Button>
        </div>
      </Card>

      <SectionHead title="Status" />
      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {STATUSES.map(s => <StatusPill key={s} status={s} />)}
          <StatusPill status="done" label="Passed" />
          <StatusPill status="doing" label="Open · 2 days left" />
        </div>
      </Card>

      <SectionHead title="Filters" />
      <ChipRow>
        <Chip on>All</Chip><Chip>To do</Chip><Chip>In progress</Chip><Chip count={3}>Review</Chip><Chip>Done</Chip>
      </ChipRow>

      <SectionHead title="Lists" action={{ href: '/operations', label: 'Open Operations →' }} />
      <List>
        <ListRow lead={<IconTile name="tasks" />} title="Sort the first 40 packets" meta="Seed library · due Fri" trail={<StatusPill status="todo" />} />
        <ListRow lead={<IconTile name="calendar" tone="red" />} title="Harvest gathering" meta="Sat 21 Nov · 16:00 · the long barn" trail={<Button size="sm">RSVP</Button>} />
        <ListRow lead={<IconTile name="scale" tone="yellow" />} title="Tool shed rules" meta="3 days left · 22 of 31 voted" trail={<StatusPill status="doing" label="Open" />} href="/governance" />
      </List>

      <SectionHead title="Cards and tags" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        <Card>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <IconTile name="board" /><div><b>Seed library</b><div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Food &amp; land circle · lead Jonas</div></div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}><StatusPill status="doing" /><Tag>6 tasks</Tag><Tag icon="users">2 helping</Tag></div>
        </Card>
        <EmptyState title="No agreements yet" text="Find a project you'd like to help on and offer what you can give." action={{ href: '/operations', label: 'Open Operations →' }} />
      </div>

      <SectionHead title={`Icons · ${Object.keys(ICONS).length}`} />
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
          {(Object.keys(ICONS) as IconName[]).map(n => (
            <div key={n} style={{ display: 'grid', justifyItems: 'center', gap: 6, padding: '12px 4px', borderRadius: 12, background: 'var(--bg-2)', fontSize: 11, color: 'var(--ink-2)' }}>
              <Icon name={n} size={24} /><span>{n}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
