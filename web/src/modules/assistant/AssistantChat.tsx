'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import { getAgentContext, INSTRUCT_EVENT, type AgentContext } from '@/core/lib/agent-context'

/**
 * "Ask <community>" chat, on every portal page. Answers come from /api/assistant
 * (Blueprint answers + the documents the person may see), streamed as they're written.
 * Visitors get two questions before signing in. Signed in, the Do tab lets a person tell the agent to
 * change the board ("merge the 4 elements project into 5 senses"): /api/agent/plan proposes the changes
 * on a confirm card, /api/agent/do makes them with the person's own rights, each with an Undo.
 * Since v4.36.0 it's a small floating dot that opens on Do for people who are signed in, and every Do request says
 * what the person is looking at (core/lib/agent-context.ts: the page, the open task or project), so "this" works.
 * Other parts of the portal hand it an instruction with instructAgent() (e.g. "Tell the agent" on a suggestion).
 */

interface Message { role: 'user' | 'assistant'; content: string }

interface Change { action: Record<string, unknown>; summary: string; blocked: string | null }
interface DoResult { summary: string; ok: boolean; error?: string; undo?: string; undone?: boolean }
interface DoMessage { role: 'user' | 'assistant'; content: string; instruction?: string; changes?: Change[]; state?: 'proposed' | 'doing' | 'done' | 'cancelled'; results?: DoResult[]
  /** A project-manager suggestion this answers: closed once the changes are made */
  suggestionId?: string }
const DO_KEY = 'myconet-agent-do'
const DO_EXAMPLES = [
  'Merge the 4 elements project into the 5 senses project',
  'Give the fridge checklist task to Sonia, due Friday',
  'Confirm all the kitchen drafts',
]

/** The confirm card for a Do request: what will change, Do it / Cancel, then what happened with Undo */
function DoCard({ m, onDo, onCancel, onUndo }: { m: DoMessage; onDo: () => void; onCancel: () => void; onUndo: (r: DoResult) => void }) {
  if (!m.changes?.length) return null
  const allowed = m.changes.filter(c => !c.blocked)
  const cardBtn = (primary: boolean): React.CSSProperties => ({ fontSize: 12.5, fontWeight: 700, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', border: primary ? 'none' : '1px solid var(--rule)', background: primary ? 'var(--accent-color)' : 'var(--surface)', color: primary ? '#fff' : 'var(--ink-2)' })
  return (
    <div style={{ marginTop: 8, background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10, padding: '8px 10px' }}>
      {(m.results ?? m.changes.map(c => ({ summary: c.summary, ok: !c.blocked, error: c.blocked ?? undefined }) as DoResult)).map((r, i) => (
        <div key={i} style={{ fontSize: 12.5, lineHeight: 1.45, padding: '4px 0', borderTop: i ? '1px solid var(--rule)' : 'none', color: r.error && m.state !== 'done' ? 'var(--ink-4)' : 'var(--ink)' }}>
          <span aria-hidden>{m.state === 'done' ? (r.undone ? '↩︎ ' : r.ok ? '✓ ' : '✗ ') : '• '}</span>{r.summary}
          {r.error && <div style={{ fontSize: 11.5, color: m.state === 'done' ? '#b91c1c' : 'var(--ink-4)' }}>{r.error}</div>}
          {m.state === 'done' && r.ok && r.undo && !r.undone && (
            <button onClick={() => onUndo(r)} style={{ ...cardBtn(false), padding: '2px 8px', fontSize: 11.5, marginLeft: 6 }}>Undo</button>
          )}
        </div>
      ))}
      {m.state === 'proposed' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {allowed.length > 0 && <button onClick={onDo} style={cardBtn(true)}>Do it{allowed.length < m.changes.length ? ` (${allowed.length})` : ''}</button>}
          <button onClick={onCancel} style={cardBtn(false)}>Cancel</button>
        </div>
      )}
      {m.state === 'doing' && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>Making the changes…</div>}
      {m.state === 'cancelled' && <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6 }}>Cancelled: nothing changed.</div>}
    </div>
  )
}

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
  // Signed in, the agent opens on Do: telling it what to change is what people come for (v4.36.0)
  const [mode, setMode] = useState<'ask' | 'do'>(isLoggedIn ? 'do' : 'ask')
  const [doMessages, setDoMessages] = useState<DoMessage[]>([])
  const router = useRouter()
  const listRef = useRef<HTMLDivElement>(null)

  // Keep the conversation while moving between pages (this browser tab only)
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? 'null') as { messages?: Message[] } | null
      if (saved?.messages?.length) setMessages(saved.messages)
      const savedDo = JSON.parse(sessionStorage.getItem(DO_KEY) ?? 'null') as { messages?: DoMessage[] } | null
      if (savedDo?.messages?.length) setDoMessages(savedDo.messages.map(m => (m.state === 'doing' || m.state === 'proposed' ? { ...m, state: 'cancelled' } : m)))
    } catch { /* storage unavailable */ }
  }, [])
  useEffect(() => {
    try { sessionStorage.setItem(DO_KEY, JSON.stringify({ messages: doMessages.slice(-20) })) } catch { /* storage unavailable */ }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [doMessages])
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

  const instruct = async (text: string, extra: AgentContext = {}) => {
    const t = text.trim()
    if (!t || busy) return
    setError(''); setInput('')
    const history = doMessages.filter(m => m.content).map(m => ({ role: m.role, content: m.content }))
    setDoMessages(prev => [...prev, { role: 'user', content: t }])
    setBusy(true)
    try {
      // What's on screen: the address, plus what the page and its pop-ups say they show
      const context = { path: window.location.pathname + window.location.search, ...getAgentContext(), ...extra }
      const resp = await fetch('/api/agent/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instruction: t, history, context }) })
      const data = await resp.json().catch(() => ({})) as { reply?: string; changes?: Change[]; error?: string }
      if (!resp.ok) throw new Error(data.error ?? 'The agent is not available right now.')
      setDoMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? '', instruction: t, changes: data.changes ?? [], state: data.changes?.length ? 'proposed' : undefined, suggestionId: extra.suggestion_id }])
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  const patchDo = (i: number, patch: Partial<DoMessage>) => setDoMessages(prev => prev.map((m, j) => (j === i ? { ...m, ...patch } : m)))
  const doIt = async (i: number) => {
    const m = doMessages[i]
    patchDo(i, { state: 'doing' }); setError('')
    try {
      const resp = await fetch('/api/agent/do', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actions: (m.changes ?? []).filter(c => !c.blocked).map(c => c.action), instruction: m.instruction }) })
      const data = await resp.json().catch(() => ({})) as { results?: DoResult[]; error?: string }
      if (!resp.ok) throw new Error(data.error ?? 'The changes didn’t go through.')
      patchDo(i, { state: 'done', results: data.results ?? [] })
      // It answered a project-manager suggestion: close it, keeping what the lead asked for instead
      if (m.suggestionId && (data.results ?? []).some(r => r.ok)) {
        await fetch(`/api/ops/suggestions/${m.suggestionId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'redirect', note: m.instruction }) }).catch(() => {})
      }
      router.refresh()
    } catch (e) {
      patchDo(i, { state: 'proposed' }); setError((e as Error).message)
    }
  }
  const undo = async (i: number, r: DoResult) => {
    const resp = await fetch(`/api/ops/agent-actions/${r.undo}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'undo' }) })
    const data = await resp.json().catch(() => ({})) as { error?: string }
    if (!resp.ok) { setError(data.error ?? 'Couldn’t undo that.'); return }
    patchDo(i, { results: (doMessages[i].results ?? []).map(x => (x === r ? { ...x, undone: true } : x)) })
    router.refresh()
  }

  askRef.current = ask
  const instructRef = useRef<(t: string, c?: AgentContext) => void>(() => {})
  instructRef.current = instruct
  useEffect(() => {
    const onAsk = (e: Event) => { setOpen(true); setMode('ask'); askRef.current(String((e as CustomEvent).detail ?? '')) }
    const onInstruct = (e: Event) => {
      const d = (e as CustomEvent).detail as { text?: string; ctx?: AgentContext } | undefined
      setOpen(true); setMode('do'); instructRef.current(String(d?.text ?? ''), d?.ctx ?? {})
    }
    window.addEventListener(ASK_EVENT, onAsk)
    window.addEventListener(INSTRUCT_EVENT, onInstruct)
    return () => { window.removeEventListener(ASK_EVENT, onAsk); window.removeEventListener(INSTRUCT_EVENT, onInstruct) }
  }, [])

  if (!open) {
    return (
      // A small floating dot (v4.36.0): ask, or tell the agent to do something with what's on this page
      <button onClick={() => setOpen(true)} aria-label={isLoggedIn ? 'Ask or tell the MyCoNet agent' : `Ask ${COMMUNITY_NAME}`} title={isLoggedIn ? 'Ask or tell the agent' : `Ask ${COMMUNITY_NAME}`} style={{
        position: 'fixed', right: 20, bottom: 20, zIndex: 150, width: 52, height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: 'var(--accent-color)', color: '#fff', fontSize: 22,
        boxShadow: '0 6px 20px rgba(0,0,0,.18)',
      }}>
        <span aria-hidden>✦</span>
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
          <div style={{ fontSize: 15, fontWeight: 700 }}>{mode === 'do' ? 'Tell the agent' : `Ask ${COMMUNITY_NAME}`}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{mode === 'do' ? 'It sees what’s on this page, works with your own rights, and you confirm each change' : 'Answers from the community’s Blueprint and documents'}</div>
        </div>
        {isLoggedIn && (
          <div role="tablist" style={{ display: 'flex', border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden' }}>
            {(['ask', 'do'] as const).map(k => (
              <button key={k} role="tab" aria-selected={mode === k} onClick={() => { setMode(k); setError('') }} disabled={busy}
                style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 9px', border: 'none', cursor: 'pointer', background: mode === k ? 'var(--accent-color)' : 'var(--surface)', color: mode === k ? '#fff' : 'var(--ink-3)' }}>
                {k === 'ask' ? 'Ask' : 'Do'}
              </button>
            ))}
          </div>
        )}
        {(mode === 'do' ? doMessages.length > 0 : messages.length > 0) && (
          <button onClick={() => { if (mode === 'do') setDoMessages([]); else setMessages([]); setError('') }} disabled={busy} title="Start a new conversation"
            style={{ background: 'none', border: '1px solid var(--rule)', borderRadius: 8, fontSize: 11.5, color: 'var(--ink-3)', padding: '4px 8px', cursor: 'pointer' }}>New</button>
        )}
        <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--ink-3)', cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mode === 'do' && doMessages.length === 0 && (
          <div>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55, margin: '0 0 12px' }}>
              Tell me what to change: merge or rename projects, move tasks, give a task to someone, set dates, confirm drafts, add people to circles. I see what&rsquo;s on this page, so &ldquo;this task&rdquo; or &ldquo;these&rdquo; works. I&rsquo;ll show you exactly what I&rsquo;ll do first.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {DO_EXAMPLES.map(s => (
                <button key={s} onClick={() => setInput(s)} style={{ textAlign: 'left', fontSize: 13, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--rule)', background: 'var(--bg-2)', color: 'var(--ink)', cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {mode === 'do' && doMessages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%',
            background: m.role === 'user' ? 'var(--accent-color)' : 'var(--bg-2)', color: m.role === 'user' ? '#fff' : 'var(--ink)',
            borderRadius: 14, padding: '9px 12px', fontSize: 13.5, lineHeight: 1.55, whiteSpace: m.role === 'user' ? 'pre-wrap' : undefined,
          }}>
            {m.content}
            {m.role === 'assistant' && <DoCard m={m} onDo={() => doIt(i)} onCancel={() => patchDo(i, { state: 'cancelled' })} onUndo={r => undo(i, r)} />}
          </div>
        ))}
        {mode === 'do' && busy && <div style={{ alignSelf: 'flex-start', fontSize: 13, color: 'var(--ink-3)', padding: '4px 2px' }}>Looking at the board…</div>}
        {mode === 'ask' && messages.length === 0 && (
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
        {mode === 'ask' && messages.map((m, i) => (
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

      <form onSubmit={e => { e.preventDefault(); if (mode === 'do') instruct(input); else ask(input) }} style={{ borderTop: '1px solid var(--rule)', padding: 10 }}>
        {!isLoggedIn && !needLogin && (
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: '0 2px 6px' }}>
            {remaining == null ? 'Visitors can ask 2 questions.' : `${remaining} free question${remaining === 1 ? '' : 's'} left.`}{' '}
            <Link href="/auth/login" style={{ color: 'var(--accent-color)' }}>Sign in</Link> to keep asking.
          </div>
        )}
        <div style={{ fontSize: 10.5, color: 'var(--ink-4)', margin: '0 2px 6px' }}>{mode === 'do' ? 'Each change is logged with your name and can be undone.' : 'Questions are saved so the community can improve its answers.'}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder={mode === 'do' ? 'Tell the agent what to change…' : 'Ask a question…'} maxLength={2000} disabled={busy || needLogin}
            style={{ flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--rule)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 14, outline: 'none' }} />
          <button type="submit" disabled={busy || needLogin || !input.trim()} style={{
            padding: '0 14px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 13,
            background: busy || !input.trim() ? 'var(--bg-2)' : 'var(--accent-color)', color: busy || !input.trim() ? 'var(--ink-4)' : '#fff', cursor: busy ? 'wait' : 'pointer',
          }}>{busy ? '…' : mode === 'do' ? 'Send' : 'Ask'}</button>
        </div>
      </form>
    </div>
  )
}
