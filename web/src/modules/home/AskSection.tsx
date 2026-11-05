'use client'

import { COMMUNITY_NAME } from '@/core/lib/instance'
import { ASK_EVENT } from '@/modules/assistant/AssistantChat'

/** Landing / Home section for the portal assistant: what it does, and questions to try. */
export default function AskSection() {
  const ask = (q: string) => window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: q }))
  const tries = [
    `What is ${COMMUNITY_NAME} about?`,
    'Where is the land, and what is it like?',
    'How can I visit or join?',
    'What are the circles and what do they do?',
    'What does a typical day look like?',
    'What should I bring?',
  ]
  return (
    <section id="ask" style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 28px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-color)', marginBottom: 10 }}>
            💬 Ask {COMMUNITY_NAME}
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 3.6vw, 42px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.025em', margin: '0 0 12px', color: 'var(--ink)' }}>
            Ask anything. Get answers from the community itself.
          </h2>
          <p style={{ fontSize: 15.5, color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 16px', maxWidth: '54ch' }}>
            The assistant reads {COMMUNITY_NAME}&rsquo;s Blueprint and documents and answers in your language, saying where each answer comes from. If the material doesn&rsquo;t cover something, it says so, and the team sees the question so it can fill the gap.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.8 }}>
            <li>Opens from the <strong>Ask {COMMUNITY_NAME}</strong> button on every page, or the search bar (⌘K)</li>
            <li>Visitors can ask 2 questions; members can keep asking</li>
            <li>Sensitive documents are only used for admins and circle leads</li>
          </ul>
        </div>
        <div style={{ border: '1px solid var(--rule)', borderRadius: 16, background: 'var(--surface)', padding: 18, boxShadow: '0 8px 28px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Try a question</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tries.map(q => (
              <button key={q} onClick={() => ask(q)} style={{
                textAlign: 'left', fontSize: 14, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                border: '1px solid var(--rule)', background: 'var(--bg-2)', color: 'var(--ink)',
              }}>{q} <span style={{ color: 'var(--accent-color)', fontWeight: 700 }}>→</span></button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
