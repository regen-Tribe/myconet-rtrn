'use client'
/**
 * Choose a circle's glyph: every stamp from circle-glyphs.ts as a seal in the circle's colour, plus
 * "none" (the seal then shows the circle's initial). Used where a circle is edited (Blueprint › Circles,
 * the circle's Edit window). Saves nothing itself: the caller writes `circles.icon`.
 */
import { Seal } from './CircleSeal'
import { CIRCLE_GLYPHS, glyphLabel, type CircleGlyph } from './circle-glyphs'

const GLYPHS = Object.keys(CIRCLE_GLYPHS) as CircleGlyph[]

export function GlyphPicker({ color, name, value, onChange, disabled }: {
  color: string
  /** The circle's name, for the initial on the "none" seal */
  name: string
  value: string | null
  onChange: (glyph: CircleGlyph | null) => void
  disabled?: boolean
}) {
  const options: (CircleGlyph | null)[] = [...GLYPHS, null]
  return (
    <div className="v4-glyphs" role="radiogroup" aria-label="Seal">
      {options.map(g => {
        const on = (value ?? null) === g
        const label = g ? glyphLabel(g) : 'First letter'
        return (
          <button key={g ?? 'none'} type="button" role="radio" aria-checked={on} aria-label={label} title={label} disabled={disabled}
            className={on ? 'v4-glyphs__opt v4-glyphs__opt--on' : 'v4-glyphs__opt'} onClick={() => onChange(g)}>
            <Seal color={color} glyph={g} name={name || 'Circle'} size={36} />
          </button>
        )
      })}
    </div>
  )
}
