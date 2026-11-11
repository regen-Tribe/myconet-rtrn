import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/core/lib/supabase/server'
import { syncCalendarFeeds } from '@/modules/m14-events/lib/feed-sync'

// "Sync now" on the calendar's feed settings: an admin syncs one feed (or all) straight away
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Only admins can sync calendars.' }, { status: 403 })

  let body: { feedId?: unknown } = {}
  try { body = await req.json() } catch { /* sync every due feed */ }
  const feedId = typeof body.feedId === 'string' ? body.feedId : undefined

  try {
    const results = await syncCalendarFeeds({ supabase, feedId, maxAgeMinutes: 0 })
    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
