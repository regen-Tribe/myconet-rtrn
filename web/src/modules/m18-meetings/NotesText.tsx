import type { ReactNode } from 'react'

// The little markdown Fireflies and the second-brain note use: headings, bullets, **bold**, _italic_,
// [links](…). React elements only, never HTML, so nothing in a note can run on the page.

const safeHref = (href: string) => (/^(https?:\/\/|\/)/i.test(href) ? href : null)

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|(?<![\w*])[_*]([^_*]+)[_*](?![\w*])/g
  let last = 0, k = 0
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1] !== undefined) out.push(<strong key={k++}>{m[1]}</strong>)
    else if (m[2] !== undefined) {
      const href = safeHref(m[3])
      out.push(href ? <a key={k++} href={href} target={href.startsWith('/') ? undefined : '_blank'} rel="noreferrer" style={{ color: 'var(--m18)' }}>{m[2]}</a> : m[2])
    } else out.push(<em key={k++}>{m[4]}</em>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export default function NotesText({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let bullets: string[] = []
  const flush = () => {
    if (!bullets.length) return
    blocks.push(<ul key={blocks.length} style={{ margin: '0 0 12px', paddingLeft: 20 }}>{bullets.map((b, i) => <li key={i} style={{ marginBottom: 4 }}>{inline(b)}</li>)}</ul>)
    bullets = []
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const bullet = line.match(/^(?:[-•*]|\d+\.)\s+(.*)$/)
    if (bullet) { bullets.push(bullet[1]); continue }
    flush()
    if (!line) continue
    const heading = line.match(/^#{1,6}\s+(.*)$/)
    if (heading) blocks.push(<div key={blocks.length} style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '16px 0 6px' }}>{inline(heading[1])}</div>)
    else blocks.push(<p key={blocks.length} style={{ margin: '0 0 10px' }}>{inline(line)}</p>)
  }
  flush()
  return <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--ink-2)', wordBreak: 'break-word' }}>{blocks}</div>
}
