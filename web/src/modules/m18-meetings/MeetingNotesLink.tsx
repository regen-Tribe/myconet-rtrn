import Link from 'next/link'

/** "📝 Meeting notes (N)" on a circle: opens /meetings filtered to it */
export function MeetingNotesLink({ circle, count, color }: { circle: string; count: number | undefined; color: string }) {
  return (
    <Link href={`/meetings?circle=${circle}`} style={{
      alignSelf: 'flex-start', fontSize: 12, fontWeight: 600, color, textDecoration: 'none', whiteSpace: 'nowrap',
      border: `1px solid color-mix(in srgb, ${color} 35%, var(--rule))`, borderRadius: 20, padding: '3px 10px',
    }}>
      📝 Meeting notes{count ? ` (${count})` : ''}
    </Link>
  )
}
