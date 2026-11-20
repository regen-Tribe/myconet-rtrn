import { Icon } from '@/core/components/v4'

/** label, the short fact, and the id of its whole answer further down the page */
export type Fact = readonly [label: string, short: string, target: string]

/**
 * The strip under the About photo is for a glance: label on top, the short fact. It never opens in place
 * (Sonia, 20 Nov: "what are we optimizing for?"): a tile jumps to the whole answer, which lives once, in
 * its chapter, next to what it relates to.
 */
export default function AboutFacts({ facts }: { facts: Fact[] }) {
  return (
    <nav className="ab-facts" aria-label="At a glance" style={{ '--n': facts.length, '--half': Math.ceil(facts.length / 2) } as React.CSSProperties}>
      {facts.map(([label, short, target]) => (
        <a key={label} href={`#${target}`} className="ab-fact">
          <span>{label}</span>
          <b>{short}</b>
          <Icon name="down" size={14} />
        </a>
      ))}
    </nav>
  )
}

/** The facts' whole answers inside a chapter; each is the target of its tile in the strip. */
export function FactCards({ facts }: { facts: (readonly [id: string, label: string, text: string])[] }) {
  if (!facts.length) return null
  return (
    <div className="ab-specs">
      {facts.map(([id, label, text]) => (
        <div key={id} id={id} className="ab-spec"><div className="v4-eyebrow">{label}</div><p className="v4-prose">{text}</p></div>
      ))}
    </div>
  )
}
