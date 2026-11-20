import type { NextConfig } from 'next'
import { loadInstance } from './scripts/instance.mjs'

const instance = loadInstance()
// The v4 look: from instance/config.jsonc, as the build's NEXT_PUBLIC_DESIGN (core/lib/instance.ts)
const V4 = (process.env.NEXT_PUBLIC_DESIGN ?? instance.design ?? '') === 'v4'

const nextConfig: NextConfig = {
  // Also set here so `next dev` shows the right name without a generated env file
  env: { NEXT_PUBLIC_COMMUNITY_NAME: instance.displayName },
  images: {
    remotePatterns: [
      // Avatars and other uploads come from this community's Supabase storage
      { protocol: 'https', hostname: new URL(instance.supabase.url).hostname },
    ],
  },
  // Every module's address matches its name (LEXICON.md). The old addresses live on in
  // second-brain notes, meeting emails and shared links, so they redirect for good.
  async redirects() {
    const moved: [string, string][] = [
      ['/network/seeks', '/members/requests'],
      ['/network', '/members'],
      ['/ops', '/operations'],
      ['/contributions', '/achievements'],
      ['/events', '/calendar'],
      ['/org', '/circles'],
      // The v4 menu (Sonia, 19 Nov) renames four pages; only communities with the v4 look move
      ...(V4
        ? [
            ['/blueprint', '/about'],
            ['/accommodation', '/amenities'],
            ['/resources', '/amenities'],
            ['/stays', '/amenities'],
            ['/bookings', '/amenities'],
            ['/admin/users', '/admin/permissions'],
          ] as [string, string][]
        : [
            ['/stays', '/accommodation'],
            ['/bookings', '/resources'],
          ] as [string, string][]),
    ]
    return moved.flatMap(([from, to]) => [
      { source: from, destination: to, permanent: true },
      { source: `${from}/:path*`, destination: `${to}/:path*`, permanent: true },
    ])
  },
}

export default nextConfig

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
