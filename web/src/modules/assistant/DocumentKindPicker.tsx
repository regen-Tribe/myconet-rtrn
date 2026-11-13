'use client'
import { DOC_KINDS, type DocKind } from '@/modules/assistant/lib/library'

/**
 * Asked whenever someone uploads a document: is it shareable, or sensitive (admins and
 * circle leads only)? Every document goes into the library.
 */
export default function DocumentKindPicker({ value, onChange }: {
  value: DocKind | null; onChange: (v: DocKind) => void
}) {
  const options = DOC_KINDS
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>What kind of document is this?</legend>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8 }}>
        It&rsquo;s added to the community&rsquo;s library, which the portal assistant answers questions from. This protects sensitive information.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {options.map(o => (
          <label key={o.id} style={{
            display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: '9px 12px', borderRadius: 8,
            border: `1.5px solid ${value === o.id ? 'var(--accent)' : 'var(--rule)'}`, background: value === o.id ? 'var(--accent-soft)' : 'var(--surface)',
          }}>
            <input type="radio" name="doc-kind" checked={value === o.id} onChange={() => onChange(o.id)} style={{ marginTop: 3 }} />
            <span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{o.id === 'leads' ? '🔒 ' : o.id === 'everyone' ? '🌐 ' : ''}{o.label}</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>{o.help}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
