'use client'
import { useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCircles } from '@/core/components/CirclesProvider'
import type { CircleSlug } from '@/core/lib/circles'
import { CalendarPicker } from './CalendarPicker'
import { TeamPicker } from './TeamPicker'
import type { TaskTeamOption } from './TaskModal'

export default function NewProjectClient({
  userId,
  isOpsAdmin,
  teams = [],
}: {
  userId: string
  isOpsAdmin: boolean
  /** The circles' teams, so a project can belong to one (v4.37.0) */
  teams?: TaskTeamOption[]
}) {
  const circles = useCircles()
  const supabase = createClient()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [openForCollab, setOpenForCollab] = useState(true)
  const [circle, setCircle] = useState<CircleSlug | ''>('')
  const [teamId, setTeamId] = useState('')
  const [deadline, setDeadline] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('projects')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        open_for_collaborators: openForCollab,
        circle: circle || null,
        team_id: teamId || null,
        deadline: deadline || null,
        created_by: userId,
        // OpsAdmins create directly into backlog; regular members propose (pending)
        status: isOpsAdmin ? 'backlog' : 'pending',
      })
      .select('id')
      .single()
    if (err) { setError(err.message); setSaving(false); return }
    router.push('/ops')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--rule)', background: 'var(--surface)',
    color: 'var(--ink)', fontSize: 14, outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 20px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{
          display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--m7)', background: 'color-mix(in srgb, var(--m7) 10%, var(--surface))',
          padding: '3px 10px', borderRadius: 20, marginBottom: 12,
        }}>
          M07 · Operations
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 8px' }}>
          {isOpsAdmin ? 'New project' : 'Propose a project'}
        </h1>
        {!isOpsAdmin && (
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0, lineHeight: 1.55 }}>
            Your proposal will appear in the Ideas column for review. Once accepted by a circle or project lead, it moves to Backlog and you can start adding subtasks.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
            Project title <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Garden infrastructure"
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What is this project about? What does success look like?"
            rows={5}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
            Target date <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>(optional)</span>
          </label>
          <CalendarPicker value={deadline} onChange={setDeadline} placeholder="No deadline set" />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
            Circle <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>— which pillar does this belong to?</span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {circles.slugs.map(p => {
              const meta = circles.meta(p)
              const active = circle === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setCircle(active ? '' : p); setTeamId('') }}
                  style={{
                    fontSize: 13, fontWeight: 600,
                    padding: '7px 14px', borderRadius: 20,
                    background: active ? meta.color : 'var(--surface)',
                    color: active ? '#fff' : 'var(--ink-2)',
                    border: `1px solid ${active ? meta.color : 'var(--rule)'}`,
                    cursor: 'pointer', transition: 'all 120ms',
                  }}
                >
                  {meta.emoji} {meta.label}
                </button>
              )
            })}
          </div>
        </div>

        {circle && teams.some(t => t.circle === circle) && (
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
              Team <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>— the whole circle, or one of its teams?</span>
            </label>
            <TeamPicker circle={circle} teams={teams} value={teamId} onChange={setTeamId} color={circles.meta(circle).color} />
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={openForCollab}
            onChange={e => setOpenForCollab(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--m7)' }}
          />
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            Open for collaboration — members can propose to work on this
          </span>
        </label>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            style={{
              background: 'var(--m7)', color: '#fff', fontSize: 14, fontWeight: 600,
              padding: '11px 28px', borderRadius: 8, border: 'none',
              cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
              opacity: saving || !title.trim() ? 0.65 : 1,
              transition: 'opacity 120ms',
            }}
          >
            {saving ? (isOpsAdmin ? 'Creating…' : 'Proposing…') : (isOpsAdmin ? 'Create project' : 'Submit proposal')}
          </button>
          <Link href="/ops" style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 500, textDecoration: 'none' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
