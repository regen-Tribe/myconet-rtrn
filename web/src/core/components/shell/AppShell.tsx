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
/** `navCollapsed` comes from the `navCollapsed` cookie (layout.tsx), so the slim menu is slim from the first paint. */
export default function AppShell({ children, role, isLoggedIn = false, menu = null, navCollapsed: initialCollapsed = false }: {
  children: React.ReactNode; role: string; isLoggedIn?: boolean; menu?: MenuState | null; navCollapsed?: boolean
}) {
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [navCollapsed, setNavCollapsed] = useState(initialCollapsed)

  useEffect(() => {
    // Moves an older choice (kept only in this browser) to the cookie, once
    try {
      const old = localStorage.getItem('navCollapsed')
      if (old !== null) {
        localStorage.removeItem('navCollapsed')
        document.cookie = `navCollapsed=${old === '1' ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`
        setNavCollapsed(old === '1')
      }
    } catch {}
  }, [])

  // The phone drawer closes when you go to another page (also with the back button) and on Escape
  const [drawerPath, setDrawerPath] = useState(pathname)
  if (drawerPath !== pathname) { setDrawerPath(pathname); setMobileNavOpen(false) }
  useEffect(() => {
    if (!mobileNavOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileNavOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileNavOpen])

  const toggleDesktopNav = () =>
    setNavCollapsed(prev => {
      const next = !prev
      document.cookie = `navCollapsed=${next ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`
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
        <main className={menu ? 'v4-main' : undefined} style={{ overflowY: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
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
