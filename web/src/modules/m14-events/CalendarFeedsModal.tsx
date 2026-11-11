'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/client'
import { ModalShell } from '@/core/components/ModalShell'
import type { CalendarFeed, EventKind } from './types'
import { EVENT_KINDS, KIND_META } from './lib/permissions'
import { FEED_SELECT } from './lib/queries'
import { FEED_DAYS_AHEAD, normalizeFeedUrl } from './lib/feed-url'

/**
 * Admins link outside calendars (Google Calendar or any iCal feed). Their events show on
 * the community calendar and refresh about hourly; "Sync now" refreshes straight away.
 */
export function CalendarFeedsModal({ initial, onClose }: { initial: CalendarFeed[]; onClose: () => void }) {
  const router = useRouter()
  const supabase = createClient()
  const [feeds, setFeeds] = useState(initial)
  const [adding, setAdding] = useState(initial.length === 0)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [kind, setKind] = useState<EventKind>('core')
  const [isPublic, setIsPublic] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const reload = async () => {
    const { data } = await supabase.from('calendar_feeds').select(FEED_SELECT).order('created_at')
    setFeeds((data ?? []) as CalendarFeed[])
  }

  const sync = async (feedId: string) => {
    setBusy(feedId); setError('')
    try {
      const resp = await fetch('/api/calendar/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feedId }) })
      const body = await resp.json().catch(() => ({})) as { error?: string; results?: { error?: string }[] }
      const err = body.error ?? body.results?.find(r => r.error)?.error
      if (err) setError(err)
      await reload()
      router.refresh()
    } catch {
      setError('Sync didn’t finish. Try again.')
    }
    setBusy(null)
  }

  const add = async () => {
    const link = normalizeFeedUrl(url)
    if (!name.trim()) return setError('Give the calendar a name.')
    if (!/^https:\/\//.test(link)) return setError('Paste the calendar’s https:// link (iCal address, or a Google Calendar share link).')
    setBusy('new'); setError('')
    const { data, error: err } = await supabase.from('calendar_feeds')
      .insert({ name: name.trim(), url: link, kind, is_public: isPublic })
      .select('id').single()
    setBusy(null)
    if (err) return setError(err.message)
    setAdding(false); setName(''); setUrl('')
    await sync(data.id)
  }

  const update = async (id: string, patch: Partial<Pick<CalendarFeed, 'is_public' | 'kind' | 'enabled' | 'match_circles'>>) => {
    setError('')
    const { error: err } = await supabase.from('calendar_feeds').update(patch).eq('id', id)
    if (err) return setError(err.message)
    // kind and visibility are applied to the feed's events on the next sync
    await sync(id)
  }

  const remove = async (id: string) => {
    setBusy(id); setError(''); setConfirmRemove(null)
    const { error: err } = await supabase.from('calendar_feeds').delete().eq('id', id)
    setBusy(null)
    if (err) return setError(err.message)
    await reload()
    router.refresh()
  }

  const input: React.CSSProperties = { width: '100%', fontSize: 13.5, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--bg)', color: 'var(--ink)', boxSizing: 'border-box' }
  const small: React.CSSProperties = { fontSize: 12, fontWeight: 600, padding: '6px 11px', borderRadius: 8, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink-2)', cursor: 'pointer' }
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }

  return (
    <ModalShell title="Linked calendars" onClose={onClose} maxWidth={600}>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55, margin: '0 0 16px' }}>
        Events from these calendars show here for the next {FEED_DAYS_AHEAD} days and refresh about every hour. Change them in the original calendar: edits made here would be overwritten.
      </p>

      {error && <div style={{ fontSize: 13, color: '#b91c1c', background: '#b91c1c12', border: '1px solid #b91c1c40', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {feeds.map(f => (
          <div key={f.id} style={{ border: '1px solid var(--rule)', borderRadius: 10, padding: '12px 14px', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>🔗 {f.name}{!f.enabled && <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}> · paused</span>}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>
                  {busy === f.id ? 'Syncing…' : f.last_error ? <span style={{ color: '#b91c1c' }}>⚠ {f.last_error}</span>
                    : f.last_synced_at ? `${f.last_count ?? 0} events · synced ${new Date(f.last_synced_at).toLocaleString()}` : 'Not synced yet'}
                </div>
              </div>
              {confirmRemove === f.id ? (
                <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12 }}>Remove it and its events from the calendar?</span>
                  <button style={small} onClick={() => setConfirmRemove(null)}>Keep</button>
                  <button style={{ ...small, color: '#b91c1c' }} onClick={() => remove(f.id)}>Remove</button>
                </span>
              ) : (
                <span style={{ display: 'flex', gap: 6 }}>
                  <button style={small} disabled={!!busy || !f.enabled} onClick={() => sync(f.id)}>Sync now</button>
                  <button style={small} disabled={!!busy} onClick={() => setConfirmRemove(f.id)}>Remove</button>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: 12.5, color: 'var(--ink-2)', alignItems: 'center' }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                Shows as
                <select value={f.kind} disabled={!!busy} onChange={e => update(f.id, { kind: e.target.value as EventKind })} style={{ fontSize: 12.5, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}>
                  {EVENT_KINDS.map(k => <option key={k} value={k}>{KIND_META[k].label}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <input type="checkbox" checked={f.is_public} disabled={!!busy} onChange={e => update(f.id, { is_public: e.target.checked })} /> Public (visitors can see)
              </label>
              <label style={{ display: 'flex', gap: 5, alignItems: 'center' }} title="Puts “Farming Circle” and similar events in the matching circle">
                <input type="checkbox" checked={f.match_circles} disabled={!!busy} onChange={e => update(f.id, { match_circles: e.target.checked })} /> Match circles by name
              </label>
              <label style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                <input type="checkbox" checked={f.enabled} disabled={!!busy} onChange={e => update(f.id, { enabled: e.target.checked })} /> Keep syncing
              </label>
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div style={{ marginTop: 14, padding: 14, border: '1px solid var(--m14)', borderRadius: 10, background: 'var(--bg-2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={label} htmlFor="feed-name">Name</label>
            <input id="feed-name" style={input} value={name} maxLength={120} placeholder="e.g. Actopia Program" onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label style={label} htmlFor="feed-url">Calendar link</label>
            <input id="feed-url" style={input} value={url} maxLength={2000} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" onChange={e => setUrl(e.target.value)} />
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 5, lineHeight: 1.5 }}>
              Google Calendar: <strong>Settings and sharing</strong> › <strong>Integrate calendar</strong>. Use the <strong>public address in iCal format</strong> (the calendar must show “all event details” publicly), or the <strong>secret address</strong> to keep it private. A Google “share” or embed link works too.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', fontSize: 12.5 }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              Shows as
              <select value={kind} onChange={e => setKind(e.target.value as EventKind)} style={{ fontSize: 12.5, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}>
                {EVENT_KINDS.map(k => <option key={k} value={k}>{KIND_META[k].label}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} /> Public (visitors can see)
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={add} disabled={!!busy} style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--m14)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
              {busy === 'new' ? 'Adding…' : 'Link calendar'}
            </button>
            {feeds.length > 0 && <button style={small} onClick={() => { setAdding(false); setError('') }}>Cancel</button>}
          </div>
        </div>
      ) : (
        <button style={{ ...small, marginTop: 14 }} onClick={() => setAdding(true)}>+ Link a calendar</button>
      )}
    </ModalShell>
  )
}
