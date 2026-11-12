'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/core/lib/supabase/client'
import type { EventComment } from './types'
import { COMMENT_SELECT, toComment } from './lib/queries'

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** The comment thread under an event: signed-in people read it, joining members and above write. */
export function EventComments({ eventId, userId, canComment, isAdmin, labelStyle }: {
  eventId: string
  userId: string | null
  canComment: boolean
  isAdmin: boolean
  labelStyle: React.CSSProperties
}) {
  const supabase = createClient()
  const [comments, setComments] = useState<EventComment[] | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return
    let live = true
    supabase.from('event_comments').select(COMMENT_SELECT).eq('event_id', eventId).order('created_at')
      .then(({ data }) => { if (live) setComments((data ?? []).map(toComment)) })
    return () => { live = false }
  }, [eventId, userId])

  async function post(e: React.FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return
    setBusy(true)
    setError('')
    const { data, error } = await supabase.from('event_comments').insert({ event_id: eventId, body }).select(COMMENT_SELECT).single()
    setBusy(false)
    if (error) { setError(error.code === '42501' ? 'Joining members and above can comment.' : error.message); return }
    setComments(list => [...(list ?? []), toComment(data)])
    setDraft('')
  }

  async function remove(id: string) {
    const { data } = await supabase.from('event_comments').delete().eq('id', id).select('id')
    if (data?.length) setComments(list => (list ?? []).filter(c => c.id !== id))
  }

  return (
    <div>
      <div style={labelStyle}>Comments{comments?.length ? ` · ${comments.length}` : ''}</div>
      {!userId ? (
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
          <Link href="/auth/login" style={{ color: 'var(--m14)', fontWeight: 600 }}>Sign in</Link> to read and leave comments.
        </div>
      ) : (
        <>
          {comments === null ? (
            <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>Loading…</div>
          ) : comments.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 10 }}>No comments yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
              {comments.map(c => {
                const name = c.author?.first_name ?? c.author?.username ?? 'A member'
                return (
                  <div key={c.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 10, padding: '8px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>
                      <span>
                        {c.author?.username
                          ? <Link href={`/u/${c.author.username}`} style={{ color: 'var(--ink-2)', fontWeight: 600, textDecoration: 'none' }}>{name}</Link>
                          : <strong style={{ color: 'var(--ink-2)' }}>{name}</strong>}
                        {' · '}{when(c.created_at)}
                      </span>
                      {(c.user_id === userId || isAdmin) && (
                        <button onClick={() => remove(c.id)} aria-label="Delete comment" style={{ fontSize: 12, color: 'var(--ink-4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
                      )}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.body}</div>
                  </div>
                )
              })}
            </div>
          )}
          {canComment ? (
            <form onSubmit={post} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                value={draft} onChange={e => setDraft(e.target.value)} rows={2} maxLength={2000}
                placeholder="Ask a question or share something about this event…" aria-label="Write a comment"
                style={{ fontSize: 14, fontFamily: 'inherit', lineHeight: 1.5, padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', resize: 'vertical' }}
              />
              {error && <div style={{ fontSize: 12.5, color: '#dc2626' }}>{error}</div>}
              <div>
                <button type="submit" disabled={busy || !draft.trim()} style={{ fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--m14)', color: '#fff', cursor: busy ? 'wait' : 'pointer', opacity: !draft.trim() ? 0.5 : 1 }}>
                  {busy ? 'Posting…' : 'Comment'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
              <Link href="/join" style={{ color: 'var(--m14)', fontWeight: 600 }}>Start joining</Link> to leave comments.
            </div>
          )}
        </>
      )}
    </div>
  )
}
