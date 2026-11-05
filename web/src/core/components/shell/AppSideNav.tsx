'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { isFullMember, isAdmin } from '@/core/lib/roles'
import { CLUBHOUSE, MEMBER_MODULES } from '@/core/lib/nav'


function NavItem({ num, name, color, href, active, onClick }: {
  num: string; name: string; color: string; href: string | null; active: boolean; onClick?: () => void
}) {
  const inner = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 10px', borderRadius: 7,
      fontSize: 13,
      color: active ? 'var(--ink)' : 'var(--ink-2)',
      fontWeight: active ? 600 : 400,
      background: active ? `color-mix(in srgb, ${color} 10%, var(--surface))` : 'transparent',
      border: active ? `1px solid color-mix(in srgb, ${color} 25%, var(--rule))` : '1px solid transparent',
      opacity: href ? 1 : 0.45,
      transition: 'background 80ms, border-color 80ms',
    }}>
      <span style={{ width: active ? 3 : 2, height: 16, borderRadius: 2, background: color, flexShrink: 0, opacity: active ? 1 : 0.5 }} />
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, width: 22,
        color: active ? color : 'var(--ink-4)',
      }}>M{num}</span>
      <span>{name}</span>
    </div>
  )

  if (!href) return <div style={{ cursor: 'default' }}>{inner}</div>

  return (
    <Link href={href} onClick={onClick} style={{ textDecoration: 'none', display: 'block' }} className="sh-nav-item">
      {inner}
    </Link>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)',
      padding: '12px 10px 6px',
    }}>
      {label}
    </div>
  )
}

const JOURNEY = [
  {
    role: 'explorer',
    label: 'Explorer',
    color: 'var(--ink-3)',
    next: 'Complete M05 Join and get accepted.',
    cta: 'Go to Join →',
    href: '/join',
  },
  {
    role: 'joining',
    label: 'Joining',
    color: 'var(--m5)',
    next: 'Support a project in Agreements, or propose a new project in Operations. Once accepted, you become a Member.',
    cta: 'Go to Agreements →',
    href: '/agreements',
  },
  {
    role: 'member',
    label: 'Member',
    color: 'var(--m9)',
    next: null,
    cta: null,
    href: null,
  },
]

function JourneyBox({ role }: { role: string }) {
  const isMemberPlus = isFullMember(role)
  const effectiveRole = isMemberPlus ? 'member' : role
  const current = JOURNEY.find(s => s.role === effectiveRole) ?? JOURNEY[0]

  return (
    <div style={{
      padding: '12px 12px 10px', marginTop: 8, borderRadius: 8,
      background: `color-mix(in srgb, ${current.color} 8%, var(--surface))`,
      border: `1px solid color-mix(in srgb, ${current.color} 22%, var(--rule))`,
    }}>
      {/* Step indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 10 }}>
        {JOURNEY.map((step, i) => {
          const done = JOURNEY.indexOf(current) > i
          const active = step.role === effectiveRole
          const stepColor = done || active ? step.color : 'var(--rule)'
          return (
            <div key={step.role} style={{ display: 'flex', alignItems: 'center', flex: i < JOURNEY.length - 1 ? 1 : 'unset' }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                background: done ? step.color : active ? step.color : 'var(--bg-2)',
                border: `2px solid ${stepColor}`,
                display: 'grid', placeItems: 'center',
                fontSize: 8, color: '#fff', fontWeight: 700,
              }}>
                {done ? '✓' : active ? '●' : ''}
              </div>
              {i < JOURNEY.length - 1 && (
                <div style={{ flex: 1, height: 1.5, background: done ? 'var(--ink-3)' : 'var(--rule)', margin: '0 3px' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        {JOURNEY.map((step, i) => {
          const done = JOURNEY.indexOf(current) > i
          const active = step.role === effectiveRole
          return (
            <span key={step.role} style={{
              fontFamily: 'var(--mono)', fontSize: 9, fontWeight: active ? 700 : 500,
              color: active ? step.color : done ? 'var(--ink-3)' : 'var(--ink-4)',
              textTransform: 'uppercase', letterSpacing: '0.04em',
              flex: i < JOURNEY.length - 1 ? 1 : 'unset',
            }}>
              {step.label}
            </span>
          )
        })}
      </div>

      {/* Current state message */}
      {isMemberPlus ? (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          You have full access to all modules.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: current.cta ? 8 : 0 }}>
            {current.next}
          </div>
          {current.cta && current.href && (
            <Link href={current.href} style={{
              display: 'inline-block', fontSize: 11, fontWeight: 700,
              color: current.color, textDecoration: 'none',
            }}>
              {current.cta}
            </Link>
          )}
        </>
      )}
    </div>
  )
}

interface Props {
  mobileOpen?: boolean
  onClose?: () => void
  initialRole?: string
  isLoggedIn?: boolean
}

export default function AppSideNav({ mobileOpen, onClose, initialRole = 'explorer', isLoggedIn = false }: Props) {
  const pathname = usePathname()
  const [role] = useState<string>(initialRole)

  const isActive = (href: string | null) => {
    if (!href) return false
    if (href === '/dashboard') return pathname === '/dashboard'
    // M01 (/network) also owns /u/[username] — keep the module highlighted on public profile pages.
    if (href === '/network') return pathname.startsWith('/network') || pathname.startsWith('/u/')
    return pathname.startsWith(href)
  }

  return (
    <nav
      className={`app-shell-sidenav${mobileOpen ? ' mobile-open' : ''}`}
      style={{
        borderRight: '1px solid var(--rule)',
        background: 'var(--bg-2)',
        padding: '14px 10px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {/* Mobile close row */}
      <div className="mobile-nav-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink-4)', textTransform: 'uppercase' }}>Modules</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 18, lineHeight: 1, padding: '2px 6px' }}
          aria-label="Close navigation"
        >
          ✕
        </button>
      </div>

      <SectionLabel label="Clubhouse" />
      {CLUBHOUSE.map(m => (
        <NavItem key={m.num} {...m} active={isActive(m.href)} onClick={onClose} />
      ))}

      <SectionLabel label="Welcome Home" />
      {MEMBER_MODULES.map(m => (
        <NavItem
          key={m.num}
          {...m}
          active={isActive(m.href)}
          onClick={onClose}
        />
      ))}
      {!isLoggedIn && (
        <div style={{ margin: '4px 6px 0', padding: '6px 10px', borderRadius: 7, background: 'var(--bg-2)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>view only</span>
          <a href="/auth/signup" style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--m9)', textDecoration: 'none' }}>
            Join to interact →
          </a>
        </div>
      )}

      {isAdmin(role) && (
        <>
          <SectionLabel label="Admin" />
          <Link
            href="/admin/users"
            onClick={onClose}
            style={{ textDecoration: 'none', display: 'block' }}
            className="sh-nav-item"
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 7,
              fontSize: 13,
              color: isActive('/admin/users') ? 'var(--ink)' : 'var(--ink-2)',
              fontWeight: isActive('/admin/users') ? 600 : 400,
              background: isActive('/admin/users') ? 'color-mix(in srgb, #dc2626 10%, var(--surface))' : 'transparent',
              border: isActive('/admin/users') ? '1px solid color-mix(in srgb, #dc2626 25%, var(--rule))' : '1px solid transparent',
            }}>
              <span style={{ width: 2, height: 16, borderRadius: 2, background: '#dc2626', flexShrink: 0, opacity: isActive('/admin/users') ? 1 : 0.5 }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, width: 22, color: isActive('/admin/users') ? '#dc2626' : 'var(--ink-4)' }}>★</span>
              <span>Users</span>
            </div>
          </Link>
          <Link
            href="/admin/questions"
            onClick={onClose}
            style={{ textDecoration: 'none', display: 'block' }}
            className="sh-nav-item"
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 7,
              fontSize: 13,
              color: isActive('/admin/questions') ? 'var(--ink)' : 'var(--ink-2)',
              fontWeight: isActive('/admin/questions') ? 600 : 400,
              background: isActive('/admin/questions') ? 'color-mix(in srgb, #dc2626 10%, var(--surface))' : 'transparent',
              border: isActive('/admin/questions') ? '1px solid color-mix(in srgb, #dc2626 25%, var(--rule))' : '1px solid transparent',
            }}>
              <span style={{ width: 2, height: 16, borderRadius: 2, background: '#dc2626', flexShrink: 0, opacity: isActive('/admin/questions') ? 1 : 0.5 }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, width: 22, color: isActive('/admin/questions') ? '#dc2626' : 'var(--ink-4)' }}>?</span>
              <span>Questions</span>
            </div>
          </Link>
        </>
      )}

      <div style={{ flex: 1 }} />

      {isLoggedIn && <JourneyBox role={role} />}
    </nav>
  )
}
