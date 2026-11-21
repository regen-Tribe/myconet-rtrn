import { InlineIcon } from '@/core/components/v4'
import Link from 'next/link'

/** "Project manager (N)" on a circle, for its leads: opens the board's suggestions for that circle */
export function PmLink({ circle, count, color }: { circle: string; count: number | undefined; color: string }) {
  if (!count) return null
  return (
    <Link href={`/operations?circle=${circle}#pm`} style={{
      alignSelf: 'flex-start', fontSize: 12, fontWeight: 600, color, textDecoration: 'none', whiteSpace: 'nowrap',
      border: `1px solid color-mix(in srgb, ${color} 35%, var(--rule))`, borderRadius: 20, padding: '3px 10px',
    }}>
      <InlineIcon name="compass" />Project manager ({count})
    </Link>
  )
}
