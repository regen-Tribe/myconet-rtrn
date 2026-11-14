'use client'
import Link from 'next/link'
import { useBranding } from '@/core/components/BrandingProvider'
import { BRANDING_STEP_HREF } from '@/core/lib/branding'
import { COMMUNITY_NAME } from '@/core/lib/instance'

/**
 * The community's banner image across the top of the landing page, Home and the
 * Dashboard. Without one, admins see a prompt to add it; everyone else sees nothing.
 */
export default function BannerImage({ isAdmin = false, height = 220, style }: {
  isAdmin?: boolean; height?: number; style?: React.CSSProperties
}) {
  const { banner_url } = useBranding()

  if (banner_url) {
    return (
      <img src={banner_url} alt={COMMUNITY_NAME} style={{
        display: 'block', width: '100%', height, objectFit: 'cover',
        borderRadius: 14, border: '1px solid var(--rule)', ...style,
      }} />
    )
  }
  if (!isAdmin) return null
  return (
    <Link href={BRANDING_STEP_HREF} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      height: Math.min(height, 120), borderRadius: 14, border: '1.5px dashed var(--rule)',
      background: 'var(--bg-2)', color: 'var(--ink-3)', fontSize: 13, textDecoration: 'none', ...style,
    }}>
      🖼️ Add a banner image for {COMMUNITY_NAME} <span style={{ color: 'var(--ink-4)' }}>· only admins see this</span>
    </Link>
  )
}
