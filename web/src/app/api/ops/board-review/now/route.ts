import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { reviewCircle } from '@/modules/m07-ops/lib/board-review'
import { circleDecider } from '@/modules/m07-ops/lib/pm-access'

// "Review again" (v4.120.0): a circle's lead or an admin asks the project manager to review that circle's board now,
// not at the next 10-minute sweep, so it sees what they just decided. Same review as the sweep (lib/board-review.ts);
// one circle per request (a Worker may make only 50 outside calls per request), the page asks for each circle in turn.
export async function POST(req: NextRequest) {
  const me = await circleDecider()
  if (!me) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const { circle } = await req.json().catch(() => ({})) as { circle?: string }
  if (!circle) return NextResponse.json({ error: 'No circle.' }, { status: 400 })
  if (!me.canDecide(circle)) return NextResponse.json({ error: 'Only this circle’s leads and admins can ask for a review.' }, { status: 403 })
  const admin = createServiceClient()
  const r = await reviewCircle(admin, circle, { timeoutMs: 90_000 })
  if (!r.ok) return NextResponse.json({ circle, ...r, error: r.errors.join(' · ') || 'The review didn’t finish.' }, { status: 502 })
  return NextResponse.json({ circle, ...r })
}
