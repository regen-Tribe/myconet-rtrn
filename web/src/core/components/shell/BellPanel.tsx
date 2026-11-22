'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@/core/components/v4'
import { createClient } from '@/core/lib/supabase/client'
import { ago, loadBell, type Bell, type BellItem } from '@/core/lib/bell'

/**
 * The bell in the top bar: a card under it with "Needs you" (the number on the bell) and
 * "Activity" (the last week). From the redesign prototype (design/redesign-prototype, bell()).
 * Items come from core/lib/bell.ts; nothing is stored for the bell itself.
 */
export default function BellPanel({ userId, role }: { userId: string; role: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [bell, setBell] = useState<Bell | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const refresh = useCallback(() => {
    loadBell(createClient(), userId, role).then(setBell).catch(() => setBell(b => b ?? { needs: [], activity: [] }))
  }, [userId, role])

  // Load on sign-in and on every page change (things get done as people move around)
  useEffect(() => { refresh() }, [refresh, pathname])

  // Close on a click outside or Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const close = () => setOpen(false)
  const count = bell?.needs.length ?? 0
  const label = count ? `Notifications, ${count} need${count === 1 ? 's' : ''} you` : 'Notifications'

  return (
    <div ref={ref} className="bell" style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button" className="bell-btn" aria-label={label} aria-expanded={open} aria-haspopup="dialog"
        onClick={() => { setOpen(o => !o); if (!open) refresh() }}>
        <Icon name="bell" size={15} />
        {count > 0 && <span className="bell-count">{count > 9 ? '9+' : count}</span>}
      </button>

      {open && (
        <div className="bell-pop" role="dialog" aria-label="Notifications">
          {!bell ? (
            <p className="bell-empty">Loading…</p>
          ) : (
            <>
              <Section title="Needs you" count={bell.needs.length} items={bell.needs} empty="Nothing is waiting on you." onPick={close} strong />
              <Section title="Activity" items={bell.activity} empty="Nothing new this week." onPick={close} />
            </>
          )}
          <Link href="/dashboard" className="bell-foot" onClick={close}>Open my dashboard</Link>
        </div>
      )}
    </div>
  )
}

function Section({ title, count, items, empty, strong, onPick }: { title: string; count?: number; items: BellItem[]; empty: string; strong?: boolean; onPick: () => void }) {
  return (
    <section className="bell-sec">
      <h3 className="bell-h">{title}{count ? ` · ${count}` : ''}</h3>
      {items.length === 0 ? <p className="bell-empty">{empty}</p> : items.map(it => (
        <Link key={it.key} href={it.href} onClick={onPick} className={`bell-row${strong ? ' bell-row--needs' : ''}`}>
          <span className="bell-ic"><Icon name={it.icon} size={16} /></span>
          <span className="bell-main">
            <b>{it.title}</b>
            <small>{it.line}{it.at ? ` · ${ago(it.at)}` : ''}</small>
          </span>
        </Link>
      ))}
    </section>
  )
}
