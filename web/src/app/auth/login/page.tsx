'use client'
import { Icon, InlineIcon, type IconName } from '@/core/components/v4'
import { useEffect, useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { usePathname, useRouter } from 'next/navigation'
import { COMMUNITY_DESCRIPTION, COMMUNITY_NAME, DESIGN, DESIGN_REVIEW } from '@/core/lib/instance'
import { useBranding } from '@/core/components/BrandingProvider'
import { AuthField, AuthFrame, AuthHead, AuthNotice } from '../AuthReview'

type Mode = 'login' | 'register' | 'forgot'

// Design review: one description of the community, set once in instance config ("description")
const ABOUT = DESIGN_REVIEW && COMMUNITY_DESCRIPTION ? COMMUNITY_DESCRIPTION : null
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

export default function AuthPage() {
  const { logo_url } = useBranding()
  // Design review: /auth/signup opens Create account here (#65); without it /auth/signup still redirects to sign in
  const pathname = usePathname()
  const [mode, setMode] = useState<Mode>(DESIGN_REVIEW && pathname === '/auth/signup' ? 'register' : 'login')
  // ?mode=forgot (from the reset page) or ?mode=register (from a public profile)
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get('mode')
    if (m === 'forgot' || m === 'register') setMode(m)
  }, [])
  const supabase = createClient()
  const router = useRouter()

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regFirstName, setRegFirstName] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regSent, setRegSent] = useState(false)
  // Supabase answers a sign-up for an address that already has an account with a
  // user and no error, but sends nothing: say so instead of "Check your inbox"
  const [regExists, setRegExists] = useState(false)

  // Sending the confirmation email again (after sign-up, or when sign-in says it isn't confirmed)
  const [loginUnconfirmed, setLoginUnconfirmed] = useState(false)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [resendError, setResendError] = useState('')

  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  // A resent confirmation link lands here (via /auth/callback) as #access_token=:
  // Supabase's resend has no PKCE code. The address is confirmed by now, so sign in
  // and carry on as a normal confirmation would.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const onboarding = new URLSearchParams(window.location.search).get('onboarding')
    const expired = 'That link has expired or was already used. Sign in with your email and password; if your email isn’t confirmed yet, you can ask for a new link here.'
    const access_token = hash.get('access_token'), refresh_token = hash.get('refresh_token')
    const failed = hash.get('error_description')
    if (!failed && !(access_token && refresh_token)) return
    const signIn = failed
      ? Promise.resolve({ error: true })
      : supabase.auth.setSession({ access_token: access_token!, refresh_token: refresh_token! })
    signIn.then(({ error }) => {
      window.history.replaceState(null, '', window.location.pathname)
      if (error) setLoginError(expired)
      // Design review: a new account lands on My dashboard, whose next step is Start joining (#25, #68)
      else { router.push(onboarding ? (DESIGN_REVIEW ? '/dashboard' : '/profile/edit') : '/home'); router.refresh() }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- once, on arrival

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoginUnconfirmed(false)
    setResendState('idle'); setResendError('')
    setLoginLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    if (error) {
      setLoginError(error.message)
      setLoginUnconfirmed(error.code === 'email_not_confirmed')
    } else { router.push('/home'); router.refresh() }
    setLoginLoading(false)
  }

  async function resendConfirmation(email: string) {
    setResendError('')
    setResendState('sending')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?onboarding=1` },
    })
    if (error) {
      setResendError(error.status === 429 ? 'Too many emails just now. Wait a minute and try again.' : error.message)
      setResendState('idle')
    } else setResendState('sent')
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegError('')
    setRegExists(false)
    setResendState('idle'); setResendError('')
    if (regPassword !== regConfirm) { setRegError("Passwords don't match"); return }
    if (regPassword.length < 6) { setRegError('Password must be at least 6 characters'); return }
    setRegLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        data: { first_name: regFirstName },
        emailRedirectTo: `${location.origin}/auth/callback?onboarding=1`,
      },
    })
    if (error) { setRegError(error.message) }
    else if (data.user && data.user.identities?.length === 0) { setRegExists(true) }
    else if (data.user && !data.session) { setRegSent(true) }
    else { router.push('/home'); router.refresh() }
    setRegLoading(false)
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setForgotError('')
    setForgotLoading(true)
    // Through the portal's server, which records the request for admins (auth_email_log)
    try {
      const resp = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: forgotEmail }) })
      const data = await resp.json().catch(() => ({})) as { error?: string }
      if (!resp.ok) setForgotError(data.error || 'The reset email couldn’t be sent. Try again in a minute.')
      else setForgotSent(true)
    } catch {
      setForgotError('Couldn’t reach the portal. Check your connection and try again.')
    }
    setForgotLoading(false)
  }

  const inpClassic: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    border: '1px solid var(--rule)', background: 'var(--bg-2)',
    color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 120ms',
  }
  const btnClassic: React.CSSProperties = {
    width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600,
    background: 'var(--ink)', color: 'var(--bg)', border: 'none', cursor: 'pointer',
    transition: 'opacity 120ms',
  }
  // The v4 look: the shared field and the black pill button (DESIGN-SYSTEM.md › v4)
  const V4 = DESIGN === 'v4'
  const inp: React.CSSProperties = V4
    ? { width: '100%', boxSizing: 'border-box', fontSize: 15, color: 'var(--ink)', background: 'var(--surface)', border: 0, boxShadow: 'inset 0 0 0 1px var(--rule)', borderRadius: 14, padding: '13px 14px', outline: 'none', fontFamily: 'inherit' }
    : inpClassic
  const btn: React.CSSProperties = V4
    ? { width: '100%', height: 48, borderRadius: 999, border: 'none', background: 'var(--ink)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
    : btnClassic
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }
  const linkBtn: React.CSSProperties = { fontSize: 'inherit', fontWeight: 600, color: 'var(--accent-color)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }

  // Design review (#65–#68): one job per page in a white card, the community's sentence under it, no feature
  // lists or side panel. Same state, handlers and messages as below; only the look and a few words differ.
  if (DESIGN_REVIEW) {
    const backToSignIn = (reset: () => void) => (
      <button type="button" className="arv__btn arv__btn--secondary" onClick={() => { reset(); setMode('login') }}>Back to sign in</button>
    )
    return (
      <AuthFrame>
        {mode === 'login' && (
          <>
            <AuthHead title="Sign in" sub={`Welcome back to ${COMMUNITY_NAME}.`} />
            <form onSubmit={handleLogin} className="arv__form">
              <AuthField id="login-email" label="Email">
                <input id="login-email" className="arv__input" type="email" autoComplete="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@example.com" />
              </AuthField>
              <AuthField id="login-password" label="Password"
                aside={<button type="button" className="arv__link arv__link--quiet" onClick={() => setMode('forgot')}>Forgot password?</button>}>
                <input id="login-password" className="arv__input" type="password" autoComplete="current-password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Your password" />
              </AuthField>
              {loginError && <p className="arv__error" role="alert">{loginError}</p>}
              {loginUnconfirmed && (
                <p className="arv__note">
                  {resendState === 'sent'
                    ? <>A new confirmation link is on its way to <strong>{loginEmail}</strong>. Open it in this browser, then sign in.</>
                    : <>This account’s email isn’t confirmed yet.{' '}
                        <button type="button" className="arv__link" onClick={() => resendConfirmation(loginEmail)} disabled={resendState === 'sending'}>
                          {resendState === 'sending' ? 'Sending…' : 'Send the confirmation link again'}
                        </button></>}
                  {resendError && <span className="arv__error" style={{ display: 'block', marginTop: 4 }}>{resendError}</span>}
                </p>
              )}
              <button type="submit" className="arv__btn" disabled={loginLoading}>{loginLoading ? 'Signing in…' : 'Sign in'}</button>
            </form>
            <p className="arv__switch">New here? <button type="button" className="arv__link" onClick={() => setMode('register')}>Create account</button></p>
          </>
        )}

        {mode === 'register' && (regSent ? (
          <AuthNotice icon="mail" title="Check your inbox">
            <p>We sent a confirmation link to <strong>{regEmail}</strong>. Open it to activate your account.</p>
            <p className="arv__meta">
              Nothing after a few minutes? Check spam, and that the address is right.{' '}
              {resendState === 'sent'
                ? 'We sent it again.'
                : <button type="button" className="arv__link" onClick={() => resendConfirmation(regEmail)} disabled={resendState === 'sending'}>
                    {resendState === 'sending' ? 'Sending…' : 'Send it again'}
                  </button>}
            </p>
            {resendError && <p className="arv__error">{resendError}</p>}
            {backToSignIn(() => { setRegSent(false); setResendState('idle'); setResendError('') })}
          </AuthNotice>
        ) : (
          <>
            <AuthHead title="Create account" />
            <form onSubmit={handleRegister} className="arv__form">
              <AuthField id="reg-first" label="First name">
                <input id="reg-first" className="arv__input" autoComplete="given-name" required value={regFirstName} onChange={e => setRegFirstName(e.target.value)} placeholder="Jane" />
              </AuthField>
              <AuthField id="reg-email" label="Email">
                <input id="reg-email" className="arv__input" type="email" autoComplete="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="you@example.com" />
              </AuthField>
              <AuthField id="reg-password" label="Password">
                <input id="reg-password" className="arv__input" type="password" autoComplete="new-password" required value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="At least 6 characters" />
              </AuthField>
              <AuthField id="reg-confirm" label="Confirm password">
                <input id="reg-confirm" className="arv__input" type="password" autoComplete="new-password" required value={regConfirm} onChange={e => setRegConfirm(e.target.value)} placeholder="The same again" />
              </AuthField>
              {regError && <p className="arv__error" role="alert">{regError}</p>}
              {regExists && (
                <div className="arv__note">
                  <strong>{regEmail}</strong> already has an account, so no email was sent. Sign in instead, or get a reset link if you don’t remember the password.
                  <div className="arv__actions">
                    <button type="button" className="arv__link" onClick={() => { setLoginEmail(regEmail); setRegExists(false); setMode('login') }}>Sign in</button>
                    <button type="button" className="arv__link" onClick={() => { setForgotEmail(regEmail); setRegExists(false); setMode('forgot') }}>Send me a reset link</button>
                  </div>
                </div>
              )}
              <button type="submit" className="arv__btn" disabled={regLoading}>{regLoading ? 'Creating account…' : 'Create account'}</button>
            </form>
            <p className="arv__switch">Already have an account? <button type="button" className="arv__link" onClick={() => setMode('login')}>Sign in</button></p>
          </>
        ))}

        {mode === 'forgot' && (forgotSent ? (
          <AuthNotice icon="mail" title="Check your inbox">
            <p>If <strong>{forgotEmail}</strong> has an account, a reset link is on its way.</p>
            <p className="arv__meta">Nothing after a few minutes? Check spam, and that this is exactly the address you signed up with (for Gmail, dots count here). Open the link in this same browser.</p>
            {backToSignIn(() => setForgotSent(false))}
          </AuthNotice>
        ) : (
          <>
            <AuthHead title="Reset your password" sub="We’ll email you a link to choose a new one." />
            <form onSubmit={handleForgot} className="arv__form">
              <AuthField id="forgot-email" label="Email">
                <input id="forgot-email" className="arv__input" type="email" autoComplete="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="you@example.com" />
              </AuthField>
              {forgotError && <p className="arv__error" role="alert">{forgotError}</p>}
              <button type="submit" className="arv__btn" disabled={forgotLoading}>{forgotLoading ? 'Sending…' : 'Send reset link'}</button>
            </form>
            <p className="arv__switch">Remembered it? <button type="button" className="arv__link" onClick={() => setMode('login')}>Sign in</button></p>
          </>
        ))}
      </AuthFrame>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', background: 'var(--bg)' }} className="auth-page-grid">

      {/* Left — form */}
      <div className="auth-form-panel">
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="auth-logo-wrap">
            {logo_url ? <img src={logo_url} alt="" style={{ height: 36, width: 'auto', maxWidth: 120, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }} />
              : <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--ink)', display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0 }}><Icon name="sprout" size={18} /></div>}
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--display)' }}>{COMMUNITY_NAME}</span>
            <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>· MyCoNet</span>
          </div>

          {mode === 'login' && (
            <>
              <h1 style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>Welcome back</h1>
              <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 28px', lineHeight: 1.55 }}>Sign in to your community portal.</p>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={lbl}>Email</label>
                  <input style={inp} type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ ...lbl, marginBottom: 0 }}>Password</label>
                    <button type="button" onClick={() => setMode('forgot')} style={{ fontSize: 12, color: 'var(--ink-4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Forgot password?</button>
                  </div>
                  <input style={inp} type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Enter your password" />
                </div>
                {loginError && <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{loginError}</p>}
                {loginUnconfirmed && (
                  <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0, lineHeight: 1.55 }}>
                    {resendState === 'sent'
                      ? <>A new confirmation link is on its way to <strong style={{ color: 'var(--ink-2)' }}>{loginEmail}</strong>. Open it in this browser, then sign in.</>
                      : <>This account’s email isn’t confirmed yet.{' '}
                          <button type="button" onClick={() => resendConfirmation(loginEmail)} disabled={resendState === 'sending'} style={linkBtn}>
                            {resendState === 'sending' ? 'Sending…' : 'Send the confirmation link again'}
                          </button></>}
                    {resendError && <span style={{ display: 'block', color: '#ef4444', marginTop: 4 }}>{resendError}</span>}
                  </p>
                )}
                <button type="submit" style={{ ...btn, opacity: loginLoading ? 0.6 : 1 }} disabled={loginLoading}>
                  {loginLoading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              {/* Sign up CTA */}
              <div style={{ marginTop: 32, padding: '20px 24px', borderRadius: 12, background: 'color-mix(in srgb, var(--accent-color) 6%, var(--surface))', border: '1px solid color-mix(in srgb, var(--accent-color) 20%, var(--rule))' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-color)', marginBottom: 8 }}>{COMMUNITY_NAME}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>New here? You're welcome.</div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '0 0 12px', lineHeight: 1.65 }}>
                  {ABOUT
                    ? <><strong style={{ color: 'var(--ink-2)' }}>{COMMUNITY_NAME}</strong> is {lower(ABOUT)}. Meet the people, read about the community, and join if you share its values.</>
                    : <>This is the member portal for a <strong style={{ color: 'var(--ink-2)' }}>regenerative neighborhood</strong> being formed together — meet the people involved, read the community documentation, join if you align with the values, contribute to projects, and help make decisions.</>}
                </p>
                <button type="button" onClick={() => setMode('register')} style={{ width: '100%', padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'var(--accent-color)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  Create account
                </button>
              </div>
            </>
          )}

          {mode === 'register' && (regSent ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ marginBottom: 16, color: 'var(--ink-3)' }}><Icon name="mail" size={44} /></div>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Check your inbox</h2>
              <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                We sent a confirmation link to <strong style={{ color: 'var(--ink-2)' }}>{regEmail}</strong>.<br />Click it to activate your account — then fill in your profile.
              </p>
              <p style={{ fontSize: 12.5, color: 'var(--ink-4)', lineHeight: 1.6, margin: '12px auto 0', maxWidth: 340 }}>
                Nothing after a few minutes? Check spam, and that the address is right.{' '}
                {resendState === 'sent'
                  ? 'We sent it again.'
                  : <button type="button" onClick={() => resendConfirmation(regEmail)} disabled={resendState === 'sending'} style={linkBtn}>
                      {resendState === 'sending' ? 'Sending…' : 'Send it again'}
                    </button>}
              </p>
              {resendError && <p style={{ fontSize: 12.5, color: '#ef4444', margin: '8px auto 0', maxWidth: 340 }}>{resendError}</p>}
              <button onClick={() => { setRegSent(false); setResendState('idle'); setResendError(''); setMode('login') }} style={{ marginTop: 24, padding: '10px 24px', borderRadius: 9, fontSize: 13, fontWeight: 600, border: '1px solid var(--rule)', background: 'transparent', color: 'var(--ink-2)', cursor: 'pointer' }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-color)', marginBottom: 10 }}>{COMMUNITY_NAME}</div>
              <h1 style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px' }}>Join the community</h1>
              <p style={{ fontSize: 13.5, color: 'var(--ink-3)', margin: '0 0 10px', lineHeight: 1.65 }}>
                This portal is for <strong style={{ color: 'var(--ink-2)' }}>{COMMUNITY_NAME}</strong>{ABOUT ? `: ${lower(ABOUT)}` : ' — a regenerative neighborhood being built together'}. Here you can:
              </p>
              {/* Mobile-only compact tagline (bullets are hidden on small screens) */}
              <p className="auth-reg-tagline" style={{ display: 'none', fontSize: 13, color: 'var(--ink-3)', margin: '0 0 18px', lineHeight: 1.6 }}>
                Meet the people, read the plan, join if you align, contribute to projects, and make decisions together.
              </p>
              <ul className="auth-reg-bullets">
                {[
                  ['users', "Meet the people involved and see who's building this"],
                  ['book', 'Read the community documentation and neighborhood plan'],
                  ['sprout', 'Join the group if you align with the values'],
                  ['tasks', 'Contribute to shared goals and tasks'],
                  ['scale', 'Participate in decisions together'],
                ].map(([icon, item]) => (
                  <li key={item}><span><InlineIcon name={icon as IconName} />{item}</span></li>
                ))}
              </ul>
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={lbl}>First name</label>
                  <input style={inp} required value={regFirstName} onChange={e => setRegFirstName(e.target.value)} placeholder="Jane" />
                </div>
                <div>
                  <label style={lbl}>Email</label>
                  <input style={inp} type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <label style={lbl}>Password</label>
                  <input style={inp} type="password" required value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Minimum 6 characters" />
                </div>
                <div>
                  <label style={lbl}>Confirm password</label>
                  <input style={inp} type="password" required value={regConfirm} onChange={e => setRegConfirm(e.target.value)} placeholder="Repeat your password" />
                </div>
                {regError && <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{regError}</p>}
                {regExists && (
                  <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--rule)', background: 'var(--bg-2)' }}>
                    <strong>{regEmail}</strong> already has an account, so no email was sent. Sign in instead, or get a reset link if you don’t remember the password.
                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                      <button type="button" onClick={() => { setLoginEmail(regEmail); setRegExists(false); setMode('login') }} style={linkBtn}>Sign in</button>
                      <button type="button" onClick={() => { setForgotEmail(regEmail); setRegExists(false); setMode('forgot') }} style={linkBtn}>Send me a reset link</button>
                    </div>
                  </div>
                )}
                <button type="submit" style={{ ...btn, opacity: regLoading ? 0.6 : 1, marginTop: 4 }} disabled={regLoading}>
                  {regLoading ? 'Creating account…' : 'Create account →'}
                </button>
              </form>
              <button type="button" onClick={() => setMode('login')} style={{ marginTop: 18, fontSize: 13, color: 'var(--ink-4)', background: 'none', border: 'none', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center' }}>
                Already have an account? Sign in
              </button>
            </>
          ))}

          {mode === 'forgot' && (forgotSent ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ marginBottom: 16, color: 'var(--ink-3)' }}><Icon name="mail" size={44} /></div>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Check your inbox</h2>
              <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6 }}>If <strong style={{ color: 'var(--ink-2)' }}>{forgotEmail}</strong> has an account, a reset link is on its way.</p>
              <p style={{ fontSize: 12.5, color: 'var(--ink-4)', lineHeight: 1.6, margin: '12px auto 0', maxWidth: 340 }}>
                Nothing after a few minutes? Check spam, and that this is exactly the address you signed up with (for Gmail, dots count here). Open the link in this same browser.
              </p>
              <button onClick={() => { setForgotSent(false); setMode('login') }} style={{ marginTop: 24, padding: '10px 24px', borderRadius: 9, fontSize: 13, fontWeight: 600, border: '1px solid var(--rule)', background: 'transparent', color: 'var(--ink-2)', cursor: 'pointer' }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>Reset your password</h1>
              <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 28px' }}>Enter your email and we'll send a reset link.</p>
              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={lbl}>Email</label>
                  <input style={inp} type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                {forgotError && <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{forgotError}</p>}
                <button type="submit" style={{ ...btn, opacity: forgotLoading ? 0.6 : 1 }} disabled={forgotLoading}>
                  {forgotLoading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
              <button type="button" onClick={() => setMode('login')} style={{ marginTop: 18, fontSize: 13, color: 'var(--ink-4)', background: 'none', border: 'none', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center' }}>
                Back to sign in
              </button>
            </>
          ))}
        </div>
      </div>

      {/* Right — value prop panel */}
      <div style={{ background: 'var(--ink)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 52px', position: 'relative', overflow: 'hidden' }} className="auth-right-panel">
        {/* Decorative blob */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
            MyCommunityNetwork
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--rv-good, #4ade80)', display: 'inline-block' }} />
            {COMMUNITY_NAME}
          </div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 700, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 20px', maxWidth: '16ch' }}>
            {ABOUT ? `${ABOUT}.` : 'A regenerative neighborhood, built together.'}
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: '0 0 40px', maxWidth: '38ch' }}>
            Meet the people, read the shared plan, join if you align with the values, contribute to projects, and help decide what happens next.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { icon: 'user' as IconName, title: 'Deep profiles', desc: 'Share your values, skills, and goals. Get matched with people who align.' },
              { icon: 'vote' as IconName, title: 'Four checks on every proposal', desc: 'Circle leads, all members, admins and advisors, and an AI Blueprint check.' },
              { icon: 'board' as IconName, title: 'Real operations', desc: 'Suggest tasks, make agreements, track subtasks together.' },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0 }}><Icon name={f.icon} size={18} /></div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{f.title}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {mode === 'login' && (
            <div style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>Don't have an account yet?</p>
              <button onClick={() => setMode('register')} style={{ padding: '10px 22px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'background 120ms' }}>
                Sign up — it's free →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
