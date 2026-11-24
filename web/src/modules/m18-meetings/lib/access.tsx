import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/core/lib/supabase/server'
import { isJoiningOrAbove } from '@/core/lib/roles'
import { moduleOn } from '@/core/lib/modules'
import { COMMUNITY_NAME, DESIGN_REVIEW } from '@/core/lib/instance'
import { PageHeader } from '@/core/components/v4'

type Access = { locked: false; supabase: SupabaseClient; user: User } | { locked: true; signedIn: boolean }

/**
 * Meetings pages: the module must be on, and the person a joining member or above. Before that, the design
 * review shows the page's own lock line instead of sending the person elsewhere (decisions #75, #79).
 */
export async function requireMeetingsAccess(): Promise<Access> {
  if (!moduleOn('meetings')) notFound()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    if (DESIGN_REVIEW) return { locked: true, signedIn: false }
    redirect('/auth/login')
  }
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (!isJoiningOrAbove(profile?.role ?? 'explorer')) {
    if (DESIGN_REVIEW) return { locked: true, signedIn: true }
    redirect('/dashboard')
  }
  return { locked: false, supabase, user }
}

/** "Meeting notes open when you join", with the way in */
export function MeetingsLocked({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="v4-page">
      <PageHeader eyebrow="Working together" title="Meetings" />
      <p className="v4-hint">
        Meeting notes open when you join {COMMUNITY_NAME}.{' '}
        {signedIn ? <Link href="/join">Start joining</Link> : <><Link href="/auth/signup">Create account</Link> · <Link href="/auth/login">Sign in</Link></>}
      </p>
    </div>
  )
}
