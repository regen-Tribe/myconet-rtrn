import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import AppShell from '@/core/components/shell/AppShell'
import { createClient } from '@/core/lib/supabase/server'
import { loadCircleRows } from '@/core/lib/circles-server'
import { CirclesProvider } from '@/core/components/CirclesProvider'
import { loadBranding } from '@/core/lib/branding-server'
import { BrandingProvider } from '@/core/components/BrandingProvider'
import { COMMUNITY_NAME } from '@/core/lib/instance'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

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
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    role = profile?.role ?? 'explorer'
  }

  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;})()`
        }} />
      </head>
      <body>
        <BrandingProvider branding={branding}>
          <CirclesProvider rows={circles}>
            <AppShell role={role} isLoggedIn={!!user}>{children}</AppShell>
          </CirclesProvider>
        </BrandingProvider>
      </body>
    </html>
  )
}
