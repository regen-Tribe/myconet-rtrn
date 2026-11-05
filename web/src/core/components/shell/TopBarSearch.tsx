'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/client'
import { useCircles } from '@/core/components/CirclesProvider'
import { CLUBHOUSE, MEMBER_MODULES } from '@/core/lib/nav'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import { ASK_EVENT } from '@/modules/assistant/AssistantChat'

/**
 * Top bar search: pages, members, projects, proposals, events and circles, each
 * fetched with the viewer's own session (RLS decides what they may see). The last
 * result always hands the question to the "Ask <community>" assistant.
 * ⌘K / Ctrl+K focuses it; arrows move; Enter opens; Esc closes.
 */

interface Hit { group: string; label: string; detail?: string; href?: string; ask?: string }

const PAGES = [...CLUBHOUSE, ...MEMBER_MODULES].filter(m => m.href).map(m => ({ name: m.name, href: m.href as string }))

export default function TopBarSearch() {
  const router = useRouter()
  const circles = useCircles()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hits, setHits] = useState<Hit[]>([])
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  // ⌘K / Ctrl+K from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus(); setOpen(true) }
    }
    const onClick = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onClick) }
  }, [])

  // Instant matches (pages, circles); database matches after a short pause in typing
  const local = useMemo<Hit[]>(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    return [
      ...PAGES.filter(p => p.name.toLowerCase().includes(term)).map(p => ({ group: 'Pages', label: p.name, href: p.href })),
      ...circles.list.filter(c => c.name.toLowerCase().includes(term)).map(c => ({ group: 'Circles', label: `${c.emoji} ${c.name}`, href: '/org' })),
    ]
  }, [q, circles])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setHits([]); return }
    let cancelled = false
    const t = setTimeout(async () => {
      const supabase = createClient()
      // Commas and brackets would break the filter syntax, so search on the plain words
      const like = `%${term.replace(/[%_,()]/g, ' ').trim()}%`
      const [members, projects, proposals, events] = await Promise.all([
        supabase.from('user_profiles').select('username, first_name, headline').or(`username.ilike.${like},first_name.ilike.${like},headline.ilike.${like}`).limit(5),
        supabase.from('projects').select('id, title, status').ilike('title', like).limit(5),
        supabase.from('proposals').select('id, title, status').ilike('title', like).limit(4),
        supabase.from('events').select('id, title, starts_at').ilike('title', like).order('starts_at', { ascending: false }).limit(4),
      ])
      if (cancelled) return
      setHits([
        ...(members.data ?? []).map(m => ({ group: 'Members', label: m.first_name || m.username, detail: m.headline ?? `@${m.username}`, href: `/u/${m.username}` })),
        ...(projects.data ?? []).map(p => ({ group: 'Projects', label: p.title, detail: p.status?.replace('_', ' '), href: `/ops/${p.id}` })),
        ...(proposals.data ?? []).map(p => ({ group: 'Proposals', label: p.title, detail: p.status, href: '/governance' })),
        ...(events.data ?? []).map(e => ({ group: 'Calendar', label: e.title, detail: new Date(e.starts_at).toLocaleDateString(), href: `/events?event=${e.id}` })),
      ])
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [q])

  const results: Hit[] = q.trim() ? [...local, ...hits, { group: 'Ask', label: `Ask ${COMMUNITY_NAME}: “${q.trim()}”`, ask: q.trim() }] : []
  useEffect(() => { setActive(0) }, [q])

  const choose = (h: Hit | undefined) => {
    if (!h) return
    setOpen(false); setQ('')
    inputRef.current?.blur()
    if (h.ask) window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: h.ask }))
    else if (h.href) router.push(h.href)
  }

  return (
    <div ref={boxRef} className="topbar-search" style={{ flex: 1, maxWidth: 420, marginLeft: 16, position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999,
        border: `1px solid ${open ? 'var(--accent-color)' : 'var(--rule)'}`, background: open ? 'var(--surface)' : 'var(--bg-2)', color: 'var(--ink-3)',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7" />
          <line x1="20" y1="20" x2="16.6" y2="16.6" />
        </svg>
        <input ref={inputRef} value={q} placeholder="Search members, projects, events… or ask a question"
          aria-label="Search" role="combobox" aria-expanded={open && results.length > 0}
          onChange={e => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
            else if (e.key === 'Enter') { e.preventDefault(); choose(results[active]) }
            else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
          }}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 13 }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-4)', padding: '1px 5px', border: '1px solid var(--rule)', borderRadius: 4, flexShrink: 0 }}>⌘K</span>
      </div>

      {open && results.length > 0 && (
        <div role="listbox" style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 60, maxHeight: 420, overflowY: 'auto',
          background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,.14)', padding: 6,
        }}>
          {results.map((h, i) => (
            <div key={`${h.group}-${i}`}>
              {(i === 0 || results[i - 1].group !== h.group) && h.group !== 'Ask' && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', padding: '8px 10px 4px' }}>{h.group}</div>
              )}
              <div role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onMouseDown={e => { e.preventDefault(); choose(h) }}
                style={{
                  display: 'flex', alignItems: 'baseline', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  background: i === active ? 'var(--bg-2)' : 'transparent', borderTop: h.group === 'Ask' ? '1px solid var(--rule-soft)' : undefined, marginTop: h.group === 'Ask' ? 4 : 0,
                }}>
                <span style={{ fontSize: 13.5, fontWeight: h.group === 'Ask' ? 700 : 500, color: h.group === 'Ask' ? 'var(--accent-color)' : 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {h.group === 'Ask' ? '💬 ' : ''}{h.label}
                </span>
                {h.detail && <span style={{ fontSize: 11.5, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0 }}>{h.detail}</span>}
              </div>
            </div>
          ))}
          {q.trim().length >= 2 && hits.length === 0 && local.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '6px 10px' }}>No direct matches. Try asking instead ↑</div>
          )}
        </div>
      )}
    </div>
  )
}
