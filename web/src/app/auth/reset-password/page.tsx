'use client'
import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/components/ui/card'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { Label } from '@/core/components/ui/label'
import { Loader2, Sprout, CheckCircle } from 'lucide-react'

function ResetPasswordForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Links arrive as ?code= (asked for on this site) or #access_token= (sent by an
    // admin or from Supabase); a failed link carries error_description instead
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const code = searchParams.get('code')
    const failed = hash.get('error_description') ?? searchParams.get('error_description')
    const expired = 'This reset link has expired or was already used. Links work once, for an hour, in the same browser you asked from. Request a new one below.'

    if (failed) { setError(expired); return }
    if (hash.get('access_token') && hash.get('refresh_token')) {
      supabase.auth.setSession({ access_token: hash.get('access_token')!, refresh_token: hash.get('refresh_token')! })
        .then(({ error }) => {
          window.history.replaceState(null, '', window.location.pathname)
          if (error) setError(expired)
          else setReady(true)
        })
      return
    }
    if (!code) { setError('This page needs the link from your reset email. Request a new one below.'); return }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setError(expired)
      else setReady(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords don't match"); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/network'), 2000)
    }
    setLoading(false)
  }

  if (done) return (
    <div className="text-center py-6 space-y-3">
      <CheckCircle className="h-12 w-12 text-primary mx-auto" />
      <p className="font-semibold">Password updated!</p>
      <p className="text-sm text-muted-foreground">Redirecting you to the network...</p>
    </div>
  )

  if (error && !ready) return (
    <div className="space-y-4">
      <p className="text-sm text-destructive">{error}</p>
      <Button variant="outline" className="w-full" onClick={() => router.push('/auth/login?mode=forgot')}>
        Request a new link
      </Button>
    </div>
  )

  if (!ready) return (
    <div className="flex justify-center py-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <Input id="new-password" type="password" required
          value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Min 6 characters" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <Input id="confirm-password" type="password" required
          value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="Repeat your new password" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'Update password'}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <Card className="w-full max-w-md border-card-border">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Sprout className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">{COMMUNITY_NAME}</span>
            <span className="text-sm text-muted-foreground">· MyCoNet</span>
          </div>
          <CardTitle className="text-2xl">Set new password</CardTitle>
          <CardDescription>Choose a strong password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
