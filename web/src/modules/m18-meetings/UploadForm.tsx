'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/core/lib/supabase/client'

const MAX_BYTES = 200 * 1024 * 1024

/** The recording goes to the private meeting-audio bucket (under the person's id), then /api/meetings/upload sends it to Fireflies */
export default function UploadForm({ userId }: { userId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [attendees, setAttendees] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!title.trim()) return setError('Give the meeting a title.')
    if (!file) return setError('Choose an audio file.')
    if (file.size > MAX_BYTES) return setError('That file is over 200 MB — Fireflies won’t accept it.')
    setBusy(true)
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')
      const path = `${userId}/${Date.now()}-${safe}`
      const { error: upErr } = await supabase.storage.from('meeting-audio').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
      if (upErr) throw new Error(upErr.message)
      const res = await fetch('/api/meetings/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_path: path, title: title.trim(), attendees: attendees.split(',').map(a => a.trim()).filter(Boolean) }),
      })
      const body = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) throw new Error(body.error || 'Upload failed')
      router.push('/meetings')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, outline: 'none', fontFamily: 'inherit' }
  const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 20px 80px' }}>
      <Link href="/meetings" style={{ fontSize: 13, color: 'var(--m18)', textDecoration: 'none' }}>← Meetings</Link>
      <div style={{ margin: '16px 0 28px' }}>
        <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--m18)', background: 'color-mix(in srgb, var(--m18) 10%, var(--surface))', padding: '3px 10px', borderRadius: 20, marginBottom: 12 }}>
          M18 · Meetings
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 8px' }}>Upload a recording</h1>
        <p style={{ fontSize: 14, color: 'color-mix(in srgb, var(--ink) 60%, transparent)', margin: 0, lineHeight: 1.5 }}>
          Drop in an audio file from a meeting. It’s transcribed and summarized automatically — the notes show up in Meetings in a few minutes. No account needed beyond this portal.
        </p>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={label} htmlFor="mt-title">Title</label>
          <input id="mt-title" style={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Garden circle — planning" />
        </div>
        <div>
          <label style={label} htmlFor="mt-att">Who was there <span style={{ fontWeight: 400, color: 'color-mix(in srgb, var(--ink) 50%, transparent)' }}>(optional, comma-separated)</span></label>
          <input id="mt-att" style={input} value={attendees} onChange={e => setAttendees(e.target.value)} placeholder="Sonia, Oscar, …" />
        </div>
        <div>
          <label style={label} htmlFor="mt-file">Audio file</label>
          <input id="mt-file" type="file" accept=".mp3,.m4a,.wav,.ogg,.mp4,audio/*" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ ...input, padding: 10 }} />
          <p style={{ fontSize: 12, color: 'color-mix(in srgb, var(--ink) 50%, transparent)', margin: '6px 0 0' }}>mp3, m4a, wav, ogg or mp4 · up to 200 MB</p>
        </div>
        {error && <div style={{ fontSize: 13, color: '#b91c1c' }}>{error}</div>}
        <button type="submit" disabled={busy} style={{ padding: '11px 18px', borderRadius: 8, border: 'none', cursor: busy ? 'default' : 'pointer', background: 'var(--m18)', color: '#fff', fontSize: 14, fontWeight: 600, opacity: busy ? 0.6 : 1, alignSelf: 'flex-start', fontFamily: 'inherit' }}>
          {busy ? 'Uploading…' : 'Upload & transcribe'}
        </button>
      </form>
    </div>
  )
}
