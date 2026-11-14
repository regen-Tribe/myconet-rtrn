'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clearBrandingImage, setBrandingImage, type BrandingKind } from '@/modules/m04-blueprint/lib/branding-upload'
import { useBranding } from '@/core/components/BrandingProvider'
import { COMMUNITY_NAME } from '@/core/lib/instance'

/**
 * Setup step: the community's logo (top bar, sign-in page) and banner image
 * (landing page, Home, Dashboard). Files go to the public `branding` bucket and
 * their URLs to `community_settings`. Admins only; everyone else sees a preview.
 */

type Kind = BrandingKind

const LIMITS: Record<Kind, { bytes: number; hint: string }> = {
  logo: { bytes: 1024 * 1024, hint: 'Square or wide, PNG or SVG with a transparent background works best. Shown about 44px tall. Up to 1 MB.' },
  banner: { bytes: 5 * 1024 * 1024, hint: 'A wide photo of the land, the people or the place, at least 1600 × 500. It is cropped to fit. Up to 5 MB.' },
  share_image: { bytes: 5 * 1024 * 1024, hint: '1200 × 630 works best, e.g. a screenshot of the home page. Without one, the banner is used. Up to 5 MB.' },
}
const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']

export default function BrandingStep({ canEdit, onPrev, onNext }: {
  canEdit: boolean; onPrev: () => void; onNext: () => void
}) {
  const router = useRouter()
  const branding = useBranding()
  const [busy, setBusy] = useState<Kind | null>(null)
  const [error, setError] = useState('')

  const upload = async (kind: Kind, file: File | undefined) => {
    if (!file) return
    setError('')
    if (!TYPES.includes(file.type)) { setError('Use a PNG, JPG, WebP, SVG or GIF image.'); return }
    if (file.size > LIMITS[kind].bytes) { setError(`That file is too big (${(file.size / 1024 / 1024).toFixed(1)} MB). ${LIMITS[kind].hint}`); return }
    setBusy(kind)
    try {
      await setBrandingImage(kind, file, branding[`${kind}_url`])
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(null)
  }

  const remove = async (kind: Kind) => {
    setError(''); setBusy(kind)
    try {
      await clearBrandingImage(kind, branding[`${kind}_url`])
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(null)
  }

  const picker = (kind: Kind, label: string) => canEdit && (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
      <label className="btn btn-primary" style={{ cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}>
        {busy === kind ? 'Uploading…' : branding[`${kind}_url`] ? `Replace ${label}` : `Upload ${label}`}
        <input type="file" accept={TYPES.join(',')} disabled={!!busy} style={{ display: 'none' }}
          onChange={e => { upload(kind, e.target.files?.[0]); e.target.value = '' }} />
      </label>
      {branding[`${kind}_url`] && (
        <button className="btn btn-ghost" onClick={() => remove(kind)} disabled={!!busy}>Remove</button>
      )}
      <span style={{ fontSize: 12, color: 'var(--ink-3)', flexBasis: '100%' }}>{LIMITS[kind].hint}</span>
    </div>
  )

  return (
    <div>
      <div className="crumb"><span>Setup</span><span className="crumb-sep">/</span><span>Look &amp; feel</span></div>
      <h1 className="step-title">Look &amp; feel</h1>
      <p className="step-lede">
        Make the portal feel like {COMMUNITY_NAME}&rsquo;s own: a logo in the top bar and a banner image across the top of the landing page, Home and the Dashboard.
      </p>

      {error && (
        <div style={{ fontSize: 13, color: '#b91c1c', background: '#b91c1c12', border: '1px solid #b91c1c40', borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: 16 }}>{error}</div>
      )}

      <div className="section">
        <div className="section-head">
          <div className="section-title">Logo</div>
          <div className="section-meta-row"><span className="section-meta">{branding.logo_url ? 'Added' : 'Not added yet'}</span></div>
        </div>
        {/* Preview of the top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', border: '1px solid var(--rule)', borderRadius: 8, background: 'var(--surface)' }}>
          {branding.logo_url
            ? <img src={branding.logo_url} alt={`${COMMUNITY_NAME} logo`} style={{ height: 44, width: 'auto', maxWidth: 140, objectFit: 'contain', borderRadius: 8 }} />
            : <span style={{ width: 26, height: 26, borderRadius: 7, background: 'radial-gradient(circle at 30% 30%, var(--accent), color-mix(in srgb, var(--accent) 60%, #000))' }} />}
          <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>MyCoNet</span>
          <span style={{ fontSize: 14, color: 'var(--ink-4)' }}>·</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{COMMUNITY_NAME}</span>
        </div>
        {picker('logo', 'logo')}
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">Banner image</div>
          <div className="section-meta-row"><span className="section-meta">{branding.banner_url ? 'Added' : 'Not added yet'}</span></div>
        </div>
        {branding.banner_url
          ? <img src={branding.banner_url} alt={COMMUNITY_NAME} style={{ display: 'block', width: '100%', height: 200, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--rule)' }} />
          : <div style={{ height: 120, borderRadius: 10, border: '1.5px dashed var(--rule)', background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontSize: 13, color: 'var(--ink-3)' }}>No banner yet</div>}
        {picker('banner', 'banner')}
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">Link preview</div>
          <div className="section-meta-row"><span className="section-meta">{branding.share_image_url ? 'Added' : branding.banner_url ? 'Using the banner' : 'Not added yet'}</span></div>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, margin: '0 0 10px' }}>
          The picture people see when the portal&rsquo;s link is shared on WhatsApp, Telegram, Slack, email or social media. Apps keep their own copy for a while, so a new picture can take a day or two to show everywhere.
        </p>
        {(branding.share_image_url ?? branding.banner_url)
          ? <img src={(branding.share_image_url ?? branding.banner_url)!} alt="" style={{ display: 'block', width: '100%', maxWidth: 480, aspectRatio: '1200 / 630', objectFit: 'cover', borderRadius: 10, border: '1px solid var(--rule)' }} />
          : <div style={{ maxWidth: 480, aspectRatio: '1200 / 630', borderRadius: 10, border: '1.5px dashed var(--rule)', background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontSize: 13, color: 'var(--ink-3)' }}>No preview image yet</div>}
        {picker('share_image', 'preview image')}
      </div>

      <div className="section">
        <div className="section-head"><div className="section-title">Community name</div></div>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
          The portal calls this community <strong>{COMMUNITY_NAME}</strong> in the top bar, the browser tab, the sign-in page and the landing page.
          It comes from the portal&rsquo;s settings (<code>displayName</code> in <code>instance/config.jsonc</code>), so ask whoever runs the portal to change it.
        </p>
      </div>

      {!canEdit && <p style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Only admins can change the logo and banner.</p>}

      <div className="nav-row">
        <button className="btn btn-ghost" onClick={onPrev}>← Previous</button>
        <button className="btn btn-primary" onClick={onNext}>Save &amp; continue →</button>
      </div>
    </div>
  )
}
