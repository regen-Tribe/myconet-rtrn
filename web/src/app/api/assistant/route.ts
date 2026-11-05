import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/core/lib/supabase/server'
import { COMMUNITY_NAME } from '@/core/lib/instance'
import { assistantPrompt, blueprintText, sourcesText, type LibraryDoc } from '@/modules/assistant/lib/context'

// Portal assistant: answers from the community's Blueprint and documents (MiniMax, streamed).
// Visitors get FREE_QUESTIONS before signing in; signed-in people a daily cap.
const FREE_QUESTIONS = 2
const DAILY_CAP = 200
const MAX_TURNS = 8
const MAX_MESSAGE_CHARS = 2000

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'The assistant is not set up yet (no AI key).' }, { status: 500 })

  let body: { messages?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
      !!m && typeof m === 'object' && ['user', 'assistant'].includes((m as { role: string }).role) && typeof (m as { content: unknown }).content === 'string')
    .slice(-MAX_TURNS)
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Ask a question.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Count this question: visitors per hashed IP (30 days), people per account (24 h)
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const key = user ? `user:${user.id}` : `anon:${await sha256(`${COMMUNITY_NAME}|${ip}`)}`
  const { data: count, error: countErr } = await supabase.rpc('assistant_count_question', { p_key: key, p_window_hours: user ? 24 : 720 })
  if (countErr) return NextResponse.json({ error: 'The assistant is not available right now.' }, { status: 503 })
  if (!user && (count as number) > FREE_QUESTIONS) {
    return NextResponse.json({ error: `Sign in to keep asking — visitors get ${FREE_QUESTIONS} questions.`, needLogin: true }, { status: 401 })
  }
  if (user && (count as number) > DAILY_CAP) {
    return NextResponse.json({ error: "You've reached today's question limit. Try again tomorrow." }, { status: 429 })
  }
  const remaining = user ? null : Math.max(0, FREE_QUESTIONS - (count as number))

  // RLS returns only what this person may see: leads also get sensitive documents
  const [{ data: bp }, { data: docs }] = await Promise.all([
    supabase.from('blueprints').select('answers').eq('is_community', true).maybeSingle(),
    supabase.from('community_documents').select('title, visibility, content').order('created_at'),
  ])
  const conversation = messages.map(m => m.content).join('\n')
  const sources = sourcesText(blueprintText((bp?.answers ?? null) as Record<string, unknown> | null), (docs ?? []) as LibraryDoc[], conversation)

  const upstream = await fetch('https://api.minimax.io/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      // The fast model with light reasoning: answers start in a second or two
      model: 'MiniMax-M3.1-Flash',
      reasoning_effort: 'low',
      stream: true,
      messages: [{ role: 'system', content: assistantPrompt(COMMUNITY_NAME, sources) }, ...messages],
      max_completion_tokens: 2000,
      temperature: 0.3,
    }),
  }).catch(() => null)
  if (!upstream?.ok || !upstream.body) {
    return NextResponse.json({ error: 'The assistant is busy. Try again in a moment.' }, { status: 502 })
  }

  // MiniMax sends server-sent events; pass on just the answer text
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''
  let inThink = false
  const stream = upstream.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const data = line.startsWith('data:') ? line.slice(5).trim() : ''
        if (!data || data === '[DONE]') continue
        try {
          let text: string = JSON.parse(data).choices?.[0]?.delta?.content ?? ''
          // Some models put their reasoning inline in <think> tags: drop it, even across chunks
          let out = ''
          while (text) {
            const i = text.indexOf(inThink ? '</think>' : '<think>')
            if (i < 0) { if (!inThink) out += text; break }
            if (!inThink) out += text.slice(0, i)
            text = text.slice(i + (inThink ? 8 : 7))
            inThink = !inThink
          }
          if (out) controller.enqueue(encoder.encode(out))
        } catch { /* partial or keep-alive line */ }
      }
    },
  }))

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(remaining != null ? { 'X-Assistant-Remaining': String(remaining) } : {}),
    },
  })
}
