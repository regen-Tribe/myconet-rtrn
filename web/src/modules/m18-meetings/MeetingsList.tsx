import Link from 'next/link'
import { fmtDate } from '@/core/lib/format'
import type { MeetingListItem, MeetingStatus } from './types'

const STATUS: Record<MeetingStatus, { label: string; color: string }> = {
  processing: { label: 'Transcribing', color: '#b45309' },
  done: { label: 'Ready', color: '#15803d' },
  error: { label: 'Failed', color: '#b91c1c' },
}

function StatusPill({ status }: { status: MeetingStatus }) {
  const s = STATUS[status] ?? STATUS.processing
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: `color-mix(in srgb, ${s.color} 12%, var(--surface))`, padding: '2px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

export default function MeetingsList({ meetings }: { meetings: MeetingListItem[] }) {
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 20px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--m18)', background: 'color-mix(in srgb, var(--m18) 10%, var(--surface))', padding: '3px 10px', borderRadius: 20, marginBottom: 12 }}>
            M18 · Meetings
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', lineHeight: 1.1, margin: 0 }}>Meeting notes</h1>
        </div>
        <Link href="/meetings/upload" style={{ padding: '10px 16px', borderRadius: 8, background: 'var(--m18)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Upload recording
        </Link>
      </div>
      {meetings.length === 0 ? (
        <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '40px 24px', textAlign: 'center', color: 'color-mix(in srgb, var(--ink) 60%, transparent)', fontSize: 14, background: 'var(--surface)' }}>
          No meeting notes yet. Upload a recording and the transcript and summary appear here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {meetings.map(m => (
            <Link key={m.id} href={`/meetings/${m.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ border: '1px solid var(--rule)', borderRadius: 12, padding: '16px 18px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                  <div style={{ fontSize: 12.5, color: 'color-mix(in srgb, var(--ink) 55%, transparent)' }}>
                    {fmtDate(m.meeting_date ?? m.created_at)}{m.attendees.length > 0 && ` · ${m.attendees.join(', ')}`}
                  </div>
                </div>
                <StatusPill status={m.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
