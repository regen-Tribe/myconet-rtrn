import Link from 'next/link'
import { Icon } from '@/core/components/v4'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import './focus-shell.css'

const BRAND_MARK = process.env.NEXT_PUBLIC_BRAND_MARK || ''

/**
 * A page with nothing around it but the community's mark and a way out (design review: Start joining).
 * Signed in, "Continue later" goes to the Dashboard (everything is saved step by step; "Back to Dashboard" once
 * joined); signed out, × goes to the Welcome.
 */
export default function FocusShell({ children, isLoggedIn, joined = false }: { children: React.ReactNode; isLoggedIn: boolean; joined?: boolean }) {
  return (
    <div className="fx">
      <header className="fx-top">
        <Link href={isLoggedIn ? '/dashboard' : '/'} className="fx-brand">
          {BRAND_MARK ? <img src={BRAND_MARK} alt="" aria-hidden="true" /> : null}
          <b>{COMMUNITY_NAME}</b>
        </Link>
        {isLoggedIn
          ? <Link href="/dashboard" className="fx-exit">{joined ? 'Back to Dashboard' : 'Continue later'}</Link>
          : <Link href="/" className="fx-exit fx-exit--x" aria-label="Close"><Icon name="x" size={18} /></Link>}
      </header>
      <main className="fx-main">{children}</main>
    </div>
  )
}
