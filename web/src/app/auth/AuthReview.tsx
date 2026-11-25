'use client'
/**
 * The sign-in pages with the design review on ("designReview": true; design/decisions.md #65–#68).
 * One white card on the pale page, the community's mark and name above it, its one sentence under it.
 * Only the look lives here: every handler, redirect and message stays in the pages that use it.
 * Styles: ./auth-review.css (scoped under html[data-review]).
 */
import './auth-review.css'
import Link from 'next/link'
import { Icon, type IconName } from '@/core/components/v4'
import { COMMUNITY_DESCRIPTION, COMMUNITY_NAME } from '@/core/lib/instance'
import { useBranding } from '@/core/components/BrandingProvider'

/** The community's one sentence (instance config "description"), ending in a full stop */
export const ABOUT_LINE = COMMUNITY_DESCRIPTION
  ? COMMUNITY_DESCRIPTION.replace(/\s+$/, '') + (/[.!?]$/.test(COMMUNITY_DESCRIPTION.trim()) ? '' : '.')
  : ''

const BRAND_MARK = process.env.NEXT_PUBLIC_BRAND_MARK || ''

/** The page: mark and name (to the Welcome, a visitor's home), the card, then the community's sentence.
 *  The mark alone, as in the menu: the full logo carries its own small words, illegible and cut at this size (Sonia, 24 Nov) */
export function AuthFrame({ children, about = true }: { children: React.ReactNode; about?: boolean }) {
  const { logo_url } = useBranding()
  return (
    <div className="arv">
      <div className="arv__col">
        <Link href="/" className="arv__brand">
          {BRAND_MARK
            ? <img src={BRAND_MARK} alt="" className="arv__logo arv__logo--mark" />
            : logo_url
            ? <img src={logo_url} alt="" className="arv__logo" />
            : <span className="arv__mark"><Icon name="sprout" size={20} /></span>}
          <span className="arv__name">{COMMUNITY_NAME}</span>
        </Link>
        <div className="arv__card">{children}</div>
        {about && ABOUT_LINE && <p className="arv__about">{ABOUT_LINE}</p>}
      </div>
    </div>
  )
}

/** Title and an optional line under it */
export function AuthHead({ title, sub }: { title: string; sub?: React.ReactNode }) {
  return (
    <div className="arv__head">
      <h1 className="arv__title">{title}</h1>
      {sub && <p className="arv__sub">{sub}</p>}
    </div>
  )
}

/** A labelled field; `aside` sits at the label's right (Forgot password?) */
export function AuthField({ id, label, aside, children }: { id: string; label: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="arv__field">
      <div className="arv__labelrow">
        <label htmlFor={id} className="arv__label">{label}</label>
        {aside}
      </div>
      {children}
    </div>
  )
}

/** "Check your inbox" and other finished states: an icon, a heading, then the words */
export function AuthNotice({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <div className="arv__notice" role="status">
      <span className="arv__noticeicon"><Icon name={icon} size={24} /></span>
      <h1 className="arv__title arv__title--notice">{title}</h1>
      {children}
    </div>
  )
}
