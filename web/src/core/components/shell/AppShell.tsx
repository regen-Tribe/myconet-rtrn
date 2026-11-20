'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import AppTopBar from '@/core/components/shell/AppTopBar'
import AppSideNav from '@/core/components/shell/AppSideNav'
import MenuV4 from '@/core/components/shell/MenuV4'
import TabBarV4 from '@/core/components/shell/TabBarV4'
import type { MenuState } from '@/core/lib/menu-server'
import AppFooter from '@/core/components/shell/AppFooter'
import { ProfileCompletionProvider } from '@/core/contexts/ProfileCompletion'
import AssistantChat from '@/modules/assistant/AssistantChat'

/** `menu` is set only for the v4 look (layout.tsx): the v4 menu and phone tab bar replace AppSideNav. */
export default function AppShell({ children, role, isLoggedIn = false, menu = null }: { children: React.ReactNode; role: string; isLoggedIn?: boolean; menu?: MenuState | null }) {
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [navCollapsed, setNavCollapsed] = useState(false)

  useEffect(() => {
    try { setNavCollapsed(localStorage.getItem('navCollapsed') === '1') } catch {}
  }, [])

  const toggleDesktopNav = () =>
    setNavCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('navCollapsed', next ? '1' : '0') } catch {}
      return next
    })

  if (pathname.startsWith('/auth/')) {
    return <>{children}</>
  }

  return (
    <ProfileCompletionProvider>
      <div className={`app-shell-layout${navCollapsed ? ' nav-collapsed' : ''}${menu ? ' shell-v4' : ''}`}>
        <AppTopBar
          onMobileNavToggle={() => setMobileNavOpen(o => !o)}
          mobileNavOpen={mobileNavOpen}
          onDesktopNavToggle={toggleDesktopNav}
          navCollapsed={navCollapsed}
        />
        {menu ? (
          <MenuV4
            mobileOpen={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
            role={role}
            isLoggedIn={isLoggedIn}
            state={menu}
            collapsed={navCollapsed}
            onToggleCollapse={toggleDesktopNav}
          />
        ) : (
          <AppSideNav
            mobileOpen={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
            initialRole={role}
            isLoggedIn={isLoggedIn}
          />
        )}
        <main style={{ overflowY: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>{children}</div>
          <AppFooter />
        </main>
      </div>

      <AssistantChat isLoggedIn={isLoggedIn} />

      {menu && <TabBarV4 newcomer={menu.journey !== 2} menuOpen={mobileNavOpen} onMenu={() => setMobileNavOpen(o => !o)} />}

      {mobileNavOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
    </ProfileCompletionProvider>
  )
}
