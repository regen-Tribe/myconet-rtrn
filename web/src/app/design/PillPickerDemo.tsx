'use client'
import { useState } from 'react'
import { PillPicker } from '@/core/components/v4/PillPicker'
import { DESCRIBES, pastel } from '@/core/lib/skills-interests'

/** The skills and interests picker and the describes-you cards with sample values, for /design. Saves nothing. */
export function PillPickerDemo() {
  const [good, setGood] = useState<string[]>(['Cooking', 'Music'])
  const [shared, setShared] = useState<string[]>(['Cooking'])
  const [types, setTypes] = useState<string[]>(['Vision Holder'])
  // Sample counts: three or more people make a pill popular (the flame)
  const stats = { count: { Nature: 7, Community: 6, Music: 5, Spirituality: 5, Permaculture: 3, Teaching: 3 }, together: {} }
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <PillPicker label="What are you good at?" hint="Pick from the groups, then tap the ones you’re excited to share."
        value={good} onChange={setGood} stats={stats} share={{ value: shared, onChange: setShared }} />
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        <legend style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>What best describes you?</legend>
        <div className="pp-describes">
          {DESCRIBES.map((d, i) => (
            <button key={d.id} type="button" className="pp-pick" style={pastel(i) as React.CSSProperties} aria-pressed={types.includes(d.id)}
              onClick={() => setTypes(t => (t.includes(d.id) ? t.filter(x => x !== d.id) : [...t, d.id]))}>
              <b>{d.label}</b><small>{d.hint}</small>
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
