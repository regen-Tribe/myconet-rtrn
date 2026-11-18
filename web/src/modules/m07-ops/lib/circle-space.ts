/**
 * Each circle's space in the second brain — server only. "While you use MyCoNet, it keeps your second brain
 * up to date": every circle has a folder (circles.brain_folder, else its slug) with
 *   - README.md: the circle's index. The agent writes it when it's missing; when people wrote one, the agent
 *     only rewrites its own part, between the myconet:circle markers (purpose, leads, links, projects, recent
 *     meetings, what's in the folder), and leaves the rest as they wrote it;
 *   - board.md: the project manager's board status (board-review.ts).
 * A new folder also gets a line in the second brain's README map. Called by the board review, which the
 * circles trigger asks for when a circle is created, renamed, retired or moved to another folder.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { readFile, saveNote } from '@/modules/m18-meetings/lib/second-brain'

const START = '<!-- myconet:circle start · kept up to date by MyCoNet: write above or below this part, not inside -->'
const END = '<!-- myconet:circle end -->'

export interface CircleRow { slug: string; name: string; emoji: string | null; archived_at: string | null; brain_folder: string | null; leads_to_assign: string | null }

const enc = (p: string) => encodeURI(p).replace(/#/g, '%23')
/** A link from the circle's folder to a repo path (markdown, works in Obsidian and on GitHub) */
const rel = (folder: string, path: string) => `<${'../'.repeat(folder.split('/').length)}${path}>`

export const circleFolder = (c: Pick<CircleRow, 'slug' | 'brain_folder'>) => (c.brain_folder || c.slug).replace(/^\/+|\/+$/g, '')

export async function updateCircleSpace(admin: SupabaseClient, c: CircleRow, opts: {
  purpose: string | null; leads: string[]; projects: { title: string; open: number; url: string }[]; paths: Set<string>
  /** Who's in the circle, and its teams with their people (v4.35.0) */
  members?: string[]; teams?: { name: string; people: string[] }[]
}): Promise<{ folder: string; created: boolean }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const folder = circleFolder(c)
  const { data: meetings } = await admin.from('meeting_transcripts').select('title, notes_path, meeting_date')
    .eq('circle', c.slug).not('notes_path', 'is', null).order('meeting_date', { ascending: false }).limit(12)
  const inside = [...opts.paths].filter(p => p.startsWith(`${folder}/`) && p.endsWith('.md') && !/\/(README|board)\.md$/.test(p))
    .map(p => p.slice(folder.length + 1)).sort()
  const leads = [...opts.leads, ...(c.leads_to_assign ? [`${c.leads_to_assign} (not on MyCoNet yet)`] : [])]

  const part = [
    START,
    '## In MyCoNet',
    '',
    `**Circle:** ${c.emoji ?? ''} ${c.name}${c.archived_at ? ` · **retired** ${c.archived_at.slice(0, 10)}` : ''} · **Leads:** ${leads.length ? leads.join(', ') : '_none yet_'}`,
    `[Board status](board.md) · [Open the board](${appUrl}/ops?circle=${c.slug}) · [Meeting notes](${appUrl}/meetings?circle=${c.slug})`,
    '',
    ...(opts.purpose ? [`**Purpose:** ${opts.purpose.replace(/\s+/g, ' ').trim()}`, ''] : []),
    ...(opts.members?.length ? [`**Members:** ${opts.members.join(', ')}`, ''] : []),
    ...(opts.teams?.length ? ['**Teams:**', ...opts.teams.map(t => `- ${t.name}${t.people.length ? `: ${t.people.join(', ')}` : ''}`), ''] : []),
    '### Projects',
    '',
    ...(opts.projects.length ? opts.projects.map(p => `- [${p.title}](${p.url}) · ${p.open} open task${p.open === 1 ? '' : 's'}`) : ['_No projects yet._']),
    '',
    '### Recent meetings',
    '',
    ...((meetings ?? []).length ? (meetings ?? []).map(m => `- [${m.title}](${rel(folder, m.notes_path as string)})`) : ['_None yet._']),
    '',
    '### In this folder',
    '',
    ...(inside.length ? inside.map(f => `- [${f.replace(/\.md$/, '').split('/').pop()}](<${f}>)`) : ['_Nothing else yet._']),
    END,
  ].join('\n')

  const readmePath = `${folder}/README.md`
  const existing = opts.paths.has(readmePath) ? await readFile(readmePath) : null
  let content: string
  if (existing === null) {
    content = [
      '---', `title: ${JSON.stringify(c.name)}`, `circle: ${c.slug}`, 'visibility: members', 'source: myconet-circle',
      `updated: ${new Date().toISOString().slice(0, 10)}`, '---', '',
      `# ${c.emoji ?? ''} ${c.name}`.trim(), '',
      opts.purpose ? opts.purpose.replace(/\s+/g, ' ').trim() : '_What this circle looks after._', '',
      '## Notes', '', '_The circle’s own notes go in this folder: guides, decisions, how things are done._', '',
      part, '',
    ].join('\n')
  } else if (existing.includes(START) && existing.includes(END)) {
    content = existing.slice(0, existing.indexOf(START)) + part + existing.slice(existing.indexOf(END) + END.length)
  } else {
    content = `${existing.replace(/\s+$/, '')}\n\n${part}\n`
  }
  if (content !== existing) await saveNote(readmePath, content, `${existing === null ? 'New circle' : 'Circle'}: ${c.name}`)

  // A new space gets a line in the second brain's map (in the README's own link style)
  if (existing === null && opts.paths.has('README.md')) {
    const root = await readFile('README.md')
    if (root && !root.includes(`${folder}/README`)) {
      const prefix = root.match(/\[\[((?:[^\]|]*\/)?)[^\]|/]+\/README\|/)?.[1]?.replace(/[^/]+\/README$/, '') ?? null
      const line = prefix !== null && root.includes('[[')
        ? `- [[${prefix}${folder}/README|${c.name}]] · MyCoNet circle`
        : `- [${c.name}](${enc(folder)}/README.md) · MyCoNet circle`
      const lines = root.split('\n')
      // After the last item of the map (the first list after "## Map"), else at the end
      const mapAt = lines.findIndex(l => /^##\s+Map/i.test(l))
      let at = -1
      if (mapAt >= 0) for (let i = mapAt + 1; i < lines.length && !/^##\s/.test(lines[i]); i++) if (/^- /.test(lines[i])) at = i
      if (at >= 0) lines.splice(at + 1, 0, line); else lines.push('', line)
      await saveNote('README.md', lines.join('\n'), `Second brain map: ${c.name}`)
    }
  }
  if (!c.brain_folder) await admin.from('circles').update({ brain_folder: folder }).eq('slug', c.slug)
  return { folder, created: existing === null }
}
