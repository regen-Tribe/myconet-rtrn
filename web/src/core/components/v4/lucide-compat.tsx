/**
 * The older screens imported their icons from lucide-react. These stand-ins keep the same names and
 * props (className, style, size) but draw Sonia's marker-line icons (icons.ts), so every screen uses
 * one icon set (DESIGN-SYSTEM.md › v4). New code uses <Icon name="…" /> from '@/core/components/v4'.
 */
import type { CSSProperties, SVGProps } from 'react'
import { ICONS, type IconName } from './icons'
import { iconSize } from './icon-size'
import { DESIGN_REVIEW } from '@/core/lib/instance'

type Props = Omit<SVGProps<SVGSVGElement>, 'dangerouslySetInnerHTML'> & { size?: number | string; style?: CSSProperties }

/** With the design review on, the size these older screens give in `style` or as Tailwind `h-N w-N` snaps to
 *  16, 20 or 24 like <Icon> (icon-size.ts); everything else in style and className is kept. */
function reviewSize(size: number | string, className?: string, style?: CSSProperties) {
  if (!DESIGN_REVIEW) return { size, className, style }
  const tw = className?.match(/(?:^|\s)h-(\d+)(?:\s|$)/)
  const asked = typeof style?.width === 'number' ? style.width : tw ? Number(tw[1]) * 4 : size
  const rest = style ? { ...style } : undefined
  if (rest) { delete rest.width; delete rest.height }
  return {
    size: iconSize(asked),
    className: className?.replace(/(?:^|\s)[hw]-\d+(?=\s|$)/g, '').trim() || undefined,
    style: rest,
  }
}

function make(name: IconName, extra?: string) {
  function V4LucideIcon({ size: askedSize = 24, className: askedClass, style: askedStyle, ...rest }: Props) {
    const { size, className, style } = reviewSize(askedSize, askedClass, askedStyle)
    return (
      <svg
        viewBox="0 0 24 24" width={size} height={size} aria-hidden
        {...rest}
        style={style}
        className={['v4-icon', extra, className].filter(Boolean).join(' ')}
        dangerouslySetInnerHTML={{ __html: ICONS[name] }}
      />
    )
  }
  V4LucideIcon.displayName = `Icon(${name})`
  return V4LucideIcon
}

export const ArrowLeft = make('left')
export const ArrowRight = make('right')
export const AtSign = make('at')
export const Brain = make('brain')
export const Briefcase = make('briefcase')
export const Camera = make('camera')
export const Check = make('check')
export const CheckCircle = make('check-circle')
export const ChevronDown = make('down')
export const ChevronUp = make('up')
export const Filter = make('filter')
export const Gift = make('gift')
export const Globe = make('globe')
export const Heart = make('heart')
export const HelpCircle = make('help')
export const LayoutDashboard = make('grid')
export const Loader2 = make('loader', 'v4-spin')
export const Lock = make('lock')
export const LogOut = make('logout')
export const MapPin = make('pin')
export const Pencil = make('pencil')
export const Plane = make('plane')
export const Plus = make('plus')
export const Save = make('check')
export const Search = make('search')
export const Sparkles = make('spark')
export const Sprout = make('sprout')
export const Star = make('star')
export const Target = make('target')
export const Trash2 = make('trash')
export const User = make('user')
export const X = make('x')
export const ZoomIn = make('zoom-in')
export const ZoomOut = make('zoom-out')
