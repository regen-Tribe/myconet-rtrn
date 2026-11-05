'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { COMMUNITY_NAME } from '@/core/lib/instance'

/**
 * "Ask <community>" chat, on every portal page. Answers come from /api/assistant
 * (Blueprint answers + the documents the person may see), streamed as they're written.
 * Visitors get two questions before signing in.
 */

interface Message { role: 'user' | 'assistant'; content: string }

/** Other parts of the portal (e.g. the top bar search) open the chat with a question: window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: question })) */
export const ASK_EVENT = 'myconet:ask'

const STORE_KEY = 'myconet-assistant'
const SUGGESTIONS = [
  `What is ${COMMUNITY_NAME} about?`,
  'Where is the land, and what is it like?',
  'How can I join or visit?',
  'What does a typical day look like?',
]

/** **bold**, "- " / "• " bullets and paragraphs, rendered as React elements (no HTML injection) */
function Formatted({ text }: { text: string }) {
  const inline = (line: string) => line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part)
  const blocks: React.ReactNode[] = []
  let bullets: string[] = []
  const flush = () => {
    if (bullets.length) blocks.push(<ul key={blocks.length} style={{ margin: '4px 0', paddingLeft: 18 }}>{bullets.map((b, i) => <li key={i}>{inline(b)}</li>)}</ul>)
    bullets = []
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const bullet = line.match(/^(?:[-•*]|\d+\.)\s+(.*)/)
    if (bullet) { bullets.push(bullet[1]); continue }
    flush()
    if (line) blocks.push(<p key={blocks.length} style={{ margin: '0 0 6px' }}>{inline(line.replace(/^#+\s*/, ''))}</p>)
  }
  flush()
  return <>{blocks}</>
}

export default function AssistantChat({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [needLogin, setNeedLogin] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Keep the conversation while moving between pages (this browser tab only)
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? 'null') as { messages?: Message[] } | null
      if (saved?.messages?.length) setMessages(saved.messages)
    } catch { /* storage unavailable */ }
  }, [])
  useEffect(() => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ messages: messages.slice(-20) })) } catch { /* storage unavailable */ }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  // The latest ask(), for the ASK_EVENT listener below
  const askRef = useRef<(q: string) => void>(() => {})

  const ask = async (question: string) => {
    const q = question.trim()
    if (!q || busy) return
    setError(''); setInput('')
    const history: Message[] = [...messages, { role: 'user', content: q }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setBusy(true)
    try {
      const resp = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.filter(m => m.content) }),
      })
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({})) as { error?: string; needLogin?: boolean }
        if (err.needLogin) setNeedLogin(true)
        throw new Error(err.error ?? 'The assistant is not available right now.')
      }
      const left = resp.headers.get('X-Assistant-Remaining')
      if (left != null) setRemaining(Number(left))
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let answer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        answer += decoder.decode(value, { stream: true })
        setMessages([...history, { role: 'assistant', content: answer }])
      }
      if (!answer.trim()) throw new Error("The assistant didn't answer. Try asking again.")
    } catch (e) {
      setMessages(history)
      setError((e as Error).message)
    }
    setBusy(false)
  }

  askRef.current = ask
  useEffect(() => {
    const onAsk = (e: Event) => { setOpen(true); askRef.current(String((e as CustomEvent).detail ?? '')) }
    window.addEventListener(ASK_EVENT, onAsk)
    return () => window.removeEventListener(ASK_EVENT, onAsk)
  }, [])

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} aria-label={`Ask ${COMMUNITY_NAME}`} style={{
        position: 'fixed', right: 20, bottom: 20, zIndex: 150, display: 'flex', alignItems: 'center', gap: 8,
        padding: '11px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
        background: 'var(--accent-color)', color: '#fff', fontSize: 14, fontWeight: 700,
        boxShadow: '0 6px 20px rgba(0,0,0,.18)',
      }}>
        <span aria-hidden>💬</span> Ask {COMMUNITY_NAME}
      </button>
    )
  }

  return (
    <div role="dialog" aria-label={`Ask ${COMMUNITY_NAME}`} style={{
      position: 'fixed', right: 16, bottom: 16, zIndex: 150, width: 'min(400px, calc(100vw - 32px))', height: 'min(600px, calc(100vh - 100px))',
      display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--rule)',
      borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,.22)', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Ask {COMMUNITY_NAME}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Answers from the community&rsquo;s Blueprint and documents</div>
        </div>
        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); setError('') }} disabled={busy} title="Start a new conversation"
            style={{ background: 'none', border: '1px solid var(--rule)', borderRadius: 8, fontSize: 11.5, color: 'var(--ink-3)', padding: '4px 8px', cursor: 'pointer' }}>New</button>
        )}
        <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--ink-3)', cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, margin: '0 0 12px' }}>
              Hi! Ask me anything about {COMMUNITY_NAME}. I answer from the community&rsquo;s own Blueprint and documents, and say where each answer comes from.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => ask(s)} style={{ textAlign: 'left', fontSize: 13, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--rule)', background: 'var(--bg-2)', color: 'var(--ink)', cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%',
            background: m.role === 'user' ? 'var(--accent-color)' : 'var(--bg-2)', color: m.role === 'user' ? '#fff' : 'var(--ink)',
            borderRadius: 14, padding: '9px 12px', fontSize: 13.5, lineHeight: 1.55, whiteSpace: m.role === 'user' ? 'pre-wrap' : undefined,
          }}>
            {m.role === 'user' ? m.content : m.content ? <Formatted text={m.content} /> : <span style={{ color: 'var(--ink-3)' }}>Looking through the community&rsquo;s material…</span>}
          </div>
        ))}
        {error && (
          <div style={{ fontSize: 12.5, color: '#b91c1c', background: '#b91c1c12', border: '1px solid #b91c1c40', borderRadius: 10, padding: '8px 10px' }}>
            {error}
            {needLogin && <div style={{ marginTop: 8 }}><Link href="/auth/login" style={{ fontWeight: 700, color: 'var(--accent-color)' }}>Sign in or create an account →</Link></div>}
          </div>
        )}
      </div>

      <form onSubmit={e => { e.preventDefault(); ask(input) }} style={{ borderTop: '1px solid var(--rule)', padding: 10 }}>
        {!isLoggedIn && !needLogin && (
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: '0 2px 6px' }}>
            {remaining == null ? 'Visitors can ask 2 questions.' : `${remaining} free question${remaining === 1 ? '' : 's'} left.`}{' '}
            <Link href="/auth/login" style={{ color: 'var(--accent-color)' }}>Sign in</Link> to keep asking.
          </div>
        )}
        <div style={{ fontSize: 10.5, color: 'var(--ink-4)', margin: '0 2px 6px' }}>Questions are saved so the community can improve its answers.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a question…" maxLength={2000} disabled={busy || needLogin}
            style={{ flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--rule)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 14, outline: 'none' }} />
          <button type="submit" disabled={busy || needLogin || !input.trim()} style={{
            padding: '0 14px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 13,
            background: busy || !input.trim() ? 'var(--bg-2)' : 'var(--accent-color)', color: busy || !input.trim() ? 'var(--ink-4)' : '#fff', cursor: busy ? 'wait' : 'pointer',
          }}>{busy ? '…' : 'Ask'}</button>
        </div>
      </form>
    </div>
  )
}
