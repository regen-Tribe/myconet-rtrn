import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Geist, Geist_Mono, Inter, Inter_Tight } from 'next/font/google'
import './globals.css'
// The v4 look on phones; after globals.css so it can adjust it (rules only apply with data-design="v4")
import './v4-mobile.css'
import AppShell from '@/core/components/shell/AppShell'
import { createClient } from '@/core/lib/supabase/server'
import { loadCircleRows } from '@/core/lib/circles-server'
import { CirclesProvider } from '@/core/components/CirclesProvider'
import { loadBranding } from '@/core/lib/branding-server'
import { BrandingProvider } from '@/core/components/BrandingProvider'
import { COMMUNITY_NAME, DESIGN } from '@/core/lib/instance'
import { loadMenuState } from '@/core/lib/menu-server'

// Geist is only used by the Blueprint wizard (wizard.css), so it isn't preloaded on every page
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', preload: false })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', preload: false })
// The v4 look (DESIGN-SYSTEM.md › v4): Inter for text, Inter Tight for headings
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-inter-tight' })

const TITLE = `${COMMUNITY_NAME} · MyCoNet`
const DESCRIPTION = `The member portal for ${COMMUNITY_NAME}, a regenerative neighborhood. Connect, plan, and build together.`

// The link preview (WhatsApp, Slack, social media) uses the community's share image, else its banner
export async function generateMetadata(): Promise<Metadata> {
  const branding = await loadBranding(await createClient())
  const image = branding.share_image_url ?? branding.banner_url
  return {
    metadataBase: process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : undefined,
    title: TITLE,
    description: DESCRIPTION,
    openGraph: {
      type: 'website', siteName: COMMUNITY_NAME, title: TITLE, description: DESCRIPTION, url: '/',
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: COMMUNITY_NAME }] } : {}),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: TITLE, description: DESCRIPTION, ...(image ? { images: [image] } : {}) },
    icons: branding.logo_url ? { icon: branding.logo_url, apple: branding.logo_url } : undefined,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const [{ data: { user } }, circles, branding] = await Promise.all([supabase.auth.getUser(), loadCircleRows(supabase), loadBranding(supabase)])

  let role = 'explorer'
  let me: { name: string; avatar: string | null; username: string | null } | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, first_name, last_name, username, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
    role = profile?.role ?? 'explorer'
    me = profile ? {
      name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username || 'You',
      avatar: profile.avatar_url ?? null, username: profile.username ?? null,
    } : null
  }
  // The v4 menu's next step and counts, and who you are for its foot (only for the v4 look)
  const menu = DESIGN === 'v4' ? { ...await loadMenuState(supabase, user?.id ?? null, role), me } : null

  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}${DESIGN ? ` ${inter.variable} ${interTight.variable}` : ''}`} data-design={DESIGN || undefined} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;})()`
        }} />
      </head>
      <body>
        <BrandingProvider branding={branding}>
          <CirclesProvider rows={circles}>
            <AppShell role={role} isLoggedIn={!!user} menu={menu} navCollapsed={(await cookies()).get('navCollapsed')?.value === '1'}>{children}</AppShell>
          </CirclesProvider>
        </BrandingProvider>
      </body>
    </html>
  )
}
