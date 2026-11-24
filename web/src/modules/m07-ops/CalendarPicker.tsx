'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { DESIGN_REVIEW } from '@/core/lib/instance'
import { Icon } from '@/core/components/v4'

// The design review: the trigger is a soft control (--ctl, no outline, #37), icons from the v4 set, no mono text.
// Classes styled in ops-v4.css; without the review, the inline look as before.
const RV = DESIGN_REVIEW

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface CalendarPickerProps {
  value: string | null          // ISO "YYYY-MM-DD"
  onChange: (date: string | null) => void
  placeholder?: string
  accentColor?: string
  align?: 'left' | 'right'
}

export function CalendarPicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  accentColor = 'var(--m7)',
  align = 'left',
}: CalendarPickerProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const selectedDate = value ? new Date(value + 'T00:00:00') : null

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(selectedDate?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate?.getMonth() ?? today.getMonth())
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left?: number; right?: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setDropdownPos(align === 'right'
      ? { top: r.bottom + 6, right: window.innerWidth - r.right }
      : { top: r.bottom + 6, left: r.left }
    )
  }, [align])

  useEffect(() => {
    if (!open) return
    updatePos()
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open, updatePos])

  // Sync view to value when it changes externally
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear())
      setViewMonth(selectedDate.getMonth())
    }
  }, [value])

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day: number) {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    onChange(`${viewYear}-${mm}-${dd}`)
    setOpen(false)
  }

  const displayLabel = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div ref={ref} style={{ display: 'inline-block' }}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={RV ? `pj5-date${open ? ' is-open' : ''}${displayLabel ? ' has-value' : ''}` : undefined}
        style={RV ? undefined : {
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '7px 12px', borderRadius: 8,
          border: '1px solid var(--rule)', background: 'var(--surface)',
          color: displayLabel ? 'var(--ink)' : 'var(--ink-4)',
          fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          whiteSpace: 'nowrap', transition: 'border-color 100ms',
          outline: open ? `2px solid color-mix(in srgb, ${accentColor} 40%, transparent)` : 'none',
          outlineOffset: 1,
        }}
      >
        {RV ? <Icon name="calendar" size={16} /> : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.7 }}>
          <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        )}
        <span className={RV ? 'pj5-date__label' : undefined}>{displayLabel ?? placeholder}</span>
      </button>

      {/* Dropdown calendar — fixed so no ancestor overflow:hidden can clip it */}
      {open && dropdownPos && (
        <div style={{
          position: 'fixed',
          top: dropdownPos.top,
          ...(dropdownPos.right !== undefined ? { right: dropdownPos.right } : { left: dropdownPos.left }),
          zIndex: 10000,
          background: 'var(--surface)',
          border: RV ? 0 : '1px solid var(--rule)',
          borderRadius: RV ? 20 : 12,
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.18), 0 2px 10px rgba(0,0,0,0.07)',
          padding: '12px 12px 8px',
          minWidth: 256,
          animation: 'calFadeIn 120ms ease-out',
        }}>
          {/* Month / year nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={prevMonth} aria-label="Previous month" style={RV ? navBtnRv : navBtn}>
              {RV ? <Icon name="left" size={16} /> : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
            <span style={RV ? { fontSize: 13, fontWeight: 600, color: 'var(--ink)' } : { fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.02em' }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} aria-label="Next month" style={RV ? navBtnRv : navBtn}>
              {RV ? <Icon name="right" size={16} /> : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
          </div>

          {/* Day-of-week header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAY_LABELS.map(d => (
              <div key={d} style={{
                textAlign: 'center', fontSize: RV ? 11 : 9.5,
                fontFamily: RV ? undefined : 'var(--mono)', fontWeight: RV ? 600 : 700,
                color: 'var(--ink-4)', padding: '3px 0',
                letterSpacing: '0.04em',
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const thisDate = new Date(viewYear, viewMonth, day)
              const isSelected = selectedDate?.getTime() === thisDate.getTime()
              const isToday = today.getTime() === thisDate.getTime()
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  style={{
                    width: '100%', aspectRatio: '1',
                    borderRadius: RV ? 999 : 7,
                    border: isToday && !isSelected
                      ? `1.5px solid ${accentColor}`
                      : '1.5px solid transparent',
                    background: isSelected ? accentColor : 'transparent',
                    color: isSelected ? '#fff' : isToday ? accentColor : 'var(--ink-2)',
                    fontSize: RV ? 13 : 12,
                    fontWeight: isSelected || isToday ? 700 : 400,
                    cursor: 'pointer',
                    transition: 'background 80ms, color 80ms',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-2)'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  }}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Footer: clear */}
          <div style={{ borderTop: RV ? 0 : '1px solid var(--rule)', marginTop: 8, paddingTop: 7, display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false) }}
              style={{
                fontSize: RV ? 13 : 11, color: value ? 'var(--ink-3)' : 'var(--ink-4)',
                background: 'none', border: 'none', cursor: value ? 'pointer' : 'default',
                textDecoration: value ? 'underline' : 'none',
                fontFamily: RV ? 'inherit' : 'var(--mono)', letterSpacing: RV ? 0 : '0.04em',
              }}
            >
              {value ? 'Clear date' : 'No date set'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const navBtnRv: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 999,
  border: 'none', background: 'var(--ctl, #e3e8f4)',
  color: 'var(--ink-2)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const navBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6,
  border: 'none', background: 'var(--bg-2)',
  color: 'var(--ink-2)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 100ms',
}
