import { createClient } from '@/core/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DESIGN_REVIEW } from '@/core/lib/instance'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const onboarding = searchParams.get('onboarding')
  const redirectTo = searchParams.get('redirectTo') ?? '/home'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // New signups set up their profile in the real editor; with the design review they land on
      // My dashboard, whose next step is Start joining (design/decisions.md #25, #68)
      const dest = onboarding ? (DESIGN_REVIEW ? '/dashboard' : '/profile/edit') : redirectTo
      return NextResponse.redirect(`${origin}${dest}`)
    }
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
  }

  // No ?code=: a link Supabase sent without PKCE (a resent confirmation) carries
  // #access_token= instead, which only the browser sees. The browser keeps the #part
  // across this redirect, and the sign-in page finishes signing in from it.
  return NextResponse.redirect(`${origin}/auth/login${onboarding ? '?onboarding=1' : ''}`)
}
