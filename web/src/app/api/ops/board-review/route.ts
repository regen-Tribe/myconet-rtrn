import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { reviewCircle } from '@/modules/m07-ops/lib/board-review'

// The project manager's review of one circle's board (lib/board-review.ts). Called by the database
// (private.board_review_sweep(), every 10 minutes, for circles that got new tasks) with the sweep key;
// it works while the caller waits, so the AI gets its full time. One circle per request.
export async function POST(req: NextRequest) {
  const secret = process.env.MEETINGS_SWEEP_SECRET
  if (!secret || req.headers.get('x-sweep-key') !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { circle } = await req.json().catch(() => ({})) as { circle?: string }
  if (!circle) return NextResponse.json({ error: 'no circle' }, { status: 400 })
  const admin = createServiceClient()
  const { data: row } = await admin.from('board_reviews').select('attempts').eq('circle', circle).maybeSingle()
  await admin.from('board_reviews').upsert({ circle, attempts: (row?.attempts ?? 0) + 1 }, { onConflict: 'circle' })
  const r = await reviewCircle(admin, circle, { timeoutMs: 90_000 })
  return NextResponse.json({ circle, ...r })
}
