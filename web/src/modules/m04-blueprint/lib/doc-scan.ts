/**
 * Reads a community's document and answers the Blueprint's questions, in two passes:
 *
 * 1. Evidence: the document is read in parts (~150k characters each; most documents
 *    are one part). For every question a part says something about, the AI collects
 *    short verbatim quotes with page numbers — no answers yet. The same pass collects
 *    circles and a summary.
 * 2. Answers: one request per framework phase, in parallel. Each question gets ALL the
 *    evidence from the whole document plus the current answer, and comes back with a
 *    combined answer, a confidence, page sources and any conflict.
 *
 * Questions with no evidence are returned as gaps. A part or phase that fails is
 * retried once; if it still fails the rest of the results are kept.
 */
import { CIRCLES_PROMPT_RULE, mergeFoundCircles, type FoundCircle } from './circle-setup'

export interface ScanField {
  id: string; kind: 'text' | 'slider' | 'check'; phase: string; step: string; label: string; help: string
}

export type Confidence = 'high' | 'medium' | 'low'

export interface AnswerMeta { confidence: Confidence; pages: number[]; conflict?: string; why?: string }

export interface ScanResult {
  values: Record<string, unknown>
  meta: Record<string, AnswerMeta>
  /** Questions the document doesn't cover */
  gaps: string[]
  summary: string
  circles: FoundCircle[]
  /** Parts or phases that failed even after a retry */
  failed: number
  attempted: number
  /** The document was longer than we read */
  truncated: boolean
}

export interface ScanProgress { label: string; done: number; total: number }

interface Quote { q: string; p: number | null }

// The server accepts 200k characters; keep room for the instructions
const PROMPT_LIMIT = 195_000
const PART_CHARS = 150_000
const MAX_DOC_CHARS = 1_200_000
// Four framework phases → all answer requests run at once
const CONCURRENCY = 4
const MAX_QUOTES = 6
const MAX_QUOTE_CHARS = 400

async function callAI(prompt: string, maxTokens: number): Promise<Record<string, unknown>> {
  const url = process.env.NEXT_PUBLIC_AI_WORKER_URL || '/api/scan'
  let lastError: Error | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, maxTokens }) })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `Request failed (${resp.status})`)
      }
      const { result } = await resp.json() as { result: string }
      return JSON.parse(result) as Record<string, unknown>
    } catch (e) {
      lastError = e as Error
      // Size errors won't get better on a retry
      if (/too long|413/i.test(lastError.message)) break
    }
  }
  throw lastError ?? new Error('Scan failed')
}

async function inBatches<T, R>(items: T[], fn: (item: T, i: number) => Promise<R>, onDone: () => void): Promise<(R | null)[]> {
  const out: (R | null)[] = new Array(items.length).fill(null)
  for (let start = 0; start < items.length; start += CONCURRENCY) {
    await Promise.all(items.slice(start, start + CONCURRENCY).map(async (item, j) => {
      try { out[start + j] = await fn(item, start + j) } catch { out[start + j] = null }
      onDone()
    }))
  }
  return out
}

/** Splits at page markers or paragraph breaks near the size limit, so quotes aren't cut in half. */
function splitDocument(text: string, size: number): string[] {
  const parts: string[] = []
  let rest = text
  while (rest.length > size) {
    const window = rest.slice(0, size)
    const cut = Math.max(window.lastIndexOf('\n[Page '), window.lastIndexOf('\n\n'))
    const at = cut > size * 0.6 ? cut : size
    parts.push(rest.slice(0, at))
    rest = rest.slice(at)
  }
  if (rest.trim()) parts.push(rest)
  return parts
}

const fieldLine = (f: ScanField) => `- ${f.id} (${f.kind}): ${f.label}${f.help ? ` — ${f.help}` : ''}`

function evidencePrompt(part: string, n: number, total: number, fields: ScanField[], wantCircles: boolean) {
  return `You are reading a community's planning document to fill in their Regenerative Neighborhood Framework Blueprint.${total > 1 ? ` This is part ${n} of ${total}.` : ''}

Do NOT write answers yet. Collect evidence.
- For each question below that this text says something about, collect up to 3 short VERBATIM quotes (at most 200 characters each). Prefer the most specific ones.
- Give each quote the page number from the nearest [Page N] marker before it, or null if there are no markers.
- Skip questions the text says nothing about. Never invent or paraphrase inside a quote.
- Also write "summary": 2-3 sentences on what this text covers (who, where, what stage).${wantCircles ? `\n${CIRCLES_PROMPT_RULE}` : ''}

Return ONLY JSON:
{"summary": "...", "evidence": {"<question id>": [{"q": "quote", "p": 12}]}${wantCircles ? ', "circles": [...]' : ''}}

QUESTIONS:
${fields.length ? fields.map(fieldLine).join('\n') : '(none: only the summary' + (wantCircles ? ' and circles' : '') + ')'}

TEXT:
"""
${part}
"""`
}

function answerPrompt(phase: string, summary: string, items: { f: ScanField; quotes: Quote[]; existing: string | null }[]) {
  const blocks = items.map(({ f, quotes, existing }) => [
    `### ${f.id} (${f.kind}): ${f.label}`,
    existing ? `Current answer: ${existing}` : 'Current answer: (none)',
    ...quotes.map(q => `- "${q.q}"${q.p != null ? ` (p.${q.p})` : ''}`),
  ].join('\n')).join('\n\n')
  return `You are filling in the "${phase}" phase of a community's Regenerative Neighborhood Framework Blueprint, using evidence collected from their whole document.

About the document: ${summary || '(no summary)'}

For each question below, write the answer from the evidence given:
- text: 1-4 sentences in the community's own voice ("we"), concrete (names, numbers, places, dates). Combine evidence from different pages into one answer.
- slider: an integer 0-10 for how far along or how strong this area is, judged from the evidence.
- check: true only if the evidence clearly shows it is in place; otherwise leave the question out.
- ids ending in "_note": 1-2 concrete sentences.
For every answer also give:
- "confidence": "high" if the document states it directly, "medium" if implied or partial, "low" if thin or inferred
- "pages": the page numbers you used ([] if none)
- "conflict": one short sentence if the evidence disagrees with itself or with the current answer; otherwise leave it out
- "why": one short sentence (required for sliders)
Leave out any question the evidence doesn't really answer. Don't use outside knowledge.

Return ONLY JSON:
{"<id>": {"value": ..., "confidence": "high", "pages": [3, 12], "conflict": "...", "why": "..."}}

QUESTIONS WITH EVIDENCE:
${blocks}`
}

const asQuotes = (v: unknown): Quote[] => (Array.isArray(v) ? v : []).flatMap(x => {
  if (!x || typeof x !== 'object') return []
  const r = x as Record<string, unknown>
  const q = typeof r.q === 'string' ? r.q.trim().slice(0, MAX_QUOTE_CHARS) : ''
  return q ? [{ q, p: typeof r.p === 'number' ? r.p : null }] : []
})

const display = (f: ScanField, v: unknown) =>
  v == null || v === '' ? null : f.kind === 'slider' ? `${v}/10` : f.kind === 'check' ? (v ? 'Yes' : 'No') : String(v)

export async function scanDocument({ docText, fields, current, wantCircles, onProgress }: {
  docText: string
  fields: ScanField[]
  current: Record<string, unknown>
  wantCircles: boolean
  onProgress: (p: ScanProgress) => void
}): Promise<ScanResult> {
  const truncated = docText.length > MAX_DOC_CHARS
  const text = docText.slice(0, MAX_DOC_CHARS)
  const template = evidencePrompt('', 1, 2, fields, wantCircles).length
  const parts = splitDocument(text, Math.min(PART_CHARS, PROMPT_LIMIT - template))

  // Pass 1: evidence
  let done = 0
  onProgress({ label: 'Reading the document', done, total: parts.length })
  const evidenceResults = await inBatches(parts,
    // Many questions × quotes can make a long reply: allow plenty of room
    (part, i) => callAI(evidencePrompt(part, i + 1, parts.length, fields, wantCircles), 32_000),
    () => onProgress({ label: 'Reading the document', done: ++done, total: parts.length }))

  const okParts = evidenceResults.filter((r): r is Record<string, unknown> => r != null)
  if (okParts.length === 0) throw new Error("The document couldn't be read. Try again in a moment.")

  const evidence: Record<string, Quote[]> = {}
  const summaries: string[] = []
  const circleLists: unknown[] = []
  const known = new Set(fields.map(f => f.id))
  for (const r of okParts) {
    if (typeof r.summary === 'string') summaries.push(r.summary)
    if (r.circles) circleLists.push(r.circles)
    const ev = (r.evidence && typeof r.evidence === 'object' ? r.evidence : {}) as Record<string, unknown>
    for (const [id, qs] of Object.entries(ev)) {
      if (!known.has(id)) continue
      evidence[id] = [...(evidence[id] ?? []), ...asQuotes(qs)].slice(0, MAX_QUOTES)
    }
  }
  const summary = summaries.join(' ')

  // Pass 2: answers, one request per phase
  const phases = [...new Set(fields.map(f => f.phase))]
  const jobs = phases.map(phase => ({
    phase,
    items: fields.filter(f => f.phase === phase && evidence[f.id]?.length)
      .map(f => ({ f, quotes: evidence[f.id], existing: display(f, current[f.id]) })),
  })).filter(j => j.items.length > 0)

  done = 0
  onProgress({ label: 'Writing answers', done, total: jobs.length })
  const answerResults = await inBatches(jobs,
    job => callAI(answerPrompt(job.phase, summary, job.items), 24_000),
    () => onProgress({ label: 'Writing answers', done: ++done, total: jobs.length }))

  const values: Record<string, unknown> = {}
  const meta: Record<string, AnswerMeta> = {}
  answerResults.forEach(r => {
    if (!r) return
    for (const [id, raw] of Object.entries(r)) {
      if (!known.has(id) || !raw || typeof raw !== 'object') continue
      const a = raw as Record<string, unknown>
      const f = fields.find(x => x.id === id)!
      let v = a.value
      if (f.kind === 'slider') v = typeof v === 'number' ? Math.max(0, Math.min(10, Math.round(v))) : Number.parseInt(String(v), 10)
      if (f.kind === 'slider' && Number.isNaN(v)) continue
      if (f.kind === 'check' && v !== true) continue
      if (f.kind === 'text' && (typeof v !== 'string' || !v.trim())) continue
      values[id] = typeof v === 'string' ? v.trim() : v
      meta[id] = {
        confidence: a.confidence === 'high' || a.confidence === 'low' ? a.confidence : 'medium',
        pages: Array.isArray(a.pages) ? a.pages.filter((p): p is number => typeof p === 'number') : [],
        conflict: typeof a.conflict === 'string' && a.conflict.trim() ? a.conflict.trim() : undefined,
        why: typeof a.why === 'string' && a.why.trim() ? a.why.trim() : undefined,
      }
    }
  })

  // A gap is a written question the document doesn't answer (sliders and checks aren't gaps)
  const gaps = fields.filter(f => f.kind === 'text' && !f.id.endsWith('_note') && values[f.id] == null).map(f => f.id)

  return {
    values, meta, gaps, summary,
    circles: mergeFoundCircles(circleLists),
    failed: (parts.length - okParts.length) + answerResults.filter(r => r == null).length,
    attempted: parts.length + jobs.length,
    truncated,
  }
}
