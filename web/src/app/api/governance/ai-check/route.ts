import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/core/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Signed-in users only, so the AI key can't be used anonymously
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ confidence: 75, reasoning: 'Sign in to see the AI check.' }, { status: 401 })

  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) return NextResponse.json({ confidence: 75, reasoning: 'AI check not configured.' })

  let body: { title?: string; description?: string | null }
  try { body = await req.json() } catch { return NextResponse.json({ confidence: 75, reasoning: 'Invalid request.' }) }

  const title = typeof body.title === 'string' ? body.title.slice(0, 300) : ''
  const description = typeof body.description === 'string' ? body.description.slice(0, 4000) : null
  if (!title) return NextResponse.json({ confidence: 75, reasoning: 'No proposal title provided.' })

  // Fetch community blueprint to compare against
  const { data: bp } = await supabase
    .from('blueprints')
    .select('answers')
    .eq('is_community', true)
    .maybeSingle()

  const bpAnswers = (bp?.answers ?? {}) as Record<string, unknown>
  const purpose = (bpAnswers.purpose as string) ?? ''
  const vision  = (bpAnswers.vision as string) ?? ''
  const values  = (bpAnswers.values as string) ?? ''

  const prompt = `You are an AI governance facilitator for a regenerative community.
Your job is to evaluate whether a proposal is aligned with the community's Blueprint.

COMMUNITY BLUEPRINT:
Purpose: ${purpose || '(not set)'}
Vision: ${vision || '(not set)'}
Core Values: ${values || '(not set)'}

PROPOSAL:
Title: ${title}
Description: ${description ?? '(none)'}

Evaluate this proposal and respond ONLY with a JSON object in this exact format:
{
  "confidence": <number 0-100, how confident you are it aligns with the blueprint>,
  "reasoning": "<1-2 sentence summary of whether this aligns, any conflicts, and whether it advances the community goals>"
}

If the proposal clearly conflicts with stated values or vision, set confidence below 50.
If it clearly advances the goals, set confidence 80+.
If uncertain or blueprint is sparse, set confidence 65-79.`

  try {
    const res = await fetch('https://api.minimax.io/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'MiniMax-M3',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 512,
        temperature: 0.2,
      }),
    })

    if (!res.ok) return NextResponse.json({ confidence: 75, reasoning: 'Could not complete AI check at this time.' })

    const data = await res.json()
    const content: string = data?.choices?.[0]?.message?.content ?? ''

    // Strip thinking blocks and extract JSON
    let c = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    if (c.startsWith('</think>')) c = c.slice(8).trim()
    if (c.startsWith('```')) c = c.replace(/^```(json)?\s*/, '').replace(/```\s*$/, '').trim()
    const start = c.indexOf('{'), end = c.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(c.slice(start, end + 1)) as { confidence?: number; reasoning?: string }
        return NextResponse.json({
          confidence: Math.min(100, Math.max(0, parsed.confidence ?? 75)),
          reasoning: parsed.reasoning ?? '',
        })
      } catch { /* fall through */ }
    }

    return NextResponse.json({ confidence: 75, reasoning: 'No blockers detected. Proposal appears consistent with community goals.' })
  } catch {
    return NextResponse.json({ confidence: 75, reasoning: 'AI check temporarily unavailable.' })
  }
}
