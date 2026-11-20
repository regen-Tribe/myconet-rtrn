'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/ui/avatar'
import { Button } from '@/core/components/ui/button'
import { cn } from '@/core/lib/utils'
import {
  LayoutDashboard, User, Sparkles, Search,
  Gift, HelpCircle, Pencil, LogOut, ChevronUp,
} from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { title: 'Dashboard',      href: '/members',          icon: LayoutDashboard },
  { title: 'My Profile',     href: '/members/profile',  icon: User },
  { title: 'Matches',        href: '/members/matches',  icon: Sparkles },
  { title: 'Search Network', href: '/members/discover', icon: Search },
  { title: 'My offers',      href: '/members/offers',   icon: Gift },
  { title: 'My requests',     href: '/members/requests',    icon: HelpCircle },
]

interface Props {
  user: { username: string | null; first_name: string | null; avatar_url: string | null } | null
}

export default function NetworkSidebar({ user }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)

  const initial = (user?.first_name ?? user?.username ?? '?')[0].toUpperCase()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className={cn(
        'net-sidebar flex-col w-60 shrink-0 sticky overflow-y-auto',
        'bg-sidebar border-r border-sidebar-border'
      )} style={{ top: 52, height: 'calc(100vh - 52px)' }}>

        {/* Main nav */}
        <div className="flex-1 px-3 pb-3 pt-2">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground px-2 mb-2 mt-1">
            Navigation
          </p>
          {NAV_ITEMS.map(item => {
            const active = item.href === '/members'
              ? pathname === '/members'
              : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  'net-nav-item flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-0.5 cursor-pointer transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-primary font-semibold'
                    : 'text-sidebar-foreground hover:text-sidebar-foreground font-normal'
                )}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </div>
              </Link>
            )
          })}

          {/* Complete profile button */}
          <div className="mt-4 px-1">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground px-2 mb-2">
              Quick Actions
            </p>
            <Button variant="outline" className="w-full justify-start gap-2 text-sm" asChild>
              <Link href="/profile/edit">
                <Pencil className="h-4 w-4" />
                Complete Your Profile
              </Link>
            </Button>
          </div>
        </div>

        {/* User footer */}
        <div className="border-t border-sidebar-border p-3 relative">
          {user ? (
            <>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-3 w-full p-2 rounded-lg hover-elevate text-left cursor-pointer"
                style={{ background: 'none', border: 'none' }}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user.first_name ?? user.username}
                  </p>
                  {user.username && (
                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                  )}
                </div>
                <ChevronUp className={cn('h-4 w-4 text-muted-foreground transition-transform', menuOpen ? '' : 'rotate-180')} />
              </button>

              {menuOpen && (
                <div className="absolute bottom-full left-2 right-2 mb-1 bg-popover border border-popover-border rounded-lg shadow-lg overflow-hidden z-50">
                  <Link href="/members/profile" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-popover-foreground hover-elevate">
                    <User className="h-4 w-4" /> View Profile
                  </Link>
                  <Link href="/profile/edit" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-popover-foreground hover-elevate">
                    <Pencil className="h-4 w-4" /> Edit Profile
                  </Link>
                  <div className="h-px bg-border my-1" />
                  <button onClick={signOut}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-destructive w-full text-left hover-elevate"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link href="/auth/login" className="flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold">
              Sign in
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="net-mobile-nav fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border justify-around items-center py-1.5">
        {NAV_ITEMS.map(item => {
          const active = item.href === '/members'
            ? pathname === '/members'
            : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={cn('flex flex-col items-center gap-1 px-2 py-1 min-w-[44px]')}
              style={{ color: active ? '#92400e' : undefined }}>
              <item.icon className="h-5 w-5" />
              <span className={cn('text-[9px]', active ? 'font-bold' : 'font-normal text-muted-foreground')}>
                {item.title.split(' ').pop()}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
