'use client'
import { useState } from 'react'
import { GlyphPicker } from '@/core/components/v4/GlyphPicker'

/** The seal picker with sample values, for /design. Saves nothing. */
export function GlyphPickerDemo({ color, name }: { color: string; name: string }) {
  const [glyph, setGlyph] = useState<string | null>('pot')
  return <GlyphPicker color={color} name={name} value={glyph} onChange={setGlyph} />
}
