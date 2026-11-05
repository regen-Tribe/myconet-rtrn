import { createClient } from '@/core/lib/supabase/client'

/**
 * The community's document library (`community_documents`): what the portal assistant
 * answers from. Admins and circle leads add documents; each is shareable or for leads.
 */
export type DocKind = 'everyone' | 'leads'

export interface LibraryEntry {
  id: string; title: string; file_name: string | null; visibility: DocKind; pages: number | null; created_at: string
}

export const DOC_KINDS: { id: DocKind; label: string; help: string }[] = [
  { id: 'everyone', label: 'Shareable', help: 'Anyone using the portal assistant may get answers from it: handbooks, guides, the vision, how to visit or join.' },
  { id: 'leads', label: 'Sensitive', help: 'Only admins and circle leads get answers from it: finances, contracts, internal agreements, personal details.' },
]

export const titleFromFile = (name: string) => name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 200) || 'Document'

export const pageCount = (text: string) => (text.match(/\[Page \d+\]/g) ?? []).length || null

export async function addToLibrary(doc: { title: string; fileName: string; visibility: DocKind; content: string }) {
  const { error } = await createClient().from('community_documents').insert({
    title: doc.title, file_name: doc.fileName, visibility: doc.visibility,
    content: doc.content.slice(0, 2_000_000), pages: pageCount(doc.content),
  })
  if (error) throw new Error(error.message)
}

export async function listLibrary(): Promise<LibraryEntry[]> {
  const { data } = await createClient().from('community_documents')
    .select('id, title, file_name, visibility, pages, created_at').order('created_at', { ascending: false })
  return (data ?? []) as LibraryEntry[]
}
