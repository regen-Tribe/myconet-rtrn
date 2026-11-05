'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import AppTopBar from '@/core/components/shell/AppTopBar'
import AppSideNav from '@/core/components/shell/AppSideNav'
import AppFooter from '@/core/components/shell/AppFooter'
import { ProfileCompletionProvider } from '@/core/contexts/ProfileCompletion'
import AssistantChat from '@/modules/assistant/AssistantChat'

export default function AppShell({ children, role, isLoggedIn = false }: { children: React.ReactNode; role: string; isLoggedIn?: boolean }) {
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  if (pathname.startsWith('/auth/')) {
    return <>{children}</>
  }

  return (
    <ProfileCompletionProvider>
      <div className="app-shell-layout">
        <AppTopBar
          onMobileNavToggle={() => setMobileNavOpen(o => !o)}
          mobileNavOpen={mobileNavOpen}
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
