import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/server'
import { isJoiningOrAbove } from '@/core/lib/roles'
import { loadCircleRows } from '@/core/lib/circles-server'
import { Icon } from '@/core/components/v4'
import NotesText from '@/modules/m18-meetings/NotesText'
import { readFile, secondBrainOn } from '@/modules/m18-meetings/lib/second-brain'
import { circleFolderOf, isGuidePath, readableName } from '@/modules/m17-org/lib/circle-extras'
import '@/modules/m17-org/circles-v4.css'

/**
 * One of a circle's manuals & guides (v4.63.0): a note from the circle's folder in the second brain, read
 * through MyCoNet so people don't need access to the repo. Joining members and up read it; a note whose front
 * matter says `visibility: circle` only the circle's people (and admins), `visibility: leads` only its leads.
 */
export default async function CircleGuidePage({ searchParams }: { searchParams: Promise<{ c?: string; path?: string }> }) {
  const { c, path } = await searchParams
  if (!c || !path || !secondBrainOn()) notFound()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(`/circles/guide?c=${c}&path=${path}`)}`)
  const { data: profile } = await supabase.from('user_profiles').select('role, lead_circles').eq('id', user.id).maybeSingle()
  const role = profile?.role ?? 'explorer'
  if (!isJoiningOrAbove(role)) notFound()

  const folder = await circleFolderOf(supabase, c)
  if (!isGuidePath(path, folder)) notFound()
  const raw = await readFile(path)
  if (raw == null) notFound()

  // Front matter: who may read it
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const vis = fm?.[1].match(/^visibility:\s*["']?(\w+)/m)?.[1]?.toLowerCase()
  let body = fm ? raw.slice(fm[0].length) : raw
  // The note's own first heading is its title; don't show it twice
  const h1 = body.match(/^\s*#\s+(.+)\r?\n/)
  if (h1) body = body.slice(h1[0].length)
  const isLead = role === 'admin' || (role === 'circle_lead' && (profile?.lead_circles ?? []).includes(c))
  if (vis === 'leads' && !isLead) notFound()
  if (vis === 'circle' && !isLead) {
    const { data: units } = await supabase.from('org_units').select('id').eq('circle', c)
    const ids = (units ?? []).map(u => u.id)
    const { data: mine } = ids.length ? await supabase.from('org_unit_members').select('unit_id').eq('user_id', user.id).in('unit_id', ids).limit(1) : { data: [] }
    if (!mine?.length) notFound()
  }

  const rows = await loadCircleRows(supabase)
  const circle = rows.find(r => r.slug === c)
  const file = path.split('/').pop()!
  const name = h1?.[1].trim() || (/^README\.md$/i.test(file) ? readableName(path.split('/').slice(-2, -1)[0] ?? 'Guide') : readableName(file))
  const repo = process.env.KNOWLEDGE_REPO
  const branch = process.env.KNOWLEDGE_BRANCH || 'main'

  return (
    <div className="v4-page cv4">
      <Link href={`/circles?c=${encodeURIComponent(c)}&tab=guides`} className="v4-back"><Icon name="left" size={14} />{circle ? `${circle.emoji ?? ''} ${circle.name}`.trim() : 'Circle'} · Manuals & guides</Link>
      <header className="v4-ph">
        <div className="v4-ph__row"><div>
          <div className="v4-tags cv4-gap"><span className="v4-tag"><Icon name="book" size={14} />Guide</span>{vis && vis !== 'members' && <span className="v4-tag"><Icon name="lock" size={14} />{vis === 'leads' ? 'Leads only' : 'Circle only'}</span>}</div>
          <h1 className="v4-ph__title">{name}</h1>
        </div></div>
      </header>
      <article className="v4-card cv4-guide"><NotesText text={body} /></article>
      {repo && <p className="v4-hint v4-mt"><a href={`https://github.com/${repo}/blob/${encodeURIComponent(branch)}/${path.split('/').map(encodeURIComponent).join('/')}`} target="_blank" rel="noreferrer">Open in the second brain ↗</a> (to edit it)</p>}
    </div>
  )
}
