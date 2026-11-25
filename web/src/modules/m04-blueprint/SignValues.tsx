'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Icon } from '@/core/components/v4'
import { createClient } from '@/core/lib/supabase/client'

/**
 * Joining step 1 ends here (design/decisions.md #80): the values chapter on About closes with
 * "I share these values". Signing adds a signature for every value not yet signed, the same rows Start
 * joining wrote before (value_signatures), so the menu's next step and My dashboard move on.
 */
export default function SignValues({ userId, valueIds, initialSigned }: { userId: string; valueIds: string[]; initialSigned: string[] }) {
  const router = useRouter()
  const [signed, setSigned] = useState(() => valueIds.every(id => initialSigned.includes(id)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function sign() {
    setBusy(true); setError('')
    const supabase = createClient()
    const rows = valueIds.filter(id => !initialSigned.includes(id)).map(value_id => ({ user_id: userId, value_id }))
    const { error: err } = rows.length ? await supabase.from('value_signatures').insert(rows) : { error: null }
    setBusy(false)
    if (err) { setError(`Couldn't save your signature: ${err.message}. Try again.`); return }
    setSigned(true)
    router.refresh()
  }

  return (
    <div className={`ab-sign${signed ? ' ab-sign--done' : ''}`} aria-live="polite">
      <div className="ab-sign__text">
        <small>Step 1 of 2 · Get to know us</small>
        {signed
          ? <><b><Icon name="check-circle" size={18} />You share our values</b><span>Step 1 is done. Next, tell us a little about you.</span></>
          : <><b>I share these values</b><span>Sign to finish step 1. You can keep reading afterwards.</span></>}
        {error && <span className="ab-sign__error" role="alert">{error}</span>}
      </div>
      {signed
        ? <Button variant="next" href="/join?step=profile">Go to step 2</Button>
        : <Button variant="next" onClick={sign} disabled={busy}>{busy ? 'Signing…' : 'Sign the values'}</Button>}
    </div>
  )
}
