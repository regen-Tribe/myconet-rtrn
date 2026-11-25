import Link from 'next/link'
import { Icon } from '@/core/components/v4'
import type { JoinPath, JoinStepKey } from '@/core/lib/join-path'
import './join-review.css'

/**
 * The join steps as a track (Get to know us · About you, #93; three with Apply without the design review): done ones checked, the current one ringed.
 * Shows progress instead of saying it. Used on Join (each step a button that opens it) and on My dashboard
 * for explorers (each step a link to it). Design review only (class names under html[data-review]).
 */
export function JoinPathView({ path, current, onPick, hrefs, label = 'Your way in' }: {
  path: JoinPath
  /** The step that's open (Join), or the next one */
  current?: JoinStepKey | null
  onPick?: (key: JoinStepKey) => void
  /** Links per step (My dashboard); leave out on Join, where steps are buttons */
  hrefs?: Partial<Record<JoinStepKey, string>>
  label?: string
}) {
  const at = current ?? path.next?.key ?? null
  return (
    <ol className="jr-path" aria-label={`${label}: ${path.doneCount} of ${path.steps.length} done`}>
      {path.steps.map((s, i) => {
        const cls = `${s.done ? 'done' : ''}${s.key === at ? ' now' : ''}`
        const inner = (
          <>
            <span className="jr-path__n" aria-hidden="true">{s.done ? <Icon name="check" size={16} /> : i + 1}</span>
            <span className="jr-path__t">{s.label}<span className="sr-only">{s.done ? ', done' : s.key === at ? ', current step' : ''}</span></span>
          </>
        )
        return (
          <li key={s.key} className={cls}>
            {onPick
              ? <button type="button" onClick={() => onPick(s.key)} aria-current={s.key === at ? 'step' : undefined}>{inner}</button>
              : hrefs?.[s.key]
                ? <Link href={hrefs[s.key]!} aria-current={s.key === at ? 'step' : undefined}>{inner}</Link>
                : <span>{inner}</span>}
          </li>
        )
      })}
    </ol>
  )
}
