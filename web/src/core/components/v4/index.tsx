/**
 * Shared building blocks for the v4 look (DESIGN-SYSTEM.md › v4).
 *
 * Pages use these instead of inline styles, so the look lives in one place. They read the design
 * tokens from globals.css, with fallbacks, so they also look right in communities that haven't
 * turned v4 on. Their styles are the `.v4-*` rules in globals.css. Words follow LEXICON.md.
 */
import Link from 'next/link'
import { ICONS, type IconName } from './icons'
import { iconSize } from './icon-size'

export type { IconName }

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ─── Icon ───────────────────────────────────────────────────────── */

/** One icon from the marker-line set. Decorative unless `label` is given. With the design review on, the
 *  size snaps to 16, 20 or 24 (icon-size.ts). */
export function Icon({ name, size = 18, label, className }: { name: IconName; size?: number | string; label?: string; className?: string }) {
  const s = iconSize(size)
  return (
    <svg
      viewBox="0 0 24 24" width={s} height={s} className={cx('v4-icon', className)}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  )
}

/** An icon inside a line of text (a pin before a place name): sized to the text, never an emoji. */
export function InlineIcon({ name, label }: { name: IconName; label?: string }) {
  return <Icon name={name} size="1.1em" label={label} className="v4-inl" />
}

/* ─── Button ─────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'next'
type ButtonProps = {
  variant?: ButtonVariant
  size?: 'md' | 'sm'
  href?: string
  icon?: IconName
  children: React.ReactNode
  className?: string
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>

/**
 * Buttons: `primary` (black pill, the main action), `secondary` (white), `quiet` (underlined text),
 * `danger` (Delete), `next` (the one green next step on a screen, with a round arrow).
 * Wording: "+ Add {thing}", "Open {Page} →", "Save", "Cancel" (LEXICON.md › Buttons).
 */
export function Button({ variant = 'primary', size = 'md', href, icon, children, className, ...rest }: ButtonProps) {
  const cls = cx('v4-btn', `v4-btn--${variant}`, size === 'sm' && 'v4-btn--sm', className)
  const inner = (
    <>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      <span>{children}</span>
      {variant === 'next' && <span className="v4-btn__go"><Icon name="right" size={14} /></span>}
    </>
  )
  if (href) return <Link href={href} className={cls}>{inner}</Link>
  return <button type="button" className={cls} {...rest}>{inner}</button>
}

/* ─── StatusPill ─────────────────────────────────────────────────── */

export type Status = 'later' | 'idea' | 'todo' | 'doing' | 'review' | 'done' | 'paused' | 'no'

/** Lexicon labels for a single item's status. Columns say "Ideas"; one card says "Idea". */
export const STATUS_LABEL: Record<Status, string> = {
  later: 'Later', idea: 'Idea', todo: 'To do', doing: 'In progress', review: 'Review', done: 'Done', paused: 'Paused', no: 'Declined',
}

/** Maps the database statuses (projects and tasks) to a pill. */
export function statusFromDb(status: string): Status {
  switch (status) {
    case 'later': return 'later'
    case 'pending': return 'idea'
    case 'backlog': return 'todo'
    case 'in_progress': return 'doing'
    case 'review': return 'review'
    case 'done': case 'accepted': case 'approved': return 'done'
    case 'paused': return 'paused'
    case 'declined': case 'rejected': return 'no'
    default: return 'todo'
  }
}

/** A status: colour means status, never module. Pass `label` to say something else ("Passed", "Open"). */
export function StatusPill({ status, label }: { status: Status; label?: string }) {
  return <span className={cx('v4-st', `v4-st--${status}`)}>{label ?? STATUS_LABEL[status]}</span>
}

/* ─── Chip ───────────────────────────────────────────────────────── */

/** A filter or view switch. The chosen one is black. No emoji in chips. */
export function Chip({ on, onClick, children, count }: { on?: boolean; onClick?: () => void; children: React.ReactNode; count?: number }) {
  return (
    <button type="button" className={cx('v4-chip', on && 'v4-chip--on')} aria-pressed={on} onClick={onClick}>
      {children}{count != null && <span className="v4-chip__count">{count}</span>}
    </button>
  )
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="v4-chiprow">{children}</div>
}

/* ─── Card and list rows ─────────────────────────────────────────── */

/** A white card on the pale page. No shadow, no coloured stripe. */
export function Card({ children, className, href }: { children: React.ReactNode; className?: string; href?: string }) {
  if (href) return <Link href={href} className={cx('v4-card', 'v4-card--link', className)}>{children}</Link>
  return <div className={cx('v4-card', className)}>{children}</div>
}

/** A list inside one white card, rows divided by hairlines. */
export function List({ children }: { children: React.ReactNode }) {
  return <div className="v4-list">{children}</div>
}

/** One row: optional icon or avatar on the left, a title and a line under it, something on the right. */
export function ListRow({ title, meta, lead, trail, href, onClick }: {
  title: React.ReactNode; meta?: React.ReactNode; lead?: React.ReactNode; trail?: React.ReactNode; href?: string; onClick?: () => void
}) {
  const body = (
    <>
      {lead && <span className="v4-row__lead">{lead}</span>}
      <span className="v4-row__main"><b>{title}</b>{meta && <small>{meta}</small>}</span>
      {trail && <span className="v4-row__trail">{trail}</span>}
    </>
  )
  if (href) return <Link href={href} className="v4-row v4-row--click">{body}</Link>
  if (onClick) return <button type="button" className="v4-row v4-row--click" onClick={onClick}>{body}</button>
  return <div className="v4-row">{body}</div>
}

/** A soft square holding an icon, for list rows and card heads. With the design review on, every tone shows
 *  neutral (colour only means status); `off` (archived, not on the map) shows as a dashed, faded tile. */
export function IconTile({ name, tone = 'blue', off }: { name: IconName; tone?: 'blue' | 'red' | 'yellow' | 'green' | 'violet' | 'grey'; off?: boolean }) {
  return <span className={cx('v4-tile', `v4-tile--${tone}`, off && 'v4-tile--off')}><Icon name={name} /></span>
}

/* ─── Page header, next step, section heads, empty states ───────── */

/**
 * The top of a page: an optional light-capitals eyebrow (never a module number), a big title, a line
 * with bolded data, and the page's actions on the right.
 */
export function PageHeader({ eyebrow, title, subtitle, actions, back }: {
  eyebrow?: string; title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string }
}) {
  return (
    <header className="v4-ph">
      {back && <Link href={back.href} className="v4-back"><Icon name="left" size={14} />{back.label}</Link>}
      <div className="v4-ph__row">
        <div>
          {eyebrow && <div className="v4-eyebrow">{eyebrow}</div>}
          <h1 className="v4-ph__title">{title}</h1>
          {subtitle && <p className="v4-ph__sub">{subtitle}</p>}
        </div>
        {actions && <div className="v4-ph__actions">{actions}</div>}
      </div>
    </header>
  )
}

/** The one next step for this person, in the action green. One per screen. */
export function NextStep({ title, text, href, eyebrow = 'Your next step' }: { title: string; text?: string; href: string; eyebrow?: string }) {
  return (
    <Link href={href} className="v4-next">
      <span className="v4-next__txt">
        <small>{eyebrow}</small>
        <b>{title}</b>
        {text && <span>{text}</span>}
      </span>
      <span className="v4-next__go"><Icon name="right" /></span>
    </Link>
  )
}

/** A section title with an optional link on the right ("See all tasks →"). */
export function SectionHead({ title, action }: { title: React.ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="v4-sec">
      <h2>{title}</h2>
      {action && <Link href={action.href}>{action.label}</Link>}
    </div>
  )
}

/** What a screen says when it has nothing yet: what will show here, and the one way to start. */
export function EmptyState({ title, text, action, icon = 'sprout' }: {
  title: string; text?: string; action?: { href: string; label: string }; icon?: IconName
}) {
  return (
    <div className="v4-empty">
      <span className="v4-empty__art"><Icon name={icon} size={30} /></span>
      <b>{title}</b>
      {text && <p>{text}</p>}
      {action && <Button href={action.href} variant="primary">{action.label}</Button>}
    </div>
  )
}

/**
 * A small tag: what something is or belongs to (a circle, a kind, a sprint). Not for status (StatusPill) or
 * outcomes (Result). Pass `seal` (a CircleSeal or Seal at 16) for a circle: the only colour a tag may carry.
 */
export function Tag({ children, icon, seal }: { children: React.ReactNode; icon?: IconName; seal?: React.ReactNode }) {
  return <span className={cx('v4-tag', seal ? 'v4-tag--seal' : undefined)}>{seal}{!seal && icon && <Icon name={icon} size={13} />}{children}</span>
}

/* ─── Design review pill families (DESIGN-SYSTEM.md › design review, rule 7) ─── */

export type Tone = 'good' | 'bad' | 'attention' | 'neutral'
const TONE_ICON: Record<Tone, IconName | null> = { good: 'check', bad: 'x', attention: 'alert', neutral: null }

/**
 * The outcome of something: Approved, Not approved, 31 late, Voting · 4 days left. Square corners and an icon,
 * so it never reads as a task status. Never violet or blue.
 */
export function Result({ tone, children, icon }: { tone: Tone; children: React.ReactNode; icon?: IconName | null }) {
  const name = icon === undefined ? TONE_ICON[tone] : icon
  return <span className={cx('v4-result', `v4-result--${tone}`)}>{name && <Icon name={name} size={12} />}{children}</span>
}

/** A count: a black number badge (on a Filter button, a tab, a menu item). */
export function Count({ n, label }: { n: number; label?: string }) {
  return <span className="v4-count" aria-label={label ?? String(n)}>{n}</span>
}
