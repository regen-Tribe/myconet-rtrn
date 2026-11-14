/**
 * Reads a community's document and answers the Blueprint's questions, in two passes:
 *
 * 1. Evidence (fast model): the document is read in parts (~150k characters each; most
 *    documents are one part), one request per framework phase, in parallel. For every question a part says something about, the AI collects
 *    short verbatim quotes with page numbers — no answers yet. The same pass collects
 *    circles and a summary.
 * 2. Answers (full model): one request per framework phase, in parallel. Each question gets ALL the
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

export interface ScanProgress {
  step: 'quotes' | 'answers'
  done: number
  total: number
  /** Framework phases finished in this step so far (e.g. ["Spark", "Prove"]) */
  finished: string[]
  /** Questions with evidence so far (quotes step) or answered so far (answers step) */
  found: number
}

interface Quote { q: string; p: number | null }

// The server accepts 200k characters; keep room for the instructions
const PROMPT_LIMIT = 195_000
const PART_CHARS = 150_000
const MAX_DOC_CHARS = 1_200_000
// Requests in flight at once (quotes: one per phase; answers: up to ANSWER_GROUP questions each)
const CONCURRENCY = 6
const ANSWER_GROUP = 20
const MAX_QUOTES = 6
const MAX_QUOTE_CHARS = 400

async function callAI(prompt: string, maxTokens: number, mode: 'fast' | 'full'): Promise<Record<string, unknown>> {
  const url = process.env.NEXT_PUBLIC_AI_WORKER_URL || '/api/scan'
  let lastError: Error | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, maxTokens, mode }) })
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

/** Runs fn over items with up to CONCURRENCY in flight; the next starts as soon as one finishes. */
async function inBatches<T, R>(items: T[], fn: (item: T, i: number) => Promise<R>, onDone: () => void): Promise<(R | null)[]> {
  const out: (R | null)[] = new Array(items.length).fill(null)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      try { out[i] = await fn(items[i], i) } catch { out[i] = null }
      onDone()
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker))
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

export function evidencePrompt(part: string, n: number, total: number, fields: ScanField[], wantCircles: boolean, withSummary: boolean) {
  return `You are reading a community's planning document to fill in their Regenerative Neighborhood Framework Blueprint.${total > 1 ? ` This is part ${n} of ${total}.` : ''}

Do NOT write answers yet. Collect evidence.
- For each question below that this text says something about, collect up to 3 short VERBATIM quotes (at most 200 characters each). Prefer the most specific ones.
- Give each quote the page number from the nearest [Page N] marker before it, or null if there are no markers.
- Skip questions the text says nothing about. Never invent or paraphrase inside a quote.${withSummary ? '\n- Also write "summary": 2-3 sentences on what this text covers (who, where, what stage).' : ''}${wantCircles ? `\n${CIRCLES_PROMPT_RULE}` : ''}

Return ONLY JSON:
{${withSummary ? '"summary": "...", ' : ''}"evidence": {"<question id>": [{"q": "quote", "p": 12}]}${wantCircles ? ', "circles": [...]' : ''}}

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
  // Evidence is gathered per framework phase as well as per part: a detailed document
  // can have so many quotes for all ~150 questions that one reply hits the length limit.
  // The first phase's request also writes the summary and finds circles.
  const phaseNames = [...new Set(fields.map(f => f.phase))]
  const groups: ScanField[][] = phaseNames.length ? phaseNames.map(ph => fields.filter(f => f.phase === ph)) : [[]]
  const template = Math.max(...groups.map((g, gi) => evidencePrompt('', 1, 2, g, wantCircles && gi === 0, gi === 0).length))
  const parts = splitDocument(text, Math.min(PART_CHARS, PROMPT_LIMIT - template))
  const evJobs = parts.flatMap((part, i) => groups.map((g, gi) => ({ part, i, g, lead: gi === 0 })))

  // Pass 1: evidence
  let done = 0
  const finishedQuotes: string[] = []
  const withEvidence = new Set<string>()
  const groupName = (g: ScanField[]) => g[0]?.phase ?? 'Circles'
  onProgress({ step: 'quotes', done, total: evJobs.length, finished: [], found: 0 })
  const evidenceResults = await inBatches(evJobs,
    // Gathering quotes is mechanical: the fast model with low reasoning (full reasoning over
    // a long document thinks until it runs out of room)
    async job => {
      const r = await callAI(evidencePrompt(job.part, job.i + 1, parts.length, job.g, wantCircles && job.lead, job.lead), 24_000, 'fast')
      Object.keys((r.evidence ?? {}) as object).forEach(id => withEvidence.add(id))
      finishedQuotes.push(groupName(job.g) + (parts.length > 1 ? ` (part ${job.i + 1})` : ''))
      return r
    },
    () => onProgress({ step: 'quotes', done: ++done, total: evJobs.length, finished: [...finishedQuotes], found: withEvidence.size }))

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
  // At most ANSWER_GROUP questions per request: smaller replies come back faster and
  // never run into the reply length limit (a 40-question phase took 2 minutes and ~21k tokens)
  const jobs = phases.flatMap(phase => {
    const items = fields.filter(f => f.phase === phase && evidence[f.id]?.length)
      .map(f => ({ f, quotes: evidence[f.id], existing: display(f, current[f.id]) }))
    const groups: (typeof items)[] = []
    for (let k = 0; k < items.length; k += ANSWER_GROUP) groups.push(items.slice(k, k + ANSWER_GROUP))
    return groups.map(g => ({ phase, items: g }))
  })

  done = 0
  const finishedAnswers: string[] = []
  const groupsLeft: Record<string, number> = {}
  jobs.forEach(j => { groupsLeft[j.phase] = (groupsLeft[j.phase] ?? 0) + 1 })
  let answered = 0
  onProgress({ step: 'answers', done, total: jobs.length, finished: [], found: 0 })
  const answerResults = await inBatches(jobs,
    // Writing answers is judgement (combining pages, conflicts, scores): the full model
    async job => {
      const r = await callAI(answerPrompt(job.phase, summary, job.items), 24_000, 'full')
      answered += Object.keys(r).length
      // A phase counts as finished when its last group is back
      if (--groupsLeft[job.phase] === 0) finishedAnswers.push(job.phase)
      return r
    },
    () => onProgress({ step: 'answers', done: ++done, total: jobs.length, finished: [...finishedAnswers], found: answered }))

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
    failed: (evJobs.length - okParts.length) + answerResults.filter(r => r == null).length,
    attempted: evJobs.length + jobs.length,
    truncated,
  }
}

const MERGE_GROUP = 12

export interface MergeItem { id: string; label: string; current: string; proposed: string }

/**
 * For questions that already had an answer: asks the AI to write one answer that
 * combines what was there with what the import found, instead of stacking the two.
 * Returns the combined text by field id; a group that fails is left out (the review
 * then falls back to adding the new text after the old).
 */
export async function mergeAnswers(items: MergeItem[], onProgress?: (done: number, total: number) => void): Promise<Record<string, string>> {
  const groups: MergeItem[][] = []
  for (let i = 0; i < items.length; i += MERGE_GROUP) groups.push(items.slice(i, i + MERGE_GROUP))
  let done = 0
  onProgress?.(0, items.length)
  const results = await inBatches(groups, async group => {
    const prompt = `You are helping a community keep its planning Blueprint up to date. Each question below has the answer the community already wrote ("current") and a new answer drawn from one of their documents or their website ("proposed").

For each question, write ONE answer that combines them in the best way:
- Keep every concrete fact from both (names, numbers, places, dates, decisions). Say each thing once.
- Where they disagree, prefer the current answer's facts (the community wrote it) unless the proposed one is clearly more specific or more recent; you may mention both briefly if it matters.
- Write in the community's own voice ("we"), plain and clear, as one flowing answer, not two pasted together. Keep any list or structure the current answer uses.
- Don't invent anything that isn't in either answer. Keep it about as long as the longer of the two, longer only when both add different facts.

Questions:
${JSON.stringify(group.map(g => ({ id: g.id, question: g.label, current: g.current, proposed: g.proposed })), null, 1)}

Reply with JSON only, one key per id: {"<id>": "<combined answer>"}`
    return callAI(prompt, 8000, 'full')
  }, () => { done = Math.min(items.length, done + MERGE_GROUP); onProgress?.(done, items.length) })
  const out: Record<string, string> = {}
  results.forEach((r, gi) => {
    if (!r) return
    for (const item of groups[gi]) {
      const v = r[item.id]
      if (typeof v === 'string' && v.trim()) out[item.id] = v.trim()
    }
  })
  return out
}
