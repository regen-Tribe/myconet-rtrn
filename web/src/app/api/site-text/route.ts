import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/core/lib/supabase/server'
import { isCircleAdmin } from '@/core/lib/roles'
import { publicUrl, readSite } from '@/modules/m04-blueprint/lib/site-text'

// Blueprint import from a website: reads the site (see lib/site-text.ts) and returns its text
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to scan a website.' }, { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (!isCircleAdmin(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Only admins and circle leads can scan a website.' }, { status: 403 })
  }

  let body: { url?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  const raw = typeof body.url === 'string' ? body.url.trim() : ''
  const start = publicUrl(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  if (!start) return NextResponse.json({ error: 'That doesn’t look like a public website address.' }, { status: 400 })

  try {
    return NextResponse.json(await readSite(start))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 })
  }
}
