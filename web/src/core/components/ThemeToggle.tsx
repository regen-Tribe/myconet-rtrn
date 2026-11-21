'use client'
import { Icon } from '@/core/components/v4'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark')
    setMounted(true)
  }, [])

  const toggle = () => {
    const next = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('theme', next)
    setDark(!dark)
  }

  return (
    <button onClick={toggle} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} style={{
      background: 'none', border: '1px solid var(--rule)',
      borderRadius: 'var(--radius)', padding: '5px 9px',
      color: 'var(--ink-3)', fontSize: 15, lineHeight: 1,
      cursor: 'pointer', display: 'flex', alignItems: 'center',
      visibility: mounted ? 'visible' : 'hidden',
    }}>
      <Icon name={dark ? 'sun' : 'moon'} size={16} />
    </button>
  )
}
