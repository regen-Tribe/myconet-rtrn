import { createClient } from '@/core/lib/supabase/server'
import NetworkSidebar from '@/modules/m01-network/NetworkSidebar'

export default async function NetworkLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const viewerProfileRes = user
    ? await supabase.from('user_profiles').select('username, avatar_url, first_name').eq('id', user.id).maybeSingle()
    : { data: null }

  const vp = viewerProfileRes.data as { username: string | null; avatar_url: string | null; first_name: string | null } | null
  const sidebarUser = vp ? { username: vp.username, first_name: vp.first_name, avatar_url: vp.avatar_url } : null

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 52px)', alignItems: 'flex-start' }}>
      <NetworkSidebar user={sidebarUser} />
      <main className="net-content" style={{ flex: 1, minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
