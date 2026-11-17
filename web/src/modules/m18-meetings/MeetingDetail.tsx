import Link from 'next/link'
import { fmtDate } from '@/core/lib/format'
import type { Meeting } from './types'

const sectionStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
  color: 'color-mix(in srgb, var(--ink) 55%, transparent)', margin: '28px 0 12px',
}

export default function MeetingDetail({ meeting: m }: { meeting: Meeting }) {
  // Action items grouped by who they're for
  const byPerson: Record<string, string[]> = {}
  for (const item of m.action_items ?? []) (byPerson[item.speaker || 'Action items'] ??= []).push(item.text)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 80px' }}>
      <Link href="/meetings" style={{ fontSize: 13, color: 'var(--m18)', textDecoration: 'none' }}>← Meetings</Link>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 27, color: 'var(--ink)', lineHeight: 1.15, margin: '16px 0 8px' }}>{m.title}</h1>
      <div style={{ fontSize: 13, color: 'color-mix(in srgb, var(--ink) 55%, transparent)' }}>
        {fmtDate(m.meeting_date ?? m.created_at)}{m.attendees.length > 0 && ` · ${m.attendees.join(', ')}`}
      </div>
      {m.needs_review && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'color-mix(in srgb, var(--m18) 10%, var(--surface))', color: 'var(--m18)', fontSize: 13.5, lineHeight: 1.5 }}>
          Auto-captured from a direct recording — set the circle and edit the details as needed.
        </div>
      )}
      {m.status === 'processing' && (
        <div style={{ marginTop: 28, padding: '18px 20px', borderRadius: 12, background: 'color-mix(in srgb, #b45309 10%, var(--surface))', color: '#92400e', fontSize: 14 }}>
          Transcribing this recording — check back in a few minutes.
        </div>
      )}
      {m.status === 'error' && (
        <div style={{ marginTop: 28, padding: '18px 20px', borderRadius: 12, background: 'color-mix(in srgb, #b91c1c 10%, var(--surface))', color: '#991b1b', fontSize: 14 }}>
          This recording couldn’t be transcribed.{m.error ? ` (${m.error})` : ''}
        </div>
      )}
      {m.status === 'done' && (
        <>
          {m.summary && (
            <>
              <div style={sectionStyle}>Summary</div>
              <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{m.summary}</div>
            </>
          )}
          {Object.keys(byPerson).length > 0 && (
            <>
              <div style={sectionStyle}>Action items</div>
              {Object.entries(byPerson).map(([person, items]) => (
                <div key={person} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{person}</div>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {items.map((t, i) => <li key={i} style={{ fontSize: 14, lineHeight: 1.6, color: 'color-mix(in srgb, var(--ink) 85%, transparent)' }}>{t}</li>)}
                  </ul>
                </div>
              ))}
            </>
          )}
          {m.transcript && (
            <>
              <div style={sectionStyle}>Transcript</div>
              <pre style={{ fontSize: 13, lineHeight: 1.65, color: 'color-mix(in srgb, var(--ink) 80%, transparent)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--mono, ui-monospace, monospace)', background: 'color-mix(in srgb, var(--ink) 4%, var(--surface))', padding: '16px 18px', borderRadius: 12, margin: 0 }}>
                {m.transcript}
              </pre>
            </>
          )}
        </>
      )}
    </div>
  )
}
