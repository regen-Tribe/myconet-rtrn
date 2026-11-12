import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/core/lib/supabase/server'

/**
 * "Forgot password?" goes through the portal's server so each request is recorded in
 * auth_email_log (admins can see what was typed and why nothing arrived). The PKCE
 * verifier is set as a cookie on this response, so the link works in this browser.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  if (!email || email.length > 320 || !email.includes('@')) {
    return NextResponse.json({ error: 'Enter the email address you signed up with.' }, { status: 400 })
  }

  const supabase = await createClient()
  const origin = new URL(request.url).origin
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/reset-password` })

  await supabase.rpc('auth_email_log_add', {
    p_secret: process.env.CALENDAR_SYNC_SECRET ?? null, p_kind: 'reset', p_email: email,
    p_ok: !error, p_error: error ? `${error.status ?? ''} ${error.message}`.trim() : null,
  })

  if (error) {
    const message = error.status === 429
      ? 'Too many requests. Wait a minute and try again.'
      : error.message
    return NextResponse.json({ error: message }, { status: error.status && error.status < 500 ? error.status : 502 })
  }
  return NextResponse.json({ ok: true })
}
