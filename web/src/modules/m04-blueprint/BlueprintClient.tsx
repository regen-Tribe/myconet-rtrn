'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/core/lib/supabase/client'
import { FW_DATA, PILLAR_STEPS, type StepDef, type PhaseDef, type GuideContent } from '@/modules/m04-blueprint/lib/wizard-data'
import { computePillarScores, computeGatesPassed } from '@/modules/m04-blueprint/lib/blueprint-compute'
import { communityName, FRAMEWORK_CREDIT } from '@/core/lib/instance'
import { useCircles } from '@/core/components/CirclesProvider'
import CirclesStep from '@/modules/m04-blueprint/CirclesStep'
import CommunityValuesEditor from '@/modules/m04-blueprint/CommunityValuesEditor'
import BrandingStep from '@/modules/m04-blueprint/BrandingStep'
import { useBranding } from '@/core/components/BrandingProvider'
import { useRouter } from 'next/navigation'
import { aiPickBranding, extractPdfImages, releasePdfImages, suggestBranding, type PdfImage } from '@/modules/m04-blueprint/lib/pdf-images'
import { scanDocument, type AnswerMeta, type ScanProgress } from '@/modules/m04-blueprint/lib/doc-scan'
import { extractPdfText } from '@/modules/m04-blueprint/lib/pdf-text'
import DocumentsStep from '@/modules/m04-blueprint/DocumentsStep'
import DocumentKindPicker from '@/modules/assistant/DocumentKindPicker'
import { addToLibrary, titleFromFile, type DocKind } from '@/modules/assistant/lib/library'
import { setBrandingImage } from '@/modules/m04-blueprint/lib/branding-upload'
import { FOUND_CIRCLES_KEY, type FoundCircle } from '@/modules/m04-blueprint/lib/circle-setup'
import { crawlSite, SITE_MAX_PAGES, type SiteCrawl } from '@/modules/m04-blueprint/lib/site-crawl'
import '@/modules/m04-blueprint/wizard.css'

// ── Types ────────────────────────────────────────────────────────────────────

type Values = Record<string, unknown>

interface Props {
  blueprintId: string
  initialAnswers: Values
  initialFlags: Record<string, boolean>
  /** Admins only: circles and the logo/banner are admin-write */
  isAdmin?: boolean
  /** Open on this step (`/blueprint?step=s1.4`), e.g. from the Join page */
  initialStep?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function stepComplete(step: StepDef, values: Values) {
  if (step.kind === 'gate') return false
  const fields = step.fields ?? []
  const sliders = step.sliders ?? []
  const checks = step.checklist ?? []
  if (fields.length === 0 && sliders.length === 0 && checks.length === 0) return false
  let hasAny = false
  fields.forEach(f => { if (values[f.id] && String(values[f.id]).length > 5) hasAny = true })
  sliders.forEach(s => { if (values[s.id] != null) hasAny = true })
  checks.forEach(c => { if (values[c.id]) hasAny = true })
  return hasAny
}

function gateStatus(step: StepDef, values: Values) {
  const criteria = step.criteria ?? []
  const met = criteria.filter(c => {
    const v = values[c.metric]
    return (typeof v === 'boolean' && v) || (typeof v === 'number' && v >= 6)
  }).length
  const ratio = met / criteria.length
  if (ratio >= 0.8) return 'ready'
  if (ratio >= 0.5) return 'warning'
  return 'not-ready'
}


function debounce<T extends (...args: Parameters<T>) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

// ── Field catalog (for AI import) ────────────────────────────────────────────

interface FieldCatalogEntry {
  id: string; kind: 'text' | 'slider' | 'check'; phase: string; step: string; label: string; help: string
}
/** A step (or one section of it), or `circles` for the Circles step's own scan. */
interface ImportScope { step?: StepDef; section?: string; circles?: boolean }

function buildFieldCatalog(scope?: ImportScope): FieldCatalogEntry[] {
  const catalog: FieldCatalogEntry[] = []
  if (scope?.circles) return catalog
  const scopedStepId = scope?.step?.id ?? null
  const scopedSection = scope?.section ?? null
  FW_DATA.phases.forEach(phase => {
    phase.steps.forEach(step => {
      if (step.kind === 'gate') return
      if (scopedStepId && step.id !== scopedStepId) return
      if (!scopedSection || scopedSection === 'fields') {
        (step.fields ?? []).forEach(f => catalog.push({ id: f.id, kind: 'text', phase: phase.name, step: step.title ?? '', label: f.label, help: f.help ?? '' }))
      }
      if (!scopedSection || scopedSection === 'sliders') {
        (step.sliders ?? []).forEach(s => catalog.push({ id: s.id, kind: 'slider', phase: phase.name, step: step.title ?? '', label: s.label, help: 'Score 0-10' }))
      }
      if (!scopedSection || scopedSection === 'checklist') {
        (step.checklist ?? []).forEach(c => {
          catalog.push({ id: c.id, kind: 'check', phase: phase.name, step: step.title ?? '', label: c.text, help: 'Yes/No' })
          catalog.push({ id: c.id + '_note', kind: 'text', phase: phase.name, step: step.title ?? '', label: 'Notes for: ' + c.text, help: 'Short note describing how this is handled.' })
        })
      }
    })
  })
  return catalog
}

// ── FileDropzone ──────────────────────────────────────────────────────────────

function FileDropzone({ onFile, fileName, disabled = false }: { onFile: (f: File) => void; fileName: string; disabled?: boolean }) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div
      className="dropzone"
      style={{ border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--rule)'}`, borderRadius: 4, padding: '28px 20px', textAlign: 'center', background: dragOver ? 'var(--accent-soft)' : 'var(--bg-2)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'all 120ms' }}
      onClick={() => { if (!disabled) inputRef.current?.click() }}
      onDragOver={e => { e.preventDefault(); if (!disabled) setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f && !disabled) onFile(f) }}
    >
      <input ref={inputRef} type="file" accept=".pdf,.txt,.md,.markdown,.json,text/*,application/pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]) }} />
      <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 18 }}>
        {disabled ? 'Choose what kind of document it is first' : fileName ? <span>Loaded: <strong>{fileName}</strong></span> : 'Drop a document, or click to browse'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6, fontFamily: 'var(--mono)', letterSpacing: '0.1em' }}>.PDF · .TXT · .MD · .JSON · plain text</div>
    </div>
  )
}

// ── ImportModal ───────────────────────────────────────────────────────────────

function ImportModal({ onClose, onApply, currentValues, scope, canSetBranding = false }: {
  onClose: () => void; onApply: (vals: Values) => void; currentValues: Values; scope?: ImportScope
  /** Admins: full PDF imports also suggest a logo and banner from the document's images */
  canSetBranding?: boolean
}) {
  const router = useRouter()
  const branding = useBranding()
  const [pdfImages, setPdfImages] = useState<PdfImage[]>([])
  const [pick, setPick] = useState<{ logo: string | null; banner: string | null }>({ logo: null, banner: null })
  const [applying, setApplying] = useState(false)
  const [aiPicked, setAiPicked] = useState<{ logo: string | null; banner: string | null }>({ logo: null, banner: null })
  const stopImages = useRef(false)
  const [lookingForImages, setLookingForImages] = useState(false)
  const [imageStatus, setImageStatus] = useState('')
  const [applyError, setApplyError] = useState('')
  const suggestions = useMemo(() => suggestBranding(pdfImages), [pdfImages])
  // Object URLs for the thumbnails are freed when the images change or the modal closes
  useEffect(() => () => releasePdfImages(pdfImages), [pdfImages])

  const [stage, setStage] = useState<'upload' | 'extracting' | 'scanning' | 'review' | 'error'>('upload')
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null)
  // Asked before every upload: every document goes into the library, shareable or sensitive
  const [docKind, setDocKind] = useState<DocKind | null>(null)
  const [libraryStatus, setLibraryStatus] = useState<'' | 'saving' | 'saved' | string>('')
  const [finishingImages, setFinishingImages] = useState(false)
  // Elapsed time on the progress screen, so a long scan never looks stuck
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (stage !== 'extracting' && stage !== 'scanning') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [stage])
  const [answerMeta, setAnswerMeta] = useState<Record<string, AnswerMeta>>({})
  const [gaps, setGaps] = useState<string[]>([])
  const [failedParts, setFailedParts] = useState(0)
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 })
  const [docText, setDocText] = useState('')
  const [fileName, setFileName] = useState('')
  const [extracted, setExtracted] = useState<Record<string, unknown> | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [acceptedKeys, setAcceptedKeys] = useState<Record<string, boolean>>({})
  const [wasTruncated, setWasTruncated] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({})
  // For a question that already has an answer: true replaces it; otherwise new text is added after it
  const [replaceKeys, setReplaceKeys] = useState<Record<string, boolean>>({})
  // Website imports: the address behind each [Page n], so answers cite pages by path
  const [siteUrl, setSiteUrl] = useState('')
  const [fromSite, setFromSite] = useState(false)
  const [pageUrls, setPageUrls] = useState<string[]>([])
  const [siteCapped, setSiteCapped] = useState(false)
  const stopSite = useRef(false)

  // Logo and banner from a PDF's images; runs alongside the text scan. Never fails the import.
  const findImages = async (file: File) => {
    stopImages.current = false
    setLookingForImages(true)
    setImageStatus('Looking for a logo and banner image…')
    try {
      const images = await extractPdfImages(file, (page, total) => setImageStatus(`Looking for a logo and banner image… page ${page} of ${total}`), stopImages)
      const { logos, banners } = suggestBranding(images)
      let logo = logos[0]?.id ?? null
      let banner = banners[0]?.id ?? null
      const candidates = [...new Map([...logos, ...banners].map(i => [i.id, i])).values()]
      if (candidates.length && !stopImages.current) {
        setImageStatus('Choosing the logo and banner…')
        const ai = await aiPickBranding(candidates)
        if (ai) { logo = ai.logo ?? logo; banner = ai.banner ?? banner; setAiPicked(ai) }
      }
      setPdfImages(images)
      // Preselect the best guesses only where the community has none yet
      setPick({ logo: branding.logo_url ? null : logo, banner: branding.banner_url ? null : banner })
    } catch {
      // Images are a bonus: the text import goes ahead without them
    }
    setLookingForImages(false)
  }

  const saveToLibrary = async (text: string, fileName: string, visibility: DocKind, title = titleFromFile(fileName)) => {
    setLibraryStatus('saving')
    try {
      await addToLibrary({ title, fileName, visibility, content: text })
      setLibraryStatus('saved')
    } catch (e) {
      setLibraryStatus(`Couldn't add it to the library: ${(e as Error).message}`)
    }
  }

  // Dropping a file starts everything: no separate "Scan" click
  const handleFile = async (file: File) => {
    setFileName(file.name)
    setPdfImages([])
    setLibraryStatus('')
    setFromSite(false)
    setPageUrls([])
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    let text = ''
    try {
      setStartedAt(Date.now())
      if (isPdf) {
        setStage('extracting')
        setPdfProgress({ current: 0, total: 0 })
        text = await extractPdfText(file, (page, total) => setPdfProgress({ current: page, total }))
      } else {
        text = await new Promise<string>((resolve, reject) => {
          const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsText(file)
        })
      }
    } catch (e) {
      setErrorMsg(`Could not read ${isPdf ? 'the PDF' : 'the file'}: ${(e as Error).message}`)
      setStage('error')
      return
    }
    setDocText(text)
    const images = isPdf && canSetBranding && !scope ? findImages(file) : null
    // Save to the assistant's library alongside the scan (never blocks or fails the import)
    const library = docKind ? saveToLibrary(text, file.name, docKind) : null
    await handleScan(text, images, library)
  }

  // A website: the server reads the page and the most useful pages it links to
  const handleSite = async () => {
    if (!docKind || !siteUrl.trim()) return
    setFileName(siteUrl.trim())
    setPdfImages([])
    setLibraryStatus('')
    setFromSite(true)
    setPageUrls([])
    setSiteCapped(false)
    setStartedAt(Date.now())
    setPdfProgress({ current: 0, total: 0 })
    setStage('extracting')
    let site: SiteCrawl
    stopSite.current = false
    try {
      site = await crawlSite(siteUrl, (read, found) => setPdfProgress({ current: read, total: found }), stopSite)
    } catch (e) {
      setErrorMsg(`Could not read the website: ${(e as Error).message}`)
      setStage('error')
      return
    }
    setSiteCapped(site.capped)
    setFileName(site.site)
    setPageUrls(site.pages.map(p => p.url))
    setPdfProgress({ current: site.pages.length, total: site.pages.length })
    setDocText(site.text)
    const library = saveToLibrary(site.text, `${site.site} (website)`, docKind, site.title ? `${site.title} (website)` : `${site.site} (website)`)
    await handleScan(site.text, null, library)
  }

  const handleScan = async (text: string = docText, images: Promise<void> | null = null, library: Promise<void> | null = null) => {
    if (!text.trim()) { setErrorMsg('Paste some text or upload a file first.'); setStage('upload'); return }
    setStage('scanning'); setErrorMsg('')

    const catalog = buildFieldCatalog(scope)
    setScanProgress(null)
    setFinishingImages(false)
    setStartedAt(t => t ?? Date.now())
    try {
      const result = await scanDocument({
        docText: text,
        fields: catalog,
        current: currentValues,
        // Step-scoped imports fill fields only; full scans and the Circles step also look for circles
        wantCircles: !scope?.step,
        onProgress: setScanProgress,
      })
      const merged: Record<string, unknown> = { ...result.values, _summary: result.summary }
      if (result.circles.length) merged.circles = result.circles
      setExtracted(merged)
      setAnswerMeta(result.meta)
      setGaps(scope?.circles ? [] : result.gaps)
      setFailedParts(result.failed)
      setWasTruncated(result.truncated)
      // Answers start ticked unless the AI wasn't sure. Where there's already an answer, new
      // text is added after it (never overwritten); a score or yes/no is kept unless you pick the new one
      const accepted: Record<string, boolean> = {}
      Object.entries(result.values).forEach(([k, v]) => {
        const existing = currentValues[k]
        const hasExisting = existing != null && existing !== ''
        const addable = typeof existing === 'string' && catalog.find(f => f.id === k)?.kind === 'text'
          && !existing.includes(String(v).trim())
        accepted[k] = result.meta[k]?.confidence !== 'low' && (!hasExisting || addable)
      })
      setAcceptedKeys(accepted)
      setReplaceKeys({})
      setExpandedKeys({})
      // The review shows the images too, so wait for the image search if it's still going
      if (images) { setFinishingImages(true); await images }
      if (library) await library
      setStartedAt(null)
      setStage('review')
    } catch (e) {
      setErrorMsg((e as Error).message ?? 'Scan failed.')
      setStage('error')
    }
  }

  const pickedImage = (kind: 'logo' | 'banner') => pdfImages.find(i => i.id === pick[kind]) ?? null
  const brandingCount = (pickedImage('logo') ? 1 : 0) + (pickedImage('banner') ? 1 : 0)

  const handleApply = async () => {
    if (!extracted) return
    const toApply: Values = {}
    Object.entries(extracted).forEach(([k, v]) => {
      if (k.startsWith('_') || k === 'circles' || !acceptedKeys[k]) return
      toApply[k] = canAddTo(k) && !replaceKeys[k] ? `${String(currentValues[k]).trimEnd()}\n\n${String(v).trim()}` : v
    })
    // Found circles wait in the answers until an admin confirms them in the Circles step
    if (foundList.length) toApply[FOUND_CIRCLES_KEY] = foundList
    if (brandingCount) {
      setApplying(true); setApplyError('')
      try {
        for (const kind of ['logo', 'banner'] as const) {
          const img = pickedImage(kind)
          if (img) await setBrandingImage(kind, img.blob, branding[`${kind}_url`])
        }
        router.refresh()
      } catch (e) {
        setApplying(false)
        setApplyError(`Nothing was applied: an image upload failed (${(e as Error).message}). Try again, or set the images to None.`)
        return
      }
    }
    onApply(toApply); onClose()
  }

  // A render helper, not a component (a component defined here would remount every render)
  const imagePicker = (kind: 'logo' | 'banner', label: string, list: PdfImage[], current: string | null) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
        {label}{current && <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}> · you already have one; pick only to replace it</span>}
      </div>
      {list.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No good {kind} candidates in this document.</div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'stretch' }}>
          {list.map(img => {
            const on = pick[kind] === img.id
            return (
              <button key={img.id} type="button" onClick={() => setPick(p => ({ ...p, [kind]: on ? null : img.id }))}
                title={`${img.width}×${img.height} · page ${img.pages.join(', ')}`}
                style={{ padding: 4, borderRadius: 8, cursor: 'pointer', background: kind === 'logo' ? 'repeating-conic-gradient(var(--bg-2) 0 25%, var(--surface) 0 50%) 0 0 / 12px 12px' : 'var(--surface)',
                  border: `2px solid ${on ? 'var(--accent)' : 'var(--rule)'}`, boxShadow: on ? '0 0 0 2px var(--accent-soft)' : 'none' }}>
                <img src={img.url} alt="" style={{ display: 'block', height: kind === 'logo' ? 56 : 72, width: kind === 'logo' ? 'auto' : 160, maxWidth: 160, objectFit: kind === 'logo' ? 'contain' : 'cover', borderRadius: 4 }} />
                {aiPicked[kind] === img.id && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', marginTop: 3 }}>✨ AI pick</div>}
              </button>
            )
          })}
          <button type="button" onClick={() => setPick(p => ({ ...p, [kind]: null }))}
            style={{ padding: '0 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: 'var(--ink-3)', background: 'var(--surface)', border: `2px solid ${pick[kind] === null ? 'var(--accent)' : 'var(--rule)'}` }}>
            None
          </button>
        </div>
      )}
    </div>
  )

  const foundList = (extracted?.circles ?? []) as FoundCircle[]
  const catalog = buildFieldCatalog(scope)
  // Confidence, pages and conflicts from the scan, shown on each proposed answer
  const answerInfo = (key: string) => {
    const m = answerMeta[key]
    if (!m) return null
    const colour = m.confidence === 'high' ? '#15803d' : m.confidence === 'medium' ? '#b45309' : '#b91c1c'
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 6, fontSize: 11 }}>
        <span style={{ fontWeight: 700, color: colour, border: `1px solid ${colour}55`, borderRadius: 20, padding: '0 7px' }}>{m.confidence} confidence</span>
        {m.pages.length > 0 && <span style={{ color: 'var(--ink-3)' }}>{pageUrls.length ? m.pages.slice(0, 6).map(pageLabel).join(', ') : `p. ${m.pages.slice(0, 6).join(', ')}`}</span>}
        {m.why && <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>{m.why}</span>}
        {m.conflict && <span style={{ flexBasis: '100%', color: '#b45309' }}>⚠ {m.conflict}</span>}
      </div>
    )
  }

  const fieldMeta = (id: string) => catalog.find(f => f.id === id) ?? { label: id, kind: 'text' as const, step: '', phase: '', help: '' }
  // A written answer that already exists: new text can be added after it
  const canAddTo = (id: string) => fieldMeta(id).kind === 'text' && typeof currentValues[id] === 'string' && currentValues[id] !== ''
  const pageLabel = (n: number) => {
    try { const u = new URL(pageUrls[n - 1]); return u.pathname === '/' ? 'home page' : u.pathname } catch { return `p. ${n}` }
  }

  return (
    <div className="modal-bg" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="modal" style={{ position: 'relative', maxWidth: 760, width: '100%', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 32, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-3)' }}>×</button>

        <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--rule)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-3)', marginBottom: 6 }}>AI-ASSISTED IMPORT{scope?.step || scope?.circles ? ' · SCOPED' : ''}</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 28, marginTop: 6 }}>
            {scope?.circles ? 'Find your circles' : scope?.step ? `Fill "${scope.step.title}" ${scope.section ?? 'step'}` : 'Scan an existing document'}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 8, fontStyle: 'italic' }}>
            {scope?.circles ? "Upload a charter, org chart or handbook and we'll look for the standing groups it describes. You confirm them before anything is saved."
              : scope?.step ? "Upload a document or give your website and we'll pre-fill just this section." : "Have a website, vision deck, charter, or feasibility study? Give us the link or drop it in and we'll pre-fill what we can. Answers you already have are kept: new ones are added to them."}
          </div>
        </div>

        {stage === 'upload' && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <DocumentKindPicker value={docKind} onChange={setDocKind} />
            </div>
            <FileDropzone onFile={handleFile} fileName={fileName} disabled={!docKind} />
            {!scope?.circles && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--ink-2)' }}>Or scan your website</div>
                <form style={{ display: 'flex', gap: 8 }} onSubmit={e => { e.preventDefault(); handleSite() }}>
                  <input className="input" type="url" inputMode="url" placeholder="https://your-community.org" value={siteUrl}
                    onChange={e => setSiteUrl(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                  <button className="btn" type="submit" disabled={!docKind || !siteUrl.trim()}>Scan site →</button>
                </form>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 }}>
                  We read every page of the site (up to {SITE_MAX_PAGES}), and add the text to the library.
                </div>
              </div>
            )}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--ink-2)' }}>Or paste document text</div>
              <textarea className="textarea" rows={8} placeholder="Paste your project charter, vision document, business plan, meeting notes…" value={docText} onChange={e => setDocText(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
              {docText && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.08em' }}>
                  {docText.length.toLocaleString()} CHARS
                  {docText.length > 150000 ? ` · read in ${Math.ceil(docText.length / 150000)} parts` : ' · read in one pass'}
                </div>
              )}
            </div>
            <div className="card" style={{ marginTop: 18, fontSize: 12.5, lineHeight: 1.5, background: 'var(--bg-2)', padding: 16, borderRadius: 'var(--radius)' }}>
              <strong style={{ fontFamily: 'var(--display)', fontSize: 14 }}>How it works.</strong> MiniMax M3 reads the whole document and collects quotes for each Blueprint question, then writes each answer from all the quotes, with how sure it is and the pages it used. You review and accept what&rsquo;s good — nothing is applied without your sign-off, and answers you already have are added to, not replaced, unless you choose to. Works with websites and PDF, .txt and .md files; PDFs give page references. Every document is saved in the library (Setup › Documents).
            </div>
            <div className="nav-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" disabled={!docText.trim() || !docKind}
                onClick={() => { setStartedAt(Date.now()); setLibraryStatus(''); setFromSite(false); setPageUrls([]); handleScan(docText, null, docKind ? saveToLibrary(docText, 'Pasted text.txt', docKind) : null) }}>
                Scan with AI →
              </button>
            </div>
          </div>
        )}

        {(stage === 'extracting' || stage === 'scanning') && (() => {
          // One checklist for the whole import, so people can see what's happening and that it's moving
          const p = scanProgress
          const PHASES = ['Spark', 'Prove', 'Build', 'Live']
          const phaseLine = (finished: string[]) => PHASES.map(ph => (finished.some(f => f.startsWith(ph)) ? `${ph} ✓` : ph)).join(' · ')
          type Status = 'done' | 'active' | 'pending'
          const rows: { status: Status; title: string; detail: string }[] = [
            {
              status: stage === 'extracting' ? 'active' : 'done',
              title: fromSite ? 'Reading the website' : fileName.toLowerCase().endsWith('.pdf') ? 'Reading the PDF' : 'Reading the document',
              detail: stage === 'extracting'
                ? (fromSite ? (pdfProgress.total ? `Read ${pdfProgress.current} of ${pdfProgress.total} pages found so far` : 'Opening the site and finding its pages…') : pdfProgress.total ? `Page ${pdfProgress.current} of ${pdfProgress.total}` : 'Opening the file…')
                : `${docText.length.toLocaleString()} characters${pdfProgress.total ? ` from ${pdfProgress.total} pages` : ''}`,
            },
            {
              status: stage === 'extracting' ? 'pending' : !p || p.step === 'quotes' ? (p && p.done === p.total ? 'done' : 'active') : 'done',
              title: 'Finding what the document says about each question',
              detail: !p ? (stage === 'scanning' ? 'Starting…' : '') : `${phaseLine(p.step === 'quotes' ? p.finished : PHASES)}${p.step === 'quotes' && p.found ? ` · evidence for ${p.found} questions so far` : ''}`,
            },
            {
              status: p?.step === 'answers' ? (p.done === p.total ? 'done' : 'active') : 'pending',
              title: 'Writing your answers',
              detail: p?.step === 'answers' ? `${phaseLine(p.finished)}${p.found ? ` · ${p.found} answers so far` : ''}` : 'One answer per question, with pages and how sure we are',
            },
          ]
          if (libraryStatus) rows.push({
            status: libraryStatus === 'saving' ? 'active' : 'done',
            title: `Adding it to the library (${docKind === 'leads' ? 'sensitive' : 'shareable'})`,
            detail: libraryStatus === 'saving' ? 'So the portal assistant can answer questions from it'
              : libraryStatus === 'saved' ? 'Added: Ask the assistant about it any time' : libraryStatus,
          })
          if (lookingForImages || finishingImages) rows.push({
            status: lookingForImages ? 'active' : 'done',
            title: 'Looking for your logo and banner',
            detail: lookingForImages ? imageStatus : 'Done',
          })
          const secs = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0
          const icon = (st: Status) => st === 'done' ? '✓' : st === 'active' ? '◐' : '○'
          return (
            <div style={{ padding: '8px 0 4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 20 }}>Importing {fileName || 'your text'}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</div>
              </div>
              {rows.map(r => (
                <div key={r.title} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: '1px solid var(--rule-soft)', opacity: r.status === 'pending' ? 0.55 : 1 }}>
                  <span style={{ width: 20, textAlign: 'center', fontSize: 15, color: r.status === 'done' ? 'var(--accent)' : 'var(--ink-2)', animation: r.status === 'active' ? 'pulse 1.2s infinite' : undefined }}>{icon(r.status)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: r.status === 'active' ? 700 : 500 }}>{r.title}</div>
                    {r.detail && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{r.detail}</div>}
                  </div>
                  {r.title === 'Reading the website' && stage === 'extracting' && pdfProgress.current > 1 && (
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px', alignSelf: 'center' }} onClick={() => { stopSite.current = true }}>Stop here</button>
                  )}
                  {r.title === 'Looking for your logo and banner' && lookingForImages && (
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px', alignSelf: 'center' }} onClick={() => { stopImages.current = true }}>Skip</button>
                  )}
                </div>
              ))}
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 12, lineHeight: 1.5 }}>
                {secs < 150 ? 'This usually takes 1 to 3 minutes for a long document. You can keep this window open while it works.'
                  : 'Still working: big, detailed documents take longer. Nothing is saved until you review the answers.'}
              </div>
            </div>
          )
        })()}

        {stage === 'review' && extracted && (
          <div>
            <div className="card" style={{ background: 'var(--bg-2)', marginBottom: 20, padding: 16, borderRadius: 'var(--radius)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--ink-3)', marginBottom: 6 }}>DOCUMENT SUMMARY</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 16, fontStyle: 'italic', color: 'var(--ink-2)' }}>{(extracted._summary as string) || 'No summary available.'}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 12, letterSpacing: '0.1em' }}>
                {Object.keys(extracted).filter(k => !k.startsWith('_') && k !== 'circles').length} FIELDS POPULATED
                {scope?.circles ? '' : ` · ${foundList.length} CIRCLE${foundList.length === 1 ? '' : 'S'} FOUND`} · REVIEW BELOW
              </div>
              {fromSite && siteCapped && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#f59e0b', background: '#f59e0b15', border: '1px solid #f59e0b40', borderRadius: 'var(--radius)', padding: '6px 10px' }}>
                  ⚠ Big site: we read {pageUrls.length} pages (the most useful first) and stopped there. Import a document for anything it missed.
                </div>
              )}
              {wasTruncated && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#f59e0b', background: '#f59e0b15', border: '1px solid #f59e0b40', borderRadius: 'var(--radius)', padding: '6px 10px' }}>
                  ⚠ Large document — read the first 1,200,000 characters (about 400 pages). If key content comes later, import the rest separately.
                </div>
              )}
              {failedParts > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#f59e0b', background: '#f59e0b15', border: '1px solid #f59e0b40', borderRadius: 'var(--radius)', padding: '6px 10px' }}>
                  ⚠ {failedParts} part{failedParts === 1 ? '' : 's'} of the scan didn&rsquo;t come back, so some answers may be missing. You can run the import again later; it only proposes, nothing is overwritten.
                </div>
              )}
              {gaps.length > 0 && (
                <details style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-2)' }}>
                  <summary style={{ cursor: 'pointer' }}>{gaps.length} question{gaps.length === 1 ? '' : 's'} the document doesn&rsquo;t cover (still to write)</summary>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
                    {gaps.map(id => { const m = fieldMeta(id); return <li key={id}><span style={{ color: 'var(--ink-3)' }}>{m.step}:</span> {m.label}</li> })}
                  </ul>
                </details>
              )}
            </div>

            {canSetBranding && !scope && pdfImages.length > 0 && (
              <div style={{ marginBottom: 20, padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 16, marginBottom: 4 }}>Logo &amp; banner from your document</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12 }}>
                  Found {pdfImages.length} image{pdfImages.length === 1 ? '' : 's'}. {aiPicked.logo || aiPicked.banner ? 'The AI looked at them and its picks are marked ✨.' : 'Our best guesses are marked.'} Click to change, or choose None. They&rsquo;re saved with your answers and can be changed later in Look &amp; feel.
                </div>
                {imagePicker('logo', 'Logo', suggestions.logos, branding.logo_url)}
                {imagePicker('banner', 'Banner image', suggestions.banners, branding.banner_url)}
              </div>
            )}

            {(scope?.circles || foundList.length > 0) && (
              <div style={{ marginBottom: 20, padding: '12px 14px', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 16, marginBottom: 6 }}>Circles found: {foundList.length}</div>
                {foundList.length > 0 ? (
                  <>
                    <ul style={{ margin: '0 0 6px', paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>
                      {foundList.map(c => <li key={c.name}><strong>{c.name}</strong>{c.purpose ? ` — ${c.purpose}` : ''}</li>)}
                    </ul>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Nothing is saved yet. You&rsquo;ll confirm, rename or remove them in the Circles step.</div>
                  </>
                ) : (
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>This document doesn&rsquo;t describe any standing groups. You can add circles by hand in the Circles step.</div>
                )}
              </div>
            )}

            {!scope?.circles && <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 18 }}>Proposed answers</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{Object.values(acceptedKeys).filter(Boolean).length} will apply</div>
            </div>

            <div style={{ maxHeight: 420, overflowY: 'auto', marginBottom: 20, paddingRight: 4 }}>
              {Object.entries(extracted).filter(([k]) => !k.startsWith('_') && k !== 'project_name' && k !== 'circles').map(([key, val]) => {
                const meta = fieldMeta(key)
                const accepted = acceptedKeys[key]
                const existingVal = currentValues[key]
                const conflict = existingVal != null && existingVal !== ''
                const expanded = expandedKeys[key] ?? false

                const renderVal = (v: unknown) =>
                  meta.kind === 'slider' ? `${v}/10`
                  : meta.kind === 'check' ? (v ? '☑ Yes' : '☐ No')
                  : String(v)

                if (conflict) {
                  // Conflict card — expandable comparison
                  return (
                    <div key={key} style={{ marginBottom: 8, border: '1px solid #f59e0b60', borderLeft: '3px solid #f59e0b', borderRadius: 4, overflow: 'hidden', background: 'var(--bg-2)' }}>
                      {/* Header row — click to expand */}
                      <button onClick={() => setExpandedKeys(e => ({ ...e, [key]: !e[key] }))}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#f59e0b', letterSpacing: '0.1em', marginBottom: 2 }}>
                            {meta.step.toUpperCase()} · HAS EXISTING ANSWER
                          </div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{meta.label}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                            color: accepted ? 'var(--accent)' : 'var(--ink-4)',
                            background: accepted ? 'var(--accent-soft)' : 'var(--bg-2)',
                            border: `1px solid ${accepted ? 'var(--accent)' : 'var(--rule)'}`,
                            padding: '2px 8px', borderRadius: 20 }}>
                            {!accepted ? 'Keep current' : canAddTo(key) && !replaceKeys[key] ? 'Add to current' : 'Use new'}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--ink-4)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>▾</span>
                        </div>
                      </button>

                      {/* Expanded comparison */}
                      {expanded && (
                        <div style={{ borderTop: '1px solid var(--rule)', padding: '12px 12px 14px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>Current answer</div>
                              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>{renderVal(existingVal)}</div>
                            </div>
                            <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>AI proposed</div>
                              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>{renderVal(val)}</div>
                              {answerInfo(key)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {(() => {
                              const adding = accepted && canAddTo(key) && !replaceKeys[key]
                              const replacing = accepted && !adding
                              const choice = (on: boolean, strong: boolean) => ({ flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 600, borderRadius: 'var(--radius)', cursor: 'pointer',
                                border: `1.5px solid ${on ? (strong ? 'var(--accent)' : 'var(--ink)') : 'var(--rule)'}`, background: on ? (strong ? 'var(--accent)' : 'var(--ink)') : 'var(--surface)', color: on ? (strong ? '#fff' : 'var(--bg)') : 'var(--ink-3)' })
                              return <>
                                <button onClick={() => setAcceptedKeys(a => ({ ...a, [key]: false }))} style={choice(!accepted, false)}>Keep current</button>
                                {canAddTo(key) && (
                                  <button onClick={() => { setAcceptedKeys(a => ({ ...a, [key]: true })); setReplaceKeys(r => ({ ...r, [key]: false })) }} style={choice(adding, true)}>Add to it</button>
                                )}
                                <button onClick={() => { setAcceptedKeys(a => ({ ...a, [key]: true })); setReplaceKeys(r => ({ ...r, [key]: true })) }} style={choice(replacing, true)}>Replace it</button>
                              </>
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

                // No conflict — simple accept/reject card
                return (
                  <div key={key} style={{ padding: 12, marginBottom: 8, background: accepted ? 'var(--accent-soft)' : 'var(--bg-2)', border: `1px solid ${accepted ? 'var(--accent)' : 'var(--rule-soft)'}`, borderRadius: 4, cursor: 'pointer', opacity: accepted ? 1 : 0.6 }}
                    onClick={() => setAcceptedKeys(a => ({ ...a, [key]: !a[key] }))}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 16, height: 16, marginTop: 2, background: accepted ? 'var(--accent)' : 'var(--surface)', border: `1.5px solid ${accepted ? 'var(--accent)' : 'var(--rule)'}`, borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {accepted && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.1em', marginBottom: 3 }}>{meta.step.toUpperCase()}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{meta.label}</div>
                        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>{renderVal(val)}</div>
                        {answerInfo(key)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            </>}

            {applyError && (
              <div style={{ fontSize: 13, color: '#b91c1c', background: '#b91c1c12', border: '1px solid #b91c1c40', borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: 12 }}>{applyError}</div>
            )}

            <div className="nav-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setStage('upload')}>← Back</button>
              <div style={{ display: 'flex', gap: 8 }}>
                {!scope?.circles && <button className="btn" onClick={() => {
                  const allNew = !Object.entries(acceptedKeys).every(([k, v]) => v || (currentValues[k] != null && currentValues[k] !== ''))
                  const all: Record<string, boolean> = {}
                  Object.keys(extracted).forEach(k => { if (!k.startsWith('_') && k !== 'circles') all[k] = allNew })
                  setAcceptedKeys(all)
                }}>Toggle all</button>}
                <button className="btn btn-primary" onClick={handleApply} disabled={applying}>
                  {scope?.circles ? (foundList.length ? 'Review in Circles step →' : 'Close')
                    : applying ? 'Saving…'
                    : `Apply ${Object.values(acceptedKeys).filter(Boolean).length} answers${brandingCount ? ` + ${brandingCount} image${brandingCount === 1 ? '' : 's'}` : ''} →`}
                </button>
              </div>
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div>
            <div className="card" style={{ padding: 24, background: 'var(--warn-soft)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 22, marginBottom: 8 }}>
                {errorMsg.includes('504') || errorMsg.includes('rate limit') ? "We're working on our scanning process" : 'Something went wrong'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                {errorMsg.includes('504') || errorMsg.includes('rate limit')
                  ? "We're working on our scanning process, thanks for the patience. Try again later please."
                  : errorMsg}
              </div>
            </div>
            <div className="nav-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={() => setStage('upload')}>Try again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GuideButton({ guide }: { guide?: GuideContent }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  if (!guide) return null
  return (
    <span className="guide-wrap" ref={ref}>
      <button type="button" className={`guide-btn${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="How to answer this">
        <span className="guide-icon">?</span>
        <span className="guide-label">Guide</span>
      </button>
      {open && (
        <div className="guide-pop" role="dialog">
          <div className="guide-pop-head">
            <div className="guide-pop-title">{guide.title}</div>
            {guide.source && <div className="guide-pop-source">{guide.source}</div>}
          </div>
          <div className="guide-pop-body">
            {(guide.body ?? []).map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <button className="guide-pop-close" onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </span>
  )
}

function FieldStatus({ id, value, onChange, guide }: {
  id: string; value: unknown; onChange: (id: string, val: string) => void; guide?: GuideContent
}) {
  const [helpOpen, setHelpOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!helpOpen) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setHelpOpen(false) }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setHelpOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [helpOpen])

  const v = (value as string) || ''
  const helpContent = guide ?? {
    title: 'Need help with this question?',
    source: '',
    body: ['Take a moment. There\'s no perfect answer — write what feels true right now and revise later.', 'Try writing one short sentence first. Then expand. Or skip it and come back after a related step.'],
  }

  return (
    <div className="field-status" ref={ref}>
      <button type="button" className={`fs-btn fs-pending${v === 'pending' ? ' on' : ''}`}
        onClick={() => onChange(id, v === 'pending' ? '' : 'pending')} title="No answer yet">
        <span className="fs-dot"></span>No answer yet
      </button>
      <button type="button"
        className={`fs-btn fs-help${v === 'help' ? ' on' : ''}${helpOpen ? ' open' : ''}`}
        onClick={() => { onChange(id, v === 'help' ? '' : 'help'); setHelpOpen(o => !o) }} title="Almost there">
        <span className="fs-dot"></span>Almost there
      </button>
      <button type="button" className={`fs-btn fs-ready${v === 'ready' ? ' on' : ''}`}
        onClick={() => onChange(id, v === 'ready' ? '' : 'ready')} title="Ready to go">
        <span className="fs-dot"></span>Ready to go
      </button>
      {helpOpen && (
        <div className="fs-help-pop" role="dialog">
          <div className="fs-help-title">{helpContent.title}</div>
          <div className="fs-help-body">{(helpContent.body ?? []).map((p, i) => <p key={i}>{p}</p>)}</div>
          <button className="fs-help-close" onClick={() => setHelpOpen(false)}>Close</button>
        </div>
      )}
    </div>
  )
}

function TextField({ field, value, onChange, statusValue }: {
  field: NonNullable<StepDef['fields']>[0]; value: unknown; onChange: (id: string, val: unknown) => void; statusValue: unknown
}) {
  const statusId = field.id + '_status'
  return (
    <div className="field">
      <div className="field-label-row">
        <label className="field-label">{field.label}</label>
        {field.guide && <GuideButton guide={field.guide} />}
      </div>
      {field.help && <div className="field-help">{field.help}</div>}
      {field.kind === 'textarea' ? (
        <textarea className="textarea" rows={field.rows ?? 4}
          value={(value as string) || ''}
          onChange={e => onChange(field.id, e.target.value)} />
      ) : (
        <input type="text" className="input"
          value={(value as string) || ''}
          onChange={e => onChange(field.id, e.target.value)} />
      )}
      <FieldStatus id={statusId} value={statusValue}
        onChange={(id, val) => onChange(id, val)} guide={field.guide} />
    </div>
  )
}

function ScoreSlider({ id, label, frame, value, onChange, guide }: {
  id: string; label: string; frame: string; value: unknown; onChange: (id: string, val: number) => void; guide?: GuideContent
}) {
  const v = (value as number) ?? 5
  return (
    <div className="slider-row">
      <div className="slider-meta">
        <div className="slider-q">
          <span>{label}</span>
          {guide && <GuideButton guide={guide} />}
        </div>
        <div className="slider-track-wrap">
          <input type="range" className="slider" min="0" max="10" step="1" value={v}
            onChange={e => onChange(id, parseInt(e.target.value, 10))} />
          <div className="slider-scale">
            <span>Not yet</span>
            <span>{frame}</span>
            <span>Solid</span>
          </div>
        </div>
      </div>
      <div className="slider-value">{v}</div>
    </div>
  )
}

function Checklist({ items, values, onChange, onField }: {
  items: NonNullable<StepDef['checklist']>; values: Values;
  onChange: (id: string, val: unknown) => void; onField: (id: string, val: unknown) => void
}) {
  return (
    <ul className="checklist">
      {items.map(it => {
        const checked = !!values[it.id]
        const noteId = it.id + '_note'
        const noteVal = (values[noteId] as string) || ''
        return (
          <li key={it.id} className={`check-item${checked ? ' checked' : ''}`}>
            <div className="check-item-head">
              <div className="check-row" onClick={() => onChange(it.id, !checked)}>
                <div className="check-box"></div>
                <div className="check-text">{it.text}</div>
              </div>
              {it.guide && <GuideButton guide={it.guide} />}
            </div>
            <textarea className="check-note" rows={2} value={noteVal}
              placeholder="Notes, evidence, or how this is handled…"
              onChange={e => onField(noteId, e.target.value)}
              onClick={e => e.stopPropagation()} />
          </li>
        )
      })}
    </ul>
  )
}

function FrameworkTags({ items }: { items: string[] }) {
  return (
    <div className="framework-tags">
      {items.map((line, i) => {
        const fw = line.split(':')[0].trim().toLowerCase()
        return <span key={i} className={`fw-tag ${fw}`}>{line}</span>
      })}
    </div>
  )
}

function Crumb({ items }: { items: string[] }) {
  return (
    <div className="crumb">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="crumb-sep">/</span>}
          <span>{it}</span>
        </React.Fragment>
      ))}
    </div>
  )
}

function PillarBars({ scores, onJump }: { scores: Record<string, number>; onJump: (id: string) => void }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  return (
    <div>
      {FW_DATA.pillars.map(p => {
        const v = scores[p.id] ?? 0
        const isPerfect = v >= 9.5
        const isHovered = hoveredId === p.id
        const steps = PILLAR_STEPS[p.id] ?? []
        return (
          <div key={p.id} className="pillar-bar">
            <div className="pillar-bar-head">
              <span className="pillar-bar-name">{p.name}</span>
              <span className="pillar-bar-val"
                style={{ cursor: !isPerfect ? 'pointer' : 'default', color: !isPerfect ? p.color : undefined }}
                onMouseEnter={() => !isPerfect && setHoveredId(p.id)}
                onMouseLeave={() => setHoveredId(null)}>
                {v.toFixed(1)}/10
              </span>
            </div>
            <div className="pillar-bar-track"
              onMouseEnter={() => !isPerfect && setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}>
              <div className="pillar-bar-fill" style={{ width: `${v * 10}%`, background: p.color }}></div>
            </div>
            {isHovered && steps.length > 0 && (
              <div className="pillar-tip"
                onMouseEnter={() => setHoveredId(p.id)}
                onMouseLeave={() => setHoveredId(null)}>
                <div className="pillar-tip-head">Improve {p.name}</div>
                {steps.map(s => (
                  <button key={s.id} className="pillar-tip-step" onClick={() => { onJump(s.id); setHoveredId(null) }}>
                    <span className="pillar-tip-title">{s.title}</span>
                    <span className="pillar-tip-note">{s.note}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SpiralMini({ currentSpiral, completedSpirals }: { currentSpiral: number; completedSpirals: number[] }) {
  return (
    <div className="spiral-track">
      {[1, 2, 3, 4, 5].map(n => {
        const cls = n === currentSpiral ? 'active' : completedSpirals.includes(n) ? 'passed' : ''
        return <div key={n} className={`spiral-cell ${cls}`}>S{n}</div>
      })}
    </div>
  )
}

function PillarRadar({ scores, size = 280 }: { scores: Record<string, number>; size?: number }) {
  const pillars = FW_DATA.pillars
  const cx = size / 2, cy = size / 2
  const rMax = size / 2 - 44
  const n = pillars.length
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const point = (i: number, val: number): [number, number] => {
    const r = (val / 10) * rMax
    return [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r]
  }
  const ringPoints = (val: number) => pillars.map((_, i) => point(i, val).join(',')).join(' ')
  const dataPoints = pillars.map((p, i) => point(i, scores[p.id] ?? 0).join(',')).join(' ')

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%">
      {[2.5, 5, 7.5, 10].map(v => (
        <polygon key={v} points={ringPoints(v)} fill="none" stroke="var(--rule)" strokeWidth="1"
          strokeDasharray={v === 10 ? '' : '2 3'} />
      ))}
      {pillars.map((p, i) => {
        const [x, y] = point(i, 10)
        return <line key={p.id} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--rule)" strokeWidth="1" />
      })}
      <polygon points={dataPoints} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.5" />
      {pillars.map((p, i) => {
        const [x, y] = point(i, scores[p.id] ?? 0)
        return <circle key={p.id} cx={x} cy={y} r="3" fill={p.color} />
      })}
      {pillars.map((p, i) => {
        const a = angle(i)
        const lx = cx + Math.cos(a) * (rMax + 22)
        const ly = cy + Math.sin(a) * (rMax + 18)
        const cosA = Math.cos(a)
        const anchor = Math.abs(cosA) < 0.2 ? 'middle' : (cosA > 0 ? 'end' : 'start')
        return (
          <text key={p.id} x={lx} y={ly} fontSize="10" fontFamily="var(--mono)"
            fill="var(--ink-3)" textAnchor={anchor} dominantBaseline="middle" fontWeight="500">
            {p.name.toUpperCase()}
          </text>
        )
      })}
    </svg>
  )
}

function SpiralTimelineLarge({ currentSpiral, completedSpirals, phases }: {
  currentSpiral: number; completedSpirals: number[]; phases: PhaseDef[]
}) {
  const names = ['Proof of Concept', 'Feasibility Validation', 'Capital Formation', 'Construction & Activation', 'Continuous Regeneration']
  return (
    <div style={{ paddingTop: 14 }}>
      {[1, 2, 3, 4, 5].map(n => {
        const phase = phases.find(p => p.spiral === n)
        const isCurrent = n === currentSpiral
        const isPassed = completedSpirals.includes(n)
        return (
          <div key={n} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 14, marginBottom: 18 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: isCurrent ? 'var(--rnf)' : (isPassed ? 'var(--bg-3)' : 'var(--surface)'),
              border: '1px solid ' + (isCurrent ? 'var(--rnf)' : 'var(--rule)'),
              color: isCurrent ? 'var(--bg)' : 'var(--ink-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
            }}>S{n}</div>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 16, lineHeight: 1.2 }}>
                {phase?.spiralName ?? names[n - 1]}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
                {isCurrent ? 'IN PROGRESS' : isPassed ? 'PASSED' : 'UPCOMING'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Step / Gate views ─────────────────────────────────────────────────────────

function GateView({ step, phase, values, onPrev, onNext }: {
  step: StepDef; phase: PhaseDef; values: Values; onPrev: () => void; onNext: () => void
}) {
  const criteria = step.criteria ?? []
  const evalCriterion = (metric: string) => {
    const v = values[metric]
    if (typeof v === 'boolean') return v ? 'met' : 'unmet'
    if (typeof v === 'number') return v >= 6 ? 'met' : (v >= 4 ? 'partial' : 'unmet')
    return 'unmet'
  }
  const states = criteria.map(c => evalCriterion(c.metric))
  const metCount = states.filter(s => s === 'met').length
  const ratio = metCount / criteria.length

  let status: string, label: string
  if (ratio >= 0.8) { status = 'ready'; label = 'Ready to proceed' }
  else if (ratio >= 0.5) { status = 'warning'; label = 'Soft gate — proceed with care' }
  else { status = 'not-ready'; label = 'Foundation still forming' }

  return (
    <div>
      <Crumb items={[`Phase ${phase.num} — ${phase.name}`, `Gate ${step.gateNum === 34 ? '3 & 4' : step.gateNum}`]} />
      <div className="gate-hero">
        <div className="gate-num">RNF · Gate Checkpoint</div>
        <h1 className="gate-title">{step.title}</h1>
        <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontStyle: 'italic', color: 'var(--ink-2)', marginTop: 8 }}>
          {step.subtitle}
        </div>
        <div className={`gate-status ${status}`}>● {label}</div>
        <div style={{ marginTop: 18, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--ink-3)' }}>
          {metCount} of {criteria.length} criteria met
        </div>
      </div>

      <div className="card-quote">
        Gates prevent the most common failure mode: rushing into the next phase before the foundation is solid. Soft-pass means you may continue, but name what is unfinished.
        <span className="card-quote-attr">— RNF Gate System</span>
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">Criteria</div>
          <div className="section-meta">{metCount}/{criteria.length}</div>
        </div>
        <ul className="criteria-list">
          {criteria.map((c, i) => {
            const s = states[i]
            return (
              <li key={c.id} className="criterion">
                <div className={`criterion-icon ${s === 'met' ? 'met' : 'unmet'}`}>
                  {s === 'met' ? '✓' : (s === 'partial' ? '~' : '·')}
                </div>
                <div className="criterion-text">{c.text}</div>
                <div className="criterion-meta">{s.toUpperCase()}</div>
              </li>
            )
          })}
        </ul>
      </div>

      {status !== 'ready' && (
        <div className="card card-warm">
          <div style={{ fontFamily: 'var(--display)', fontSize: 18, marginBottom: 8 }}>⚠ Soft gate</div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            You can continue, but the unfinished items will compound. Consider returning to earlier steps to strengthen them before moving on.
          </div>
        </div>
      )}

      <div className="nav-row">
        <button className="btn btn-ghost" onClick={onPrev}>← Previous</button>
        <button className={`btn ${status === 'ready' ? 'btn-primary' : 'btn-warm'}`} onClick={onNext}>
          {status === 'ready' ? 'Pass gate & continue →' : 'Continue anyway →'}
        </button>
      </div>
    </div>
  )
}

function StepView({ step, phase, values, onField, onSlider, onCheck, onNext, onPrev, onImport, extra }: {
  step: StepDef; phase: PhaseDef; values: Values;
  /** Step-specific content shown after the fields (e.g. Step 1.4's community values) */
  extra?: React.ReactNode;
  onField: (id: string, val: unknown) => void;
  onSlider: (id: string, val: number) => void;
  onCheck: (id: string, val: unknown) => void;
  onNext: () => void; onPrev: () => void;
  onImport: (step: StepDef, section: string) => void;
}) {
  if (step.kind === 'gate') {
    return <GateView step={step} phase={phase} values={values} onPrev={onPrev} onNext={onNext} />
  }

  // A render helper, not a component — a component defined here would remount every render
  const importButton = (section: string) => (
    <button className="btn-section-import" onClick={() => onImport(step, section)}
      title="Use AI to fill this section from a document">
      <span className="btn-section-import-icon">✨</span>
      Import doc
    </button>
  )

  return (
    <div>
      <Crumb items={[`Phase ${phase.num} — ${phase.name}`, `Step ${step.num}`]} />
      <h1 className="step-title">{step.title}</h1>
      {step.lede && <p className="step-lede">{step.lede}</p>}
      <FrameworkTags items={step.tagLines} />

      {step.fields && step.fields.length > 0 && (
        <div className="section">
          <div className="section-head">
            <div className="section-title">Reflect &amp; record</div>
            <div className="section-meta-row">
              {importButton('fields')}
              <span className="section-meta">Saved automatically</span>
            </div>
          </div>
          {step.fields.map(f => (
            <TextField key={f.id} field={f} value={values[f.id]}
              onChange={onField} statusValue={values[f.id + '_status']} />
          ))}
        </div>
      )}

      {extra}

      {step.checklist && step.checklist.length > 0 && (
        <div className="section">
          <div className="section-head">
            <div className="section-title">Checklist</div>
            <div className="section-meta-row">
              {importButton('checklist')}
              <span className="section-meta">{step.checklist.filter(c => values[c.id]).length} / {step.checklist.length}</span>
            </div>
          </div>
          <Checklist items={step.checklist} values={values} onChange={onCheck} onField={onField} />
        </div>
      )}

      {step.sliders && step.sliders.length > 0 && (
        <div className="section">
          <div className="section-head">
            <div className="section-title">Self-assessment</div>
            <div className="section-meta-row">
              {importButton('sliders')}
              <span className="section-meta">Drag to score 0–10</span>
            </div>
          </div>
          {step.sliders.map(s => (
            <ScoreSlider key={s.id} id={s.id} label={s.label} frame={s.frame}
              guide={s.guide} value={values[s.id]}
              onChange={onSlider} />
          ))}
        </div>
      )}

      <div className="nav-row">
        <button className="btn btn-ghost" onClick={onPrev}>← Previous</button>
        <button className="btn btn-primary" onClick={onNext}>Save &amp; continue →</button>
      </div>
    </div>
  )
}

function WelcomeView({ onStart, hasProgress, onJumpToDashboard, onImport, readOnly }: {
  onStart: () => void; hasProgress: boolean; onJumpToDashboard: () => void; onImport: () => void; readOnly: boolean
}) {
  const fws = FW_DATA.frameworks
  return (
    <div>
      <Crumb items={['Wizard', 'Welcome']} />
      <div className="welcome-hero">
        <div className="eyebrow">Regenerative Neighborhood Framework · v2.0</div>
        <h1 className="welcome-title">From spark to living community.</h1>
        <p className="welcome-lede">
          A guided wizard that walks you through four phases — Spark, Prove, Build, Live — using four interlocking frameworks. Reflect, score, gate-check, and walk away with a project document you can share.
        </p>
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">The four frameworks</div>
          <div className="section-meta">All four are always at play</div>
        </div>
        <div className="framework-grid">
          {Object.entries(fws).map(([k, fw]) => (
            <div key={k} className="fw-card">
              <div className="fw-card-bar" style={{ background: fw.color }}></div>
              <div style={{ paddingLeft: 14 }}>
                <div className="fw-card-name">{fw.full}</div>
                <div className="fw-card-tag">{fw.name} · {fw.tag}</div>
                <div className="fw-card-text">{fw.blurb}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-quote">
        Coherence between Intention, Structure, and Practice — and the balance between Individual and Community — are under constant challenge. Conflicts can generally be traced to neglecting one of the layers.
        <span className="card-quote-attr">— RCOS / CLIPS principle</span>
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">Two ways to move faster</div>
          <div className="section-meta">Helpers built into the wizard</div>
        </div>
        <div className="welcome-helpers">
          <div className="helper-card">
            <div className="helper-icon-wrap">
              <span className="guide-icon" style={{ width: 22, height: 22, fontSize: 13, background: 'var(--accent)', color: '#fff' }}>?</span>
            </div>
            <div className="helper-body">
              <div className="helper-title">Guide buttons explain every question</div>
              <div className="helper-text">
                Whenever you see a small <span className="inline-pill">? Guide</span> button next to a question, click it. A short, plain-language explainer pops up — what the question is really asking, why it matters, and examples to think with.
              </div>
            </div>
          </div>
          {!readOnly && (
            <div className="helper-card helper-card-action">
              <div className="helper-icon-wrap">
                <span style={{ fontSize: 22 }}>✨</span>
              </div>
              <div className="helper-body">
                <div className="helper-title">Already have documents? Let AI fill it in.</div>
                <div className="helper-text">
                  Upload a charter, vision deck, business plan, or meeting notes. The wizard reads your document and proposes answers across every section — text fields, scores, and checklist notes. You review and confirm each one before it&rsquo;s saved.
                </div>
                <button className="btn btn-primary helper-btn" onClick={onImport}>
                  ✨ Upload a document to start
                </button>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6, fontFamily: 'var(--mono)', letterSpacing: '0.08em' }}>v3.07</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">What you&rsquo;ll do</div>
          <div className="section-meta">~ 4 sessions · save &amp; resume</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            ['1. Reflect', 'Write your why, your team, your vision, your agreements. Worksheets at every step.'],
            ['2. Self-score', 'Rate your readiness across pillars and layers. Watch your radar fill in real time.'],
            ['3. Gate-check', 'At each gate, see if you\'re ready to proceed. Soft gates warn but don\'t block.'],
            ['4. Export', 'Print or download a full project document for your founding team.'],
          ].map(([title, text]) => (
            <div key={title} className="card">
              <div style={{ fontFamily: 'var(--display)', fontSize: 20, marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="nav-row">
        <div className="row gap-8">
          {hasProgress && <button className="btn btn-ghost" onClick={onJumpToDashboard}>View dashboard</button>}
          <button className="btn" onClick={onImport}>✨ Import from document</button>
        </div>
        <button className="btn btn-primary" onClick={onStart}>
          {hasProgress ? 'Resume →' : 'Begin Phase 1 →'}
        </button>
      </div>
    </div>
  )
}

function DashboardView({ values, onJump, onPrint, setupTodo }: {
  values: Values; onJump: (id: string) => void; onPrint: () => void
  /** Setup steps still open: shown as a checklist until they're done */
  setupTodo: { id: string; label: string; required?: boolean }[]
}) {
  const pillarScores = computePillarScores(values)
  const overall = Object.values(pillarScores).reduce((a, b) => a + b, 0) / 5

  const phaseProgress = FW_DATA.phases.map(p => {
    const totalSteps = p.steps.filter(s => s.kind !== 'gate').length
    let answered = 0
    p.steps.forEach(s => {
      if (s.kind === 'gate') return
      const hasAny = (s.fields ?? []).some(f => values[f.id] && String(values[f.id]).length > 5)
      const hasSliders = (s.sliders ?? []).some(sl => values[sl.id] != null)
      const hasChecks = (s.checklist ?? []).some(c => values[c.id])
      if (hasAny || hasSliders || hasChecks) answered++
    })
    return { phase: p, ratio: answered / totalSteps, answered, total: totalSteps }
  })

  const currentPhaseIndex = phaseProgress.findIndex(p => p.ratio < 1)
  const currentSpiral = currentPhaseIndex < 0 ? 5 : FW_DATA.phases[currentPhaseIndex].spiral
  const completedSpirals = FW_DATA.phases.slice(0, currentPhaseIndex < 0 ? 4 : currentPhaseIndex).map(p => p.spiral)

  return (
    <div>
      <Crumb items={['Project', 'Dashboard']} />
      <h1 className="step-title">{communityName(values)} — Plan</h1>
      <p className="step-lede">A live diagnostic across pillars, phases, and frameworks.</p>

      {setupTodo.length > 0 && (
        <div className="card" style={{ background: 'var(--warn-soft)', padding: '12px 16px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Setup isn&rsquo;t finished yet</div>
          {setupTodo.map(t => (
            <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '4px 0' }}>
              <span>☐ {t.label}{t.required ? '' : <span style={{ color: 'var(--ink-3)' }}> (optional)</span>}</span>
              <button className="btn" style={{ fontSize: 12 }} onClick={() => onJump(t.id)}>Go →</button>
            </div>
          ))}
        </div>
      )}

      {/* Land & Scale stat boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { icon: '🏡', label: 'Homes planned', value: String(values.planned_homes ?? '') || null },
          { icon: '🌍', label: 'Land size',     value: String(values.land_size ?? '') || null },
          { icon: '📍', label: 'Country',       value: String(values.project_country ?? '') || null },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--rule)',
            borderRadius: 12, padding: '20px 22px',
            display: 'flex', flexDirection: 'column' as const, gap: 8,
          }}>
            <span style={{ fontSize: 28 }}>{s.icon}</span>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--ink-4)' }}>
              {s.label}
            </div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>
              {s.value ?? <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink-4)', fontFamily: 'inherit' }}>Not set — edit blueprint</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="metric-grid">
        <div className="metric">
          <div className="metric-label">Overall readiness</div>
          <div className="metric-value">{overall.toFixed(1)}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}> / 10</span></div>
          <div className="metric-note">across 5 pillars</div>
        </div>
        <div className="metric">
          <div className="metric-label">Current spiral</div>
          <div className="metric-value">S{currentSpiral}</div>
          <div className="metric-note">{FW_DATA.phases[Math.max(0, currentPhaseIndex)]?.spiralName ?? 'Continuous regeneration'}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Phases active</div>
          <div className="metric-value">{Math.max(1, currentPhaseIndex < 0 ? 4 : currentPhaseIndex + 1)}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}> / 4</span></div>
          <div className="metric-note">spark → live</div>
        </div>
        <div className="metric">
          <div className="metric-label">Gates passed</div>
          <div className="metric-value">{computeGatesPassed(values)}<span style={{ fontSize: 14, color: 'var(--ink-3)' }}> / 4</span></div>
          <div className="metric-note">RNF checkpoints</div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="rail-title">RNF Pillars</div>
          <PillarRadar scores={pillarScores} />
        </div>
        <div className="card">
          <div className="rail-title">5-Spiral Timeline</div>
          <SpiralTimelineLarge currentSpiral={currentSpiral} completedSpirals={completedSpirals} phases={FW_DATA.phases} />
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <div className="section-title">Phase progress</div>
          <div className="section-meta">Click to jump in</div>
        </div>
        {phaseProgress.map(({ phase, ratio, answered, total }) => (
          <div key={phase.id} className="card" style={{ cursor: 'pointer' }} onClick={() => onJump(phase.steps[0].id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div>
                <span style={{ color: 'var(--ink-3)', marginRight: 10, fontSize: 11, fontFamily: 'var(--mono)' }}>{phase.num}</span>
                <span style={{ fontFamily: 'var(--display)', fontSize: 22 }}>{phase.name}</span>
                <span style={{ color: 'var(--ink-3)', marginLeft: 10, fontSize: 13 }}>· {phase.subtitle}</span>
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>{answered}/{total} steps</span>
            </div>
            <div style={{ height: 4, background: 'var(--rule-soft)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${ratio * 100}%`, background: 'var(--rnf)', borderRadius: 2, transition: 'width 300ms' }}></div>
            </div>
          </div>
        ))}
      </div>

      <div className="nav-row">
        <button className="btn btn-ghost" onClick={() => onJump('welcome')}>← Welcome</button>
        <div className="row gap-8">
          <button className="btn" onClick={onPrint}>📄 Export project document</button>
          <button className="btn btn-primary" onClick={() => {
            const next = phaseProgress.find(p => p.ratio < 1)
            const firstNonGate = next?.phase.steps.find(s => s.kind !== 'gate')?.id
            onJump(firstNonGate ?? FW_DATA.phases[0].steps[0].id)
          }}>Continue where I left off →</button>
        </div>
      </div>
    </div>
  )
}

// ── Document Export ───────────────────────────────────────────────────────────

function downloadMarkdown(values: Values) {
  const D = FW_DATA
  const pillarScores = computePillarScores(values)
  const overall = Object.values(pillarScores).reduce((a, b) => a + b, 0) / 5
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  const projectName = (values.project_name as string) || 'Untitled Regenerative Neighborhood'

  let md = `# ${projectName}\n\n`
  md += `> *${(values.vision_statement as string) || 'A regenerative neighborhood in formation.'}*\n\n`
  md += `| Field | Value |\n|-------|-------|\n`
  md += `| Date | ${today} |\n`
  md += `| Overall Score | ${overall.toFixed(1)} / 10 |\n`
  md += `| Frameworks | RNF · Alchemy · RCOS · CLIPS |\n\n---\n\n`

  md += `## Diagnostic — RNF Pillars\n\n`
  md += `| Pillar | Score | Description |\n|--------|-------|-------------|\n`
  D.pillars.forEach(p => {
    md += `| ${p.name} | ${(pillarScores[p.id] || 0).toFixed(1)} / 10 | ${p.desc} |\n`
  })
  md += `\n---\n\n`

  D.phases.forEach(phase => {
    md += `## Phase ${phase.num} — ${phase.name}: ${phase.subtitle}\n\n*${phase.time}*\n\n${phase.lede}\n\n`
    phase.steps.filter(s => s.kind !== 'gate').forEach(step => {
      md += `### ${step.num} — ${step.title}\n\n*${step.tagLines.join(' · ')}*\n\n`
      let hasContent = false
      ;(step.fields || []).forEach(f => {
        if (values[f.id]) { hasContent = true; md += `**${f.label}**\n\n${values[f.id]}\n\n` }
      })
      const scoredSliders = (step.sliders || []).filter(s => values[s.id] != null)
      if (scoredSliders.length > 0) {
        hasContent = true
        md += `**Self-Assessment:**\n\n`
        scoredSliders.forEach(s => { md += `- ${s.label}: **${values[s.id]} / 10**\n` })
        md += `\n`
      }
      if ((step.checklist || []).length > 0) {
        hasContent = true
        md += `**Checklist:**\n\n`
        step.checklist!.forEach(c => {
          md += `- [${values[c.id] ? 'x' : ' '}] ${c.text}\n`
          if (values[c.id + '_note']) md += `  > ${values[c.id + '_note']}\n`
        })
        md += `\n`
      }
      if (!hasContent) md += `*No entries yet.*\n\n`
      md += `---\n\n`
    })
    phase.steps.filter(s => s.kind === 'gate').forEach(g => {
      const met = g.criteria!.filter(c => {
        const v = values[c.metric]; return (typeof v === 'boolean' && v) || (typeof v === 'number' && v >= 6)
      }).length
      const total = g.criteria!.length
      const status = met / total >= 0.8 ? 'READY' : met / total >= 0.5 ? 'SOFT-PASS' : 'NOT READY'
      md += `> **Gate:** ${g.title} — **${status}** (${met}/${total})\n\n`
    })
  })

  md += `## Action Items & Next Horizon\n\n`
  let hasActions = false
  D.pillars.forEach(p => {
    const score = pillarScores[p.id] || 0
    if (score < 5) { hasActions = true; md += `- **HIGH** | ${p.name} | Strengthen ${p.name} — score ${score.toFixed(1)}/10\n` }
  })
  D.phases.forEach(phase => {
    phase.steps.forEach(step => {
      if (step.kind === 'gate') return
      ;(step.fields || []).forEach(f => {
        if (!values[f.id] || String(values[f.id]).length < 10) { hasActions = true; md += `- **MEDIUM** | Phase ${phase.num} · ${step.num} | Complete: ${f.label}\n` }
      })
    })
  })
  if (!hasActions) md += `All foundations look solid. Next horizon: continuous regeneration.\n`
  md += `\n---\n\n*Generated ${today} · ${FRAMEWORK_CREDIT}*\n`

  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `regen-neighborhood-${Date.now()}.md`
  a.click()
  URL.revokeObjectURL(url)
}

function DocSection({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 40, marginBottom: 8 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 20, paddingBottom: 8, borderBottom: '2px solid var(--ink)',
      }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 500, letterSpacing: '-0.01em' }}>{title}</div>
        {meta && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-3)' }}>{meta.toUpperCase()}</div>}
      </div>
      {children}
    </div>
  )
}

function DocActionItems({ values, pillarScores }: { values: Values; pillarScores: Record<string, number> }) {
  const D = FW_DATA
  const items: { priority: string; context: string; action: string }[] = []
  D.pillars.forEach(p => {
    const score = pillarScores[p.id] || 0
    if (score < 5) items.push({ priority: 'High', context: p.name, action: `Strengthen ${p.name} pillar — score ${score.toFixed(1)}/10. Focus on: ${p.desc}.` })
  })
  D.phases.forEach(phase => {
    phase.steps.forEach(step => {
      if (step.kind === 'gate') return
      ;(step.fields || []).forEach(f => {
        if (!values[f.id] || String(values[f.id]).length < 10)
          items.push({ priority: 'Medium', context: `Phase ${phase.num} · ${step.num}`, action: `Complete: ${f.label}` })
      })
    })
  })
  if (items.length === 0) return <div style={{ fontStyle: 'italic', color: 'var(--ink-3)', padding: '12px 0' }}>All foundations look solid. Next horizon: continuous regeneration.</div>
  return (
    <div>
      {items.slice(0, 12).map((it, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '80px 160px 1fr', gap: 16,
          padding: '10px 0', borderBottom: '1px dashed var(--rule-soft)', fontSize: 13, alignItems: 'start',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: it.priority === 'High' ? 'var(--alchemy)' : 'var(--ink-3)', fontWeight: it.priority === 'High' ? 700 : 400 }}>{it.priority.toUpperCase()}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-2)' }}>{it.context}</div>
          <div style={{ color: 'var(--ink-2)' }}>{it.action}</div>
        </div>
      ))}
      {items.length > 12 && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 10, fontStyle: 'italic' }}>… and {items.length - 12} more items to address</div>}
    </div>
  )
}

function DocBody({ values }: { values: Values }) {
  const D = FW_DATA
  const pillarScores = computePillarScores(values)
  const overall = Object.values(pillarScores).reduce((a, b) => a + b, 0) / 5
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  const projectName = (values.project_name as string) || 'Untitled Regenerative Neighborhood'

  return (
    <div style={{ padding: '0 0 40px', fontFamily: 'var(--sans)', color: 'var(--ink)' }}>
      {/* Cover */}
      <div style={{ textAlign: 'left', padding: '40px 0 36px', borderBottom: '2px solid var(--ink)', marginBottom: 8 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 20 }}>
          Regenerative Neighborhood · Project Document
        </div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 48, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 16 }}>
          {projectName}
        </div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontStyle: 'italic', color: 'var(--ink-2)', marginBottom: 28, maxWidth: 560 }}>
          {(values.vision_statement as string) || 'A regenerative neighborhood in formation.'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, paddingTop: 20, borderTop: '1px solid var(--rule-soft)', fontSize: 12 }}>
          <div><div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Date</div><div>{today}</div></div>
          <div><div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Overall</div><div style={{ fontWeight: 600 }}>{overall.toFixed(1)} / 10</div></div>
          <div><div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Frameworks</div><div>RNF · Alchemy · RCOS · CLIPS</div></div>
          <div><div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Version</div><div>v2.0</div></div>
        </div>
      </div>

      {/* Pillar scorecard */}
      <DocSection title="Diagnostic — RNF Pillars">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center' }}>
          <PillarRadar scores={pillarScores} size={260} />
          <div>
            {D.pillars.map(p => (
              <div key={p.id} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)' }}>{(pillarScores[p.id] || 0).toFixed(1)} / 10</span>
                </div>
                <div style={{ height: 5, background: 'var(--rule-soft)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${(pillarScores[p.id] || 0) * 10}%`, background: p.color, borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </DocSection>

      {/* Phases */}
      {D.phases.map(phase => (
        <DocSection key={phase.id} title={`Phase ${phase.num} — ${phase.name}: ${phase.subtitle}`} meta={phase.time}>
          <div style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontSize: 16, color: 'var(--ink-2)', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--rule-soft)' }}>
            {phase.lede}
          </div>
          {phase.steps.filter(s => s.kind !== 'gate').map((step, stepIdx) => {
            const nonGateSteps = phase.steps.filter(s => s.kind !== 'gate')
            const hasContent = (step.fields || []).some(f => values[f.id]) ||
              (step.sliders || []).some(s => values[s.id] != null) ||
              (step.checklist || []).some(c => values[c.id])
            return (
              <div key={step.id} style={{ marginBottom: 36, paddingBottom: 28, borderBottom: stepIdx < nonGateSteps.length - 1 ? '2px dashed var(--rule-soft)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 500 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginRight: 10 }}>{step.num}</span>
                    {step.title}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.1em' }}>
                    {step.tagLines.join(' · ').toUpperCase()}
                  </div>
                </div>
                {!hasContent && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic', padding: '8px 0' }}>— No entries yet —</div>}
                {(step.fields || []).filter(f => values[f.id]).map((f, fi) => {
                  const filledFields = (step.fields || []).filter(fx => values[fx.id])
                  return (
                    <div key={f.id} style={{ marginBottom: 20, paddingBottom: fi < filledFields.length - 1 ? 16 : 0, borderBottom: fi < filledFields.length - 1 ? '1px dotted var(--rule-soft)' : 'none' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: 6 }}>{f.label}</div>
                      <div style={{ fontSize: 13.5, whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{String(values[f.id])}</div>
                    </div>
                  )
                })}
                {(step.checklist || []).length > 0 && (
                  <div style={{ marginTop: 14, padding: '14px 16px', background: 'var(--bg-2)', borderRadius: 4 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>Checklist</div>
                    {step.checklist!.map(c => (
                      <div key={c.id} style={{ padding: '5px 0', borderBottom: '1px solid var(--rule-soft)', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: values[c.id] ? 'var(--accent)' : 'var(--ink-4)', flexShrink: 0 }}>{values[c.id] ? '☑' : '☐'}</span>
                          <span style={{ color: values[c.id] ? 'var(--ink)' : 'var(--ink-3)' }}>{c.text}</span>
                        </div>
                        {!!values[c.id + '_note'] && <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 3, marginLeft: 20, fontStyle: 'italic' }}>{String(values[c.id + '_note'])}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {(step.sliders || []).filter(s => values[s.id] != null).length > 0 && (
                  <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {(step.sliders || []).filter(s => values[s.id] != null).map(s => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 4, borderLeft: '3px solid var(--accent)' }}>
                        <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{s.label}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13 }}>{String(values[s.id])}/10</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {phase.steps.filter(s => s.kind === 'gate').map(g => {
            const met = g.criteria!.filter(c => { const v = values[c.metric]; return (typeof v === 'boolean' && v) || (typeof v === 'number' && v >= 6) }).length
            const total = g.criteria!.length
            const ratio = met / total
            const status = ratio >= 0.8 ? 'READY' : ratio >= 0.5 ? 'SOFT-PASS' : 'NOT READY'
            const statusColor = ratio >= 0.8 ? 'var(--accent)' : ratio >= 0.5 ? 'var(--warn)' : 'var(--alchemy)'
            return (
              <div key={g.id} style={{ marginTop: 20, padding: '16px 20px', background: 'var(--bg-2)', border: `1px solid ${statusColor}`, borderLeft: `4px solid ${statusColor}`, borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 17 }}>{g.title} — {g.subtitle}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.16em', color: statusColor }}>{status} ({met}/{total})</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {g.criteria!.map(c => {
                    const v = values[c.metric]
                    const m = (typeof v === 'boolean' && v) || (typeof v === 'number' && v >= 6)
                    return (
                      <div key={c.id} style={{ fontSize: 12, padding: '3px 0', display: 'flex', gap: 8 }}>
                        <span style={{ color: m ? 'var(--accent)' : 'var(--ink-4)', fontWeight: 600 }}>{m ? '✓' : '·'}</span>
                        <span style={{ color: m ? 'var(--ink)' : 'var(--ink-3)' }}>{c.text}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </DocSection>
      ))}

      <DocSection title="Action Items & Next Horizon">
        <DocActionItems values={values} pillarScores={pillarScores} />
      </DocSection>

      <div style={{ marginTop: 40, paddingTop: 16, borderTop: '2px solid var(--rule)', fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.8, fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}>
        Generated {today} · {FRAMEWORK_CREDIT}
      </div>
    </div>
  )
}

function ProjectDocumentModal({ values, onClose, onPrint }: { values: Values; onClose: () => void; onPrint: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '32px 16px', overflow: 'auto',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: 860, padding: '28px 32px',
        boxShadow: 'var(--shadow-lg)', position: 'relative',
      }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none', fontSize: 20,
          color: 'var(--ink-3)', cursor: 'pointer', lineHeight: 1,
          padding: '4px 8px', borderRadius: 'var(--radius-sm)',
        }}>×</button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--rule)' }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Preview &amp; Export</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 24 }}>Project Document</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => downloadMarkdown(values)}>⬇ Download Markdown</button>
            <button className="btn btn-primary" onClick={onPrint}>🖨 Print / Save PDF</button>
          </div>
        </div>

        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>
          <DocBody values={values} />
        </div>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function BlueprintClient({ blueprintId, initialAnswers, readOnly = false, isAdmin = false, initialStep }: Props & { readOnly?: boolean }) {
  const D = FW_DATA
  const circles = useCircles()
  const branding = useBranding()

  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    const t = document.documentElement.dataset.theme
    setTheme(t === 'dark' ? 'dark' : 'light')
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('theme', theme) } catch { /* noop */ }
  }, [theme])

  const flat = useMemo(() => {
    const arr: Array<{ id: string; kind: string; phaseRef?: PhaseDef } & Partial<StepDef>> = [
      { id: 'welcome', kind: 'welcome' }
    ]
    D.phases.forEach(p => p.steps.forEach(s => arr.push({ ...s, phaseRef: p })))
    // Setup's last step (INSTANCES.md §6.2)
    arr.push({ id: 'branding', kind: 'branding' })
    arr.push({ id: 'documents', kind: 'documents' })
    arr.push({ id: 'circles', kind: 'circles' })
    arr.push({ id: 'dashboard', kind: 'dashboard' })
    return arr
  }, [D])

  const [values, setValues] = useState<Values>(initialAnswers)
  const [currentId, setCurrentId] = useState(() =>
    initialStep && flat.some(s => s.id === initialStep) ? initialStep
      : readOnly || Object.keys(initialAnswers).length > 0 ? 'dashboard' : 'welcome'
  )

  // One debounced saver per blueprint; it creates its own client so it doesn't
  // depend on a value that changes every render. Only admins and circle leads can
  // save (RLS); a refused update returns no rows rather than an error.
  const [saveFailed, setSaveFailed] = useState(false)
  const save = useMemo(
    () => debounce(async (vals: Values) => {
      const { data, error } = await createClient().from('blueprints').update({ answers: vals }).eq('id', blueprintId).select('id')
      setSaveFailed(!!error || !data?.length)
    }, 1800),
    [blueprintId],
  )

  useEffect(() => {
    if (!readOnly) save(values)
  }, [values, save, readOnly])

  const idx = flat.findIndex(s => s.id === currentId)
  const current = flat[idx] ?? flat[0]

  const handleField = (id: string, val: unknown) => setValues(v => ({ ...v, [id]: val }))
  const handleSlider = (id: string, val: number) => setValues(v => ({ ...v, [id]: val }))
  const handleCheck = (id: string, val: unknown) => setValues(v => ({ ...v, [id]: val }))

  const scrollMainToTop = () => {
    const mainEl = document.querySelector('.wizard-root .main')
    if (mainEl) (mainEl as HTMLElement).scrollTop = 0
  }

  const goNext = () => { if (idx < flat.length - 1) { setCurrentId(flat[idx + 1].id); scrollMainToTop() } }
  const goPrev = () => { if (idx > 0) { setCurrentId(flat[idx - 1].id); scrollMainToTop() } }
  const jumpTo = (id: string) => { setCurrentId(id); scrollMainToTop() }

  useEffect(() => {
    const el = document.querySelector(`[data-step-id="${currentId}"]`)
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentId])

  const pillarScores = computePillarScores(values)
  const hasProgress = Object.keys(values).length > 0

  const currentPhase = (current as { phaseRef?: PhaseDef }).phaseRef ?? D.phases[0]
  const currentSpiral = currentPhase.spiral
  const completedSpirals = D.phases.filter(p => p.spiral < currentSpiral).map(p => p.spiral)

  const [showDoc, setShowDoc] = useState(false)

  const handlePrint = () => {
    setShowDoc(false)
    setTimeout(async () => {
      const printDiv = document.createElement('div')
      printDiv.id = '__print_root'
      printDiv.style.cssText = 'position:fixed;inset:0;background:white;z-index:9999;overflow:auto;padding:32px 48px;font-family:sans-serif;color:#0a0a0a;'
      document.body.appendChild(printDiv)
      const { createRoot } = await import('react-dom/client')
      const root = createRoot(printDiv)
      root.render(<DocBody values={values} />)
      setTimeout(() => {
        window.print()
        setTimeout(() => { root.unmount(); printDiv.remove() }, 500)
      }, 300)
    }, 100)
  }

  const [showImport, setShowImport] = useState(false)
  const [importScope, setImportScope] = useState<ImportScope | undefined>(undefined)

  const openImport = (step?: StepDef, section?: string) => {
    setImportScope(step ? { step, section } : undefined)
    setShowImport(true)
  }
  const openCirclesImport = () => { setImportScope({ circles: true }); setShowImport(true) }
  const clearFoundCircles = () => setValues(v => { const next = { ...v }; delete next[FOUND_CIRCLES_KEY]; return next })

  const [mobileTab, setMobileTab] = useState<'nav' | 'content' | 'stats'>('content')
  const TABS = ['nav', 'content', 'stats'] as const
  const swipeRef = useRef({ x: 0, y: 0, t: 0, active: false })

  const onTouchStart = (e: React.TouchEvent) => {
    const el = e.target as Element
    if (el.closest && (el.closest('input[type="range"]') || el.closest('.guide-pop') || el.closest('.fs-help-pop'))) {
      swipeRef.current.active = false; return
    }
    const t = e.touches[0]
    swipeRef.current = { x: t.clientX, y: t.clientY, t: Date.now(), active: true }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!swipeRef.current.active) return
    const t = e.changedTouches[0]
    const dx = t.clientX - swipeRef.current.x
    const dy = t.clientY - swipeRef.current.y
    const dt = Date.now() - swipeRef.current.t
    swipeRef.current.active = false
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.4 || dt > 700) return
    const i = TABS.indexOf(mobileTab)
    if (dx < 0 && i < TABS.length - 1) setMobileTab(TABS[i + 1])
    if (dx > 0 && i > 0) setMobileTab(TABS[i - 1])
  }

  return (
    <div className="wizard-root" data-theme={theme} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <nav className="mobile-tabs">
        {(['nav', 'content', 'stats'] as const).map(tab => (
          <button key={tab} className={`mobile-tab${mobileTab === tab ? ' active' : ''}`}
            onClick={() => setMobileTab(tab)}>
            <span className="mobile-tab-icon">{tab === 'nav' ? '☰' : tab === 'content' ? '✏' : '◎'}</span>
            <span>{tab === 'nav' ? 'Steps' : tab === 'content' ? 'Content' : 'Radar'}</span>
          </button>
        ))}
        <Link href="/" className="mobile-tab" style={{ textDecoration: 'none' }}>
          <span className="mobile-tab-icon">⌂</span>
          <span>Home</span>
        </Link>
      </nav>

      <div className="app">
        {/* Sidebar */}
        <aside className={`sidebar${mobileTab === 'nav' ? ' mobile-open' : ''}`}>
          <div className="brand">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>MyCoNet</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: '#92640a', padding: '1px 7px', borderRadius: 20, letterSpacing: '0.06em' }}>M04</span>
              </div>
              <div className="brand-name">Blueprint</div>
              <div className="brand-sub">Regen Neighborhood Framework</div>
            </div>
            <div className="theme-toggle">
              <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')} aria-label="Light">☀</button>
              <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')} aria-label="Dark">☾</button>
            </div>
          </div>

          <Link href="/" className="home-link">← Home</Link>

          <ul className="phase-list">
            <li className={`step${currentId === 'welcome' ? ' active' : ''}`}
              data-step-id="welcome"
              style={{ paddingLeft: 0, marginBottom: 12 }}
              onClick={() => jumpTo('welcome')}>
              <div className="step-dot"></div>
              <div>Welcome</div>
            </li>

            {D.phases.map(phase => (
              <li key={phase.id} className={`phase${phase.steps.some(s => s.id === currentId) ? ' has-active' : ''}`}>
                <div className="phase-header">
                  <span className="phase-num">{phase.num}</span>
                  <span className="phase-title">{phase.name}</span>
                  <span className="phase-time">{phase.time.split(' ').slice(-1)[0]}</span>
                </div>
                <ul className="step-list">
                  {phase.steps.map(s => {
                    const isActive = s.id === currentId
                    const isComplete = stepComplete(s, values)
                    const isGate = s.kind === 'gate'
                    const gs = isGate ? gateStatus(s, values) : null
                    let cls = 'step'
                    if (isActive) cls += ' active'
                    if (isComplete) cls += ' complete'
                    if (isGate) {
                      cls += ' gate'
                      if (gs === 'ready') cls += ' passed'
                      else if (gs === 'warning') cls += ' gate-warning'
                    }
                    return (
                      <li key={s.id} className={cls} data-step-id={s.id} onClick={() => jumpTo(s.id)}>
                        <div className="step-dot"></div>
                        <div>{isGate ? `Gate ${s.gateNum === 34 ? '3·4' : s.gateNum}` : `${s.num} ${s.title}`}</div>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}

            <li className={`step${currentId === 'branding' ? ' active' : ''}${branding.logo_url && branding.banner_url ? ' complete' : ''}`}
              data-step-id="branding"
              style={{ paddingLeft: 0, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--rule-soft)' }}
              onClick={() => jumpTo('branding')}>
              <div className="step-dot"></div>
              <div>🎨 Look &amp; feel</div>
            </li>

            <li className={`step${currentId === 'documents' ? ' active' : ''}`}
              data-step-id="documents"
              style={{ paddingLeft: 0, marginTop: 8 }}
              onClick={() => jumpTo('documents')}>
              <div className="step-dot"></div>
              <div>📚 Documents</div>
            </li>

            <li className={`step${currentId === 'circles' ? ' active' : ''}${circles.list.length ? ' complete' : ''}`}
              data-step-id="circles"
              style={{ paddingLeft: 0, marginTop: 8 }}
              onClick={() => jumpTo('circles')}>
              <div className="step-dot"></div>
              <div>◯ Circles</div>
            </li>

            <li className={`step${currentId === 'dashboard' ? ' active' : ''}`}
              data-step-id="dashboard"
              style={{ paddingLeft: 0, marginTop: 8 }}
              onClick={() => jumpTo('dashboard')}>
              <div className="step-dot"></div>
              <div>📊 Dashboard</div>
            </li>
          </ul>

          <div className="legend">
            <div className="legend-title">Frameworks</div>
            {Object.entries(D.frameworks).map(([k, fw]) => (
              <div key={k} className="legend-item">
                <div className="legend-swatch" style={{ background: fw.color }}></div>
                <div>
                  <div className="legend-name">{fw.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{fw.tag}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className={`main${mobileTab !== 'content' ? ' mobile-hidden' : ''}`}>
          {saveFailed && (
            <div role="alert" style={{ margin: '0 0 16px', padding: '10px 14px', borderRadius: 8, fontSize: 13,
              background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.35)', color: '#b91c1c' }}>
              Your changes aren&rsquo;t being saved. Only admins and circle leads can change the blueprint.
            </div>
          )}
          {current.kind === 'welcome' && (
            <WelcomeView onStart={() => jumpTo(D.phases[0].steps[0].id)}
              hasProgress={hasProgress} onJumpToDashboard={() => jumpTo('dashboard')}
              onImport={() => openImport()} readOnly={readOnly} />
          )}
          {current.kind === 'dashboard' && (
            <DashboardView values={values} onJump={jumpTo} onPrint={() => setShowDoc(true)} setupTodo={[
              ...(circles.list.length === 0 ? [{ id: 'circles', label: 'Set up your circles', required: true }] : []),
              ...(!branding.logo_url ? [{ id: 'branding', label: 'Add your logo' }] : []),
              ...(!branding.banner_url ? [{ id: 'branding', label: 'Add a banner image' }] : []),
            ]} />
          )}
          {current.kind === 'documents' && (
            <DocumentsStep canEdit={!readOnly} onPrev={goPrev} onNext={goNext} />
          )}
          {current.kind === 'branding' && (
            <BrandingStep canEdit={isAdmin && !readOnly} onPrev={goPrev} onNext={goNext} />
          )}
          {current.kind === 'circles' && (
            <CirclesStep values={values} canEdit={isAdmin && !readOnly}
              onImport={openCirclesImport} onClearFound={clearFoundCircles}
              onPrev={goPrev} onNext={goNext} />
          )}
          {(current as { phaseRef?: PhaseDef }).phaseRef && (
            <StepView
              step={current as StepDef}
              phase={(current as { phaseRef: PhaseDef }).phaseRef}
              values={values}
              onField={handleField}
              onSlider={handleSlider}
              onCheck={handleCheck}
              onNext={goNext}
              onPrev={goPrev}
              onImport={openImport}
              extra={current.id === 's1.4' ? <CommunityValuesEditor canEdit={!readOnly} /> : undefined}
            />
          )}
        </main>

        {/* Right rail */}
        <aside className={`rail${mobileTab === 'stats' ? ' mobile-open' : ''}`}>
          <div className="rail-section">
            <div className="rail-title">Live Diagnostic</div>
            <PillarRadar scores={pillarScores} size={260} />
          </div>
          <div className="rail-section">
            <div className="rail-title">RNF Pillars</div>
            <PillarBars scores={pillarScores} onJump={jumpTo} />
          </div>
          <div className="rail-section">
            <div className="rail-title">5-Spiral Timeline</div>
            <SpiralMini currentSpiral={currentSpiral} completedSpirals={completedSpirals} />
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.1em', marginTop: 6 }}>
              CURRENT: SPIRAL {currentSpiral}
            </div>
          </div>
          {readOnly ? (
            <div className="rail-section" style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5, background: 'var(--bg-2)', borderRadius: 6, padding: '10px 12px' }}>
              📖 Viewing the community blueprint. Only admins can edit.
            </div>
          ) : (
            <div className="rail-section">
              <button className="btn" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setShowImport(true)}>
                ✨ Import from document
              </button>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 11 }}
                onClick={() => {
                  if (confirm('Reset all wizard data? This cannot be undone.')) {
                    setValues({})
                    setCurrentId('welcome')
                    createClient().from('blueprints').update({ answers: {}, flags: {} }).eq('id', blueprintId)
                  }
                }}>
                Reset progress
              </button>
            </div>
          )}
        </aside>
      </div>

      {showDoc && (
        <ProjectDocumentModal
          values={values}
          onClose={() => setShowDoc(false)}
          onPrint={handlePrint}
        />
      )}

      {showImport && (
        <ImportModal
          onClose={() => { setShowImport(false); setImportScope(undefined) }}
          currentValues={values}
          scope={importScope}
          canSetBranding={isAdmin && !readOnly}
          onApply={extracted => setValues(v => ({ ...v, ...extracted }))}
        />
      )}
    </div>
  )
}
