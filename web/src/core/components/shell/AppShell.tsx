'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import AppTopBar from '@/core/components/shell/AppTopBar'
import AppSideNav from '@/core/components/shell/AppSideNav'
import AppFooter from '@/core/components/shell/AppFooter'
import { ProfileCompletionProvider } from '@/core/contexts/ProfileCompletion'
import AssistantChat from '@/modules/assistant/AssistantChat'

export default function AppShell({ children, role, isLoggedIn = false }: { children: React.ReactNode; role: string; isLoggedIn?: boolean }) {
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
      <div className={`app-shell-layout${navCollapsed ? ' nav-collapsed' : ''}`}>
        <AppTopBar
          onMobileNavToggle={() => setMobileNavOpen(o => !o)}
          mobileNavOpen={mobileNavOpen}
          onDesktopNavToggle={toggleDesktopNav}
          navCollapsed={navCollapsed}
        />
        <AppSideNav
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          initialRole={role}
          isLoggedIn={isLoggedIn}
        />
        <main style={{ overflowY: 'auto', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>{children}</div>
          <AppFooter />
        </main>
      </div>

      <AssistantChat isLoggedIn={isLoggedIn} />

      {mobileNavOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
    </ProfileCompletionProvider>
  )
}
