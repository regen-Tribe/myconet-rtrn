import { createClient } from '@/core/lib/supabase/server'
import NetworkSidebar from '@/modules/m01-network/NetworkSidebar'
import MembersTabsV4 from '@/modules/m01-network/MembersTabsV4'
import { DESIGN, DESIGN_REVIEW } from '@/core/lib/instance'
import { isJoiningOrAbove } from '@/core/lib/roles'

export default async function NetworkLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const viewerProfileRes = user
    ? await supabase.from('user_profiles').select('username, avatar_url, first_name, role').eq('id', user.id).maybeSingle()
    : { data: null }

  const vp = viewerProfileRes.data as { username: string | null; avatar_url: string | null; first_name: string | null; role: string | null } | null
  const sidebarUser = vp ? { username: vp.username, first_name: vp.first_name, avatar_url: vp.avatar_url } : null

  // Design review (decision #22): tabs never sit above the title; each Members page puts the views
  // (MembersViews) under its heading, in its toolbar row
  if (DESIGN === 'v4' && DESIGN_REVIEW) return <div className="v4-members">{children}</div>

  // The v4 look: one row of tabs above the page instead of a second side menu
  if (DESIGN === 'v4') {
    return (
      <div className="v4-members">
        <div className="v4-members__tabs"><MembersTabsV4 signedIn={!!user} joined={!!user && isJoiningOrAbove(vp?.role ?? 'explorer')} /></div>
        {children}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 52px)', alignItems: 'flex-start' }}>
      <NetworkSidebar user={sidebarUser} />
      <main className="net-content" style={{ flex: 1, minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
