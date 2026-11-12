'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/core/lib/supabase/client'

/** Change your password while signed in (no email needed, unless Supabase asks for a code). */
export default function ChangePasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState<string | null | undefined>(undefined)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  // Set when Supabase wants a fresh sign-in: it emails a code to type here
  const [needsCode, setNeedsCode] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Use at least 6 characters.'); return }
    if (password !== confirm) { setError('The two passwords don’t match.'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser(needsCode ? { password, nonce: code.trim() } : { password })
    setSaving(false)
    if (!error) { setDone(true); return }
    if (!needsCode && /reauthenticat/i.test(error.message)) {
      const { error: sendError } = await supabase.auth.reauthenticate()
      if (sendError) { setError(sendError.message); return }
      setNeedsCode(true)
      return
    }
    setError(/same.*password|different from the old/i.test(error.message)
      ? 'That’s your current password. Choose a new one.'
      : error.message)
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    border: '1px solid var(--rule)', background: 'var(--bg-2)', color: 'var(--ink)',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const btn: React.CSSProperties = {
    width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600,
    background: 'var(--ink)', color: 'var(--bg)', border: 'none', cursor: 'pointer',
  }
  const lbl: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }

  return (
    <div style={{ padding: '40px 16px 60px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>Change password</h1>
        {email === undefined ? null : email === null ? (
          <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>
            <Link href="/auth/login" style={{ color: 'var(--ink)', fontWeight: 600 }}>Sign in</Link> to change your password.
            Forgotten it? Use “Forgot password?” on the sign-in page.
          </p>
        ) : done ? (
          <>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>Your password is changed. Use it next time you sign in.</p>
            <Link href="/home" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Back to home →</Link>
          </>
        ) : (
          <>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 24px' }}>For <strong style={{ color: 'var(--ink-2)' }}>{email}</strong></p>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl} htmlFor="new-password">New password</label>
                <input id="new-password" style={inp} type="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
              </div>
              <div>
                <label style={lbl} htmlFor="confirm-password">New password again</label>
                <input id="confirm-password" style={inp} type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} />
              </div>
              {needsCode && (
                <div>
                  <label style={lbl} htmlFor="code">Code from your email</label>
                  <input id="code" style={inp} inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={e => setCode(e.target.value)} />
                  <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '6px 0 0' }}>For your security we emailed you a code. Type it here to confirm the change.</p>
                </div>
              )}
              {error && <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>}
              <button type="submit" style={{ ...btn, opacity: saving ? 0.6 : 1 }} disabled={saving}>
                {saving ? 'Saving…' : 'Change password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
