import type { Metadata } from 'next'
import {
  Button, Card, Chip, ChipRow, EmptyState, Icon, IconTile, List, ListRow, NextStep, PageHeader, SectionHead,
  StatusPill, Tag, type IconName, type Status,
} from '@/core/components/v4'
import { ICONS } from '@/core/components/v4/icons'
import { Seal } from '@/core/components/v4/CircleSeal'
import { GlyphPickerDemo } from './GlyphPickerDemo'
import { CIRCLE_GLYPHS, CIRCLE_GLYPH_LABEL, type CircleGlyph } from '@/core/components/v4/circle-glyphs'

export const metadata: Metadata = { title: 'Design · MyCoNet', robots: { index: false } }

const STATUSES: Status[] = ['idea', 'todo', 'doing', 'review', 'done', 'paused', 'no']

/** Sample circle colours for the seals (evenly spaced, each at least 3:1 on the page). Not a community's own. */
const SEAL_COLORS = ['#1F3FB8', '#34893C', '#88470D', '#BD4238', '#008796', '#6F4BAC', '#B44E9B', '#A1790C', '#3389BA', '#912946', '#126052', '#535F00', '#6C6158']
const GLYPHS = Object.keys(CIRCLE_GLYPHS) as CircleGlyph[]
const SIZES = [16, 24, 40] as const
const cell: React.CSSProperties = { display: 'grid', justifyItems: 'center', gap: 8, padding: '14px 6px 10px', borderRadius: 12, background: 'var(--bg-2)', fontSize: 11, color: 'var(--ink-2)' }
const sizesRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 40, color: 'var(--ink)' }

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
        <EmptyState title="No agreements yet" text="Find a task you'd like to help on and offer what you can give." action={{ href: '/operations', label: 'Open Operations →' }} />
      </div>

      <SectionHead title={`Circle seals · ${GLYPHS.length}`} />
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-3)', maxWidth: 720 }}>
        A circle&apos;s mark: its colour with a cream stamp. Solid shapes, so a seal never looks like an interface icon.
        The only coloured icons in the app. Shown at 16, 24 and 40px, then at 64px.
      </p>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: 8 }}>
          {GLYPHS.map((g, i) => (
            <div key={g} style={cell}>
              <Seal color={SEAL_COLORS[i % SEAL_COLORS.length]} glyph={g} size={64} name={CIRCLE_GLYPH_LABEL[g]} title />
              <div style={sizesRow}>
                {SIZES.map(s => <Seal key={s} color={SEAL_COLORS[i % SEAL_COLORS.length]} glyph={g} size={s} />)}
              </div>
              <span>{g}</span>
            </div>
          ))}
          <div style={cell}>
            <Seal color="#8a8f9c" name="Garden" size={64} title />
            <div style={sizesRow}>{SIZES.map(s => <Seal key={s} color="#8a8f9c" name="Garden" size={s} />)}</div>
            <span>no glyph: the initial</span>
          </div>
        </div>
      </Card>

      <SectionHead title="Seal picker" />
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-3)', maxWidth: 720 }}>
        How an admin chooses a circle&apos;s seal (Blueprint › Circles › Edit, and the circle&apos;s Edit window): every stamp in the circle&apos;s colour, or its first letter.
      </p>
      <Card><GlyphPickerDemo color="#BD4238" name="Kitchen" /></Card>

      <SectionHead title={`Icons · ${Object.keys(ICONS).length}`} />
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-3)', maxWidth: 720 }}>
        Interface icons: one thin marker line in ink, never coloured, never an emoji. Shown at 16, 24 and 40px.
      </p>
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: 8 }}>
          {(Object.keys(ICONS) as IconName[]).map(n => (
            <div key={n} style={cell}>
              <div style={sizesRow}>{SIZES.map(s => <Icon key={s} name={n} size={s} />)}</div>
              <span>{n}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
