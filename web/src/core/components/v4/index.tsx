/**
 * Shared building blocks for the v4 look (DESIGN-SYSTEM.md › v4).
 *
 * Pages use these instead of inline styles, so the look lives in one place. They read the design
 * tokens from globals.css, with fallbacks, so they also look right in communities that haven't
 * turned v4 on. Their styles are the `.v4-*` rules in globals.css. Words follow LEXICON.md.
 */
import Link from 'next/link'
import { ICONS, type IconName } from './icons'

export type { IconName }

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ─── Icon ───────────────────────────────────────────────────────── */

/** One icon from the marker-line set. Decorative unless `label` is given. */
export function Icon({ name, size = 18, label, className }: { name: IconName; size?: number | string; label?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} className={cx('v4-icon', className)}
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

/** A soft square holding an icon, for list rows and card heads. */
export function IconTile({ name, tone = 'blue' }: { name: IconName; tone?: 'blue' | 'red' | 'yellow' | 'green' | 'violet' | 'grey' }) {
  return <span className={cx('v4-tile', `v4-tile--${tone}`)}><Icon name={name} /></span>
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

/** A small tag (a circle, a count, a sprint). Not for status: use StatusPill. */
export function Tag({ children, icon }: { children: React.ReactNode; icon?: IconName }) {
  return <span className="v4-tag">{icon && <Icon name={icon} size={13} />}{children}</span>
}
