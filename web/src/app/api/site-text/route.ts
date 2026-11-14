import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/core/lib/supabase/server'
import { isCircleAdmin } from '@/core/lib/roles'
import { publicUrl, readPages, startSite } from '@/modules/m04-blueprint/lib/site-text'

// Blueprint import from a website (see lib/site-text.ts and lib/site-crawl.ts).
// { url } starts: the home page and the site's page list. { url, pages } reads a batch.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to scan a website.' }, { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (!isCircleAdmin(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Only admins and circle leads can scan a website.' }, { status: 403 })
  }

  let body: { url?: unknown; pages?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  const raw = typeof body.url === 'string' ? body.url.trim() : ''
  const start = publicUrl(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  if (!start) return NextResponse.json({ error: 'That doesn’t look like a public website address.' }, { status: 400 })

  try {
    if (Array.isArray(body.pages)) {
      return NextResponse.json(await readPages(start, body.pages.filter((p): p is string => typeof p === 'string')))
    }
    return NextResponse.json(await startSite(start))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 })
  }
}
