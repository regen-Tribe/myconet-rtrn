'use client'
import { useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { FormField, FocusInput, FocusTextarea, inputStyle } from './AgreementFormFields'
import { useCircles } from '@/core/components/CirclesProvider'
import type { CircleSlug } from '@/core/lib/circles'
import { modLabel } from '@/core/lib/module-label'

interface Props {
  userId: string
  onClose: () => void
}

export default function NewProjectModal({ userId, onClose }: Props) {
  const circles = useCircles()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [needs, setNeeds] = useState('')
  const [deadline, setDeadline] = useState('')
  const [circle, setCircle] = useState<CircleSlug | ''>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const needsList = needs.split(',').map(s => s.trim()).filter(Boolean)
    const { error: err } = await supabase.from('projects').insert({
      title: title.trim(),
      description: desc.trim() || null,
      needs: needsList.length > 0 ? needsList : null,
      deadline: deadline || null,
      circle: circle || null,
      status: 'pending',
      open_for_collaborators: true,
      created_by: userId,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setDone(true)
    setSaving(false)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 14,
          border: '1px solid var(--rule)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          width: '100%', maxWidth: 520, overflow: 'hidden',
        }}
      >
        <div style={{
          background: 'color-mix(in srgb, var(--m6) 8%, var(--surface))',
          borderBottom: '1px solid var(--rule)',
          padding: '16px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 4 }}>
              {modLabel('06', 'Agreements')}
            </div>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: 18, color: 'var(--ink)', margin: 0 }}>
              Propose a new project
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--ink-3)', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Project proposed!</p>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                The admin team will review and activate your project. Once active, it'll appear here for collaboration.
              </p>
              <button
                onClick={onClose}
                style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: 'var(--m6)', background: 'transparent', border: '1px solid var(--m6)', padding: '7px 18px', borderRadius: 8, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <FormField label="Project title *">
                <FocusInput value={title} onChange={setTitle} placeholder="e.g. Community garden infrastructure" />
              </FormField>

              <FormField label="Description" hint="optional">
                <FocusTextarea value={desc} onChange={setDesc} placeholder="What is this project about? What does success look like?" />
              </FormField>

              <FormField label="Circle" hint="which pillar this project belongs to">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {circles.slugs.map(p => {
                    const meta = circles.meta(p)
                    const active = circle === p
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCircle(active ? '' : p)}
                        style={{
                          fontSize: 12, fontWeight: 600,
                          padding: '6px 12px', borderRadius: 20,
                          background: active ? meta.color : 'var(--surface)',
                          color: active ? '#fff' : 'var(--ink-2)',
                          border: `1px solid ${active ? meta.color : 'var(--rule)'}`,
                          cursor: 'pointer',
                        }}
                      >
                        {meta.emoji} {meta.label}
                      </button>
                    )
                  })}
                </div>
              </FormField>

              <FormField label="Skills / help needed" hint="comma-separated">
                <FocusInput value={needs} onChange={setNeeds} placeholder="e.g. Design, Carpentry, Fundraising" />
              </FormField>

              <FormField label="Deadline" hint="optional">
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </FormField>

              <div style={{
                background: 'var(--bg-2)', border: '1px solid var(--rule)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 20,
                fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55,
              }}>
                <span style={{ marginRight: 6 }}>ℹ</span>
                Your proposal goes to the admin team for review. Once activated it will appear in the open projects list and in Operations.
              </div>

              {error && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{error}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={onClose} style={{ fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink-2)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving || !title.trim()}
                  style={{
                    fontSize: 13, fontWeight: 700, padding: '9px 20px', borderRadius: 8,
                    border: 'none', background: 'var(--m6)', color: '#fff',
                    cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
                    opacity: saving || !title.trim() ? 0.5 : 1,
                  }}
                >
                  {saving ? 'Submitting…' : 'Submit proposal →'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
