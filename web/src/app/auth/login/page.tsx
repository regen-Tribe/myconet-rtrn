'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import { useBranding } from '@/core/components/BrandingProvider'

type Mode = 'login' | 'register' | 'forgot'

export default function AuthPage() {
  const { logo_url } = useBranding()
  const [mode, setMode] = useState<Mode>('login')
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

  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    if (error) { setLoginError(error.message) } else { router.push('/home'); router.refresh() }
    setLoginLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegError('')
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

  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    border: '1px solid var(--rule)', background: 'var(--bg-2)',
    color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'border-color 120ms',
  }
  const btn: React.CSSProperties = {
    width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600,
    background: 'var(--ink)', color: 'var(--bg)', border: 'none', cursor: 'pointer',
    transition: 'opacity 120ms',
  }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', background: 'var(--bg)' }} className="auth-page-grid">

      {/* Left — form */}
      <div className="auth-form-panel">
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="auth-logo-wrap">
            {logo_url ? <img src={logo_url} alt="" style={{ height: 36, width: 'auto', maxWidth: 120, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }} />
              : <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--ink)', display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0 }}>🌱</div>}
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
                <button type="submit" style={{ ...btn, opacity: loginLoading ? 0.6 : 1 }} disabled={loginLoading}>
                  {loginLoading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              {/* Sign up CTA */}
              <div style={{ marginTop: 32, padding: '20px 24px', borderRadius: 12, background: 'color-mix(in srgb, var(--accent-color) 6%, var(--surface))', border: '1px solid color-mix(in srgb, var(--accent-color) 20%, var(--rule))' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-color)', marginBottom: 8 }}>{COMMUNITY_NAME}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>New here? You're welcome.</div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '0 0 12px', lineHeight: 1.65 }}>
                  This is the member portal for a <strong style={{ color: 'var(--ink-2)' }}>regenerative neighborhood</strong> being formed together — meet the people involved, read the community documentation, join if you align with the values, contribute to projects, and help make decisions.
                </p>
                <button type="button" onClick={() => setMode('register')} style={{ width: '100%', padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'var(--accent-color)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  Create free account →
                </button>
              </div>
            </>
          )}

          {mode === 'register' && (regSent ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Check your inbox</h2>
              <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                We sent a confirmation link to <strong style={{ color: 'var(--ink-2)' }}>{regEmail}</strong>.<br />Click it to activate your account — then fill in your profile.
              </p>
              <button onClick={() => { setRegSent(false); setMode('login') }} style={{ marginTop: 24, padding: '10px 24px', borderRadius: 9, fontSize: 13, fontWeight: 600, border: '1px solid var(--rule)', background: 'transparent', color: 'var(--ink-2)', cursor: 'pointer' }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-color)', marginBottom: 10 }}>{COMMUNITY_NAME}</div>
              <h1 style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px' }}>Join the community</h1>
              <p style={{ fontSize: 13.5, color: 'var(--ink-3)', margin: '0 0 10px', lineHeight: 1.65 }}>
                This portal is for <strong style={{ color: 'var(--ink-2)' }}>{COMMUNITY_NAME}</strong> — a regenerative neighborhood being built together. Here you can:
              </p>
              {/* Mobile-only compact tagline (bullets are hidden on small screens) */}
              <p className="auth-reg-tagline" style={{ display: 'none', fontSize: 13, color: 'var(--ink-3)', margin: '0 0 18px', lineHeight: 1.6 }}>
                Meet the people, read the plan, join if you align, contribute to projects, and make decisions together.
              </p>
              <ul className="auth-reg-bullets">
                {[
                  "👋 Meet the people involved and see who's building this",
                  '📋 Read the community documentation and neighborhood plan',
                  '🌱 Join the group if you align with the values',
                  '⚙️ Contribute to shared goals and projects',
                  '☉ Participate in decisions together',
                ].map(item => (
                  <li key={item}><span>{item}</span></li>
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
              <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
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
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            {COMMUNITY_NAME}
          </div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 700, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 20px', maxWidth: '16ch' }}>
            A regenerative neighborhood, built together.
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: '0 0 40px', maxWidth: '38ch' }}>
            Meet the people, read the shared plan, join if you align with the values, contribute to projects, and help decide what happens next.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { icon: '👤', title: 'Deep profiles', desc: 'Share your values, skills, and goals. Get matched with people who align.' },
              { icon: '🗳️', title: '4-layer governance', desc: 'Every proposal is evaluated by Sociocracy, Democracy, Meritocracy, and AI.' },
              { icon: '⚙️', title: 'Real project ops', desc: 'Propose projects, form agreements, track deliverables together.' },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0 }}>{f.icon}</div>
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
