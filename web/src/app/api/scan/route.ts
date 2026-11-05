import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/core/lib/supabase/server'
import { isCircleAdmin } from '@/core/lib/roles'

function extractJSON(content: string): string | null {
  // Strip complete <think>...</think> blocks first
  let c = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  // Strip a leading </think> if the reasoning field was separate
  if (c.startsWith('</think>')) c = c.slice(8).trim()
  // Strip code fences
  if (c.startsWith('```')) c = c.replace(/^```(json)?\s*/, '').replace(/```\s*$/, '').trim()

  // Find first { and last } — same approach as the original import.jsx
  const start = c.indexOf('{')
  const end = c.lastIndexOf('}')
  if (start >= 0 && end > start) {
    const candidate = c.slice(start, end + 1)
    try { JSON.parse(candidate); return candidate } catch { /* fall through */ }
  }

  // If that failed, try the raw content (think block may have been unclosed/truncated)
  const rawStart = content.indexOf('{')
  const rawEnd = content.lastIndexOf('}')
  if (rawStart >= 0 && rawEnd > rawStart) {
    const candidate = content.slice(rawStart, rawEnd + 1)
    try { JSON.parse(candidate); return candidate } catch { /* fall through */ }
  }

  return null
}

// MiniMax-M3 reads ~600k characters in one request; the Blueprint scan sends parts of up to ~150k
const SCAN_MODEL = 'MiniMax-M3'
const MAX_PROMPT_CHARS = 200_000
// Images (logo/banner candidates from an imported PDF) arrive as small JPEG data URLs
const MAX_IMAGES = 12
const MAX_IMAGE_CHARS = 400_000

export async function POST(req: NextRequest) {
  // Only blueprint managers may spend AI credits here — this endpoint forwards a raw prompt
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in to use the AI scan.' }, { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
  if (!isCircleAdmin(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Only admins and circle leads can run the AI scan.' }, { status: 403 })
  }

  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'MINIMAX_API_KEY not configured.' }, { status: 500 })
  }

  let body: { prompt?: string; images?: unknown; maxTokens?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { prompt } = body
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json({ error: `Prompt too long (${prompt.length.toLocaleString()} characters; the limit is ${MAX_PROMPT_CHARS.toLocaleString()}).` }, { status: 413 })
  }
  const images = Array.isArray(body.images) ? body.images : []
  if (images.length > MAX_IMAGES || images.some(i => typeof i !== 'string' || !i.startsWith('data:image/') || i.length > MAX_IMAGE_CHARS)) {
    return NextResponse.json({ error: 'Images must be up to 12 small data:image URLs.' }, { status: 400 })
  }
  const maxTokens = typeof body.maxTokens === 'number' ? Math.min(Math.max(body.maxTokens, 512), 32_000) : 16_000
  const messageContent = images.length
    ? [{ type: 'text', text: prompt }, ...images.map(url => ({ type: 'image_url', image_url: { url } }))]
    : prompt

  const callMiniMax = async () => fetch('https://api.minimax.io/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: SCAN_MODEL,
      messages: [{ role: 'user', content: messageContent }],
      max_completion_tokens: maxTokens,
      temperature: 0.3,
    }),
  })

  let minimaxRes: Response
  try {
    minimaxRes = await callMiniMax()
    // MiniMax 524 = their gateway timed out — wait 3s and retry once
    if (minimaxRes.status === 524) {
      await new Promise(r => setTimeout(r, 3000))
      minimaxRes = await callMiniMax()
    }
  } catch (e) {
    return NextResponse.json({ error: `Network error: ${(e as Error).message}` }, { status: 502 })
  }

  const rawText = await minimaxRes.text()

  if (minimaxRes.status === 524) {
    return NextResponse.json({ error: 'MiniMax is taking too long to respond. Try a smaller document or try again in a moment.' }, { status: 504 })
  }

  if (minimaxRes.status === 429) {
    return NextResponse.json({ error: 'MiniMax rate limit reached. Please try again in a few hours.' }, { status: 429 })
  }

  if (!minimaxRes.ok) {
    let detail = rawText.slice(0, 400)
    try { detail = (JSON.parse(rawText) as { error?: { message?: string } })?.error?.message ?? detail } catch { /* raw */ }
    return NextResponse.json({ error: `MiniMax error: ${detail}` }, { status: 502 })
  }

  let data: { choices?: { message?: { content?: string } }[] }
  try {
    data = JSON.parse(rawText)
  } catch {
    return NextResponse.json({ error: `Non-JSON response from MiniMax: ${rawText.slice(0, 200)}` }, { status: 502 })
  }

  const content = data.choices?.[0]?.message?.content ?? ''
  if (!content) {
    return NextResponse.json({ error: `Empty response from MiniMax. Keys: ${JSON.stringify(Object.keys(data))}` }, { status: 502 })
  }

  const result = extractJSON(content)
  if (!result) {
    return NextResponse.json(
      { error: "We're working on our scanning process, thanks for the patience. Try again later please." },
      { status: 502 }
    )
  }

  return NextResponse.json({ result })
}
