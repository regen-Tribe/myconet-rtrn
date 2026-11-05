'use client'

import Link from 'next/link'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import { ASK_EVENT } from '@/modules/assistant/AssistantChat'
import { MODULE_GUIDE } from '@/modules/home/lib/module-guide'

/**
 * "Everything in the portal, at a glance": one card per module with a one-line
 * explanation, a jump to its preview further down the page, and a link to open it.
 * The last card is the assistant.
 */
export default function ModuleOverview() {
  const jump = (anchor: string) => anchor.split('|').map(id => document.getElementById(id)).find(Boolean)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    // No side padding of its own: the page section around it sets the gutters
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
        The portal at a glance
      </div>
      <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 42px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.025em', margin: '0 0 8px', color: 'var(--ink)' }}>
        Everything {COMMUNITY_NAME} runs on, in one place.
      </h2>
      <p style={{ fontSize: 15.5, color: 'var(--ink-2)', lineHeight: 1.6, maxWidth: '62ch', margin: '0 0 24px' }}>
        Each module looks after one part of neighborhood life. Tap <strong>See it</strong> for a preview further down, or open it straight away.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {MODULE_GUIDE.map(m => (
          <div key={m.num} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 16px', borderRadius: 12, border: '1px solid var(--rule)', borderTop: `3px solid ${m.color}`, background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, color: m.color }}>M{m.num}</span>
              <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--ink)' }}>{m.name}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0, flex: 1 }}>{m.what}</p>
            <div style={{ display: 'flex', gap: 12, fontSize: 12.5, fontWeight: 600 }}>
              <button onClick={() => jump(m.anchor)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink-3)', fontWeight: 600, fontSize: 12.5 }}>See it ↓</button>
              <Link href={m.href} style={{ color: m.color, textDecoration: 'none' }}>Open →</Link>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 16px', borderRadius: 12, border: '1px solid var(--accent-color)', background: 'color-mix(in srgb, var(--accent-color) 7%, var(--surface))' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 14 }}>💬</span>
            <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--ink)' }}>Ask {COMMUNITY_NAME}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0, flex: 1 }}>
            Questions about the place, the plans or how to take part? Answered from the community&rsquo;s own Blueprint and documents.
          </p>
          <div style={{ display: 'flex', gap: 12, fontSize: 12.5, fontWeight: 600 }}>
            <button onClick={() => jump('ask')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ink-3)', fontWeight: 600, fontSize: 12.5 }}>See it ↓</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: `What is ${COMMUNITY_NAME} about?` }))}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent-color)', fontWeight: 700, fontSize: 12.5 }}>Ask now →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
