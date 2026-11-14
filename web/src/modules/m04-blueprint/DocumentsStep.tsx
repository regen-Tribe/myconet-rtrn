'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import DocumentKindPicker from '@/modules/assistant/DocumentKindPicker'
import { addToLibrary, listLibrary, titleFromFile, type DocKind, type LibraryEntry } from '@/modules/assistant/lib/library'
import { extractPdfText } from '@/modules/m04-blueprint/lib/pdf-text'

/**
 * Setup step: the community's document library, which the portal assistant answers
 * from. Admins and circle leads add documents (asked whether each is shareable or
 * sensitive), change that, rename or remove them. Others see the shareable ones.
 */
export default function DocumentsStep({ canEdit, onPrev, onNext }: { canEdit: boolean; onPrev: () => void; onNext: () => void }) {
  const [docs, setDocs] = useState<LibraryEntry[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState<DocKind | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null)

  const load = useCallback(async () => setDocs(await listLibrary()), [])
  useEffect(() => { load() }, [load])

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(true); setError('')
    const { error: err } = await fn()
    if (err) setError(err.message)
    await load()
    setBusy(false)
  }

  const upload = async (file: File | undefined) => {
    if (!file || !kind) return
    setError(''); setBusy(true)
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      setStatus('Reading the file…')
      const content = isPdf
        ? await extractPdfText(file, (p, t) => setStatus(`Reading page ${p} of ${t}…`))
        : await file.text()
      if (!content.trim()) throw new Error('No text found in that file (a scanned PDF needs text recognition first).')
      setStatus('Adding it to the library…')
      await addToLibrary({ title: titleFromFile(file.name), fileName: file.name, visibility: kind, content })
      setAdding(false); setKind(null)
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
    setStatus(''); setBusy(false)
  }

  return (
    <div>
      <div className="crumb"><span>Setup</span><span className="crumb-sep">/</span><span>Documents</span></div>
      <h1 className="step-title">Documents</h1>
      <p className="step-lede">
        The community&rsquo;s library. The <strong>Ask {COMMUNITY_NAME}</strong> assistant answers people&rsquo;s questions from these documents and the Blueprint, and says where each answer comes from.
      </p>

      {error && (
        <div style={{ fontSize: 13, color: '#b91c1c', background: '#b91c1c12', border: '1px solid #b91c1c40', borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: 16 }}>{error}</div>
      )}

      <div className="section">
        <div className="section-head">
          <div className="section-title">Library</div>
          <div className="section-meta-row"><span className="section-meta">{docs ? `${docs.length} document${docs.length === 1 ? '' : 's'}` : ''}</span></div>
        </div>
        {docs && docs.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--ink-3)', border: '1px dashed var(--rule)', borderRadius: 8, padding: '12px 14px' }}>
            No documents yet. Documents imported into the Blueprint can be added here too.
          </div>
        )}
        {(docs ?? []).map(d => (
          <div key={d.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 14px', marginBottom: 8, border: '1px solid var(--rule)', borderRadius: 8, background: 'var(--surface)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18 }}>{d.visibility === 'leads' ? '🔒' : '🌐'}</span>
            <div style={{ flex: 1, minWidth: 180 }}>
              {renaming?.id === d.id ? (
                <input className="input" value={renaming.title} maxLength={200} autoFocus
                  onChange={e => setRenaming({ ...renaming, title: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter' && renaming.title.trim()) { run(() => createClient().from('community_documents').update({ title: renaming.title.trim() }).eq('id', d.id)); setRenaming(null) } }} />
              ) : <div style={{ fontSize: 14, fontWeight: 600 }}>{d.title}</div>}
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
                {d.visibility === 'leads' ? 'Sensitive · admins and circle leads only' : 'Shareable · anyone using the assistant'}
                {d.pages ? ` · ${d.pages} pages` : ''} · added {new Date(d.created_at).toLocaleDateString()}
              </div>
            </div>
            {canEdit && (confirmRemove === d.id ? (
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12 }}>Remove from the library?</span>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setConfirmRemove(null)} disabled={busy}>Keep</button>
                <button className="btn" style={{ fontSize: 12, color: '#b91c1c' }} disabled={busy}
                  onClick={() => { setConfirmRemove(null); run(() => createClient().from('community_documents').delete().eq('id', d.id)) }}>Remove</button>
              </span>
            ) : (
              <span style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} disabled={busy}
                  onClick={() => run(() => createClient().from('community_documents').update({ visibility: d.visibility === 'leads' ? 'everyone' : 'leads' }).eq('id', d.id))}>
                  {d.visibility === 'leads' ? 'Make shareable' : 'Make sensitive'}
                </button>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} disabled={busy} onClick={() => setRenaming({ id: d.id, title: d.title })}>Rename</button>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} disabled={busy} onClick={() => setConfirmRemove(d.id)}>Remove</button>
              </span>
            ))}
          </div>
        ))}

        {canEdit && (adding ? (
          <div style={{ marginTop: 12, padding: 14, border: '1px solid var(--accent)', borderRadius: 8, background: 'var(--bg-2)' }}>
            <DocumentKindPicker value={kind} onChange={setKind} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
              <label className="btn btn-primary" style={{ cursor: kind && !busy ? 'pointer' : 'not-allowed', opacity: kind && !busy ? 1 : 0.5 }}>
                {busy ? status || 'Working…' : 'Choose a file (PDF, .txt, .md)'}
                <input type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" disabled={!kind || busy} style={{ display: 'none' }}
                  onChange={e => { upload(e.target.files?.[0]); e.target.value = '' }} />
              </label>
              <button className="btn btn-ghost" onClick={() => { setAdding(false); setKind(null) }} disabled={busy}>Cancel</button>
              {!kind && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Choose what kind of document it is first.</span>}
            </div>
          </div>
        ) : (
          <button className="btn" style={{ marginTop: 6 }} onClick={() => setAdding(true)}>+ Add a document</button>
        ))}
        {!canEdit && <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>Admins and circle leads add documents.</p>}
      </div>

      <div className="nav-row">
        <button className="btn btn-ghost" onClick={onPrev}>← Previous</button>
        <button className="btn btn-primary" onClick={onNext}>Save &amp; continue →</button>
      </div>
    </div>
  )
}
