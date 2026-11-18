import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { isJoiningOrAbove } from '@/core/lib/roles'
import { blocked, describe, loadBoard } from '@/modules/assistant/lib/do-actions'
import { planChanges } from '@/modules/assistant/lib/do-plan'
import { doMe } from '@/modules/assistant/lib/do-access'

// Ask / Do, step 1: { instruction, history? } → the agent's reply and the changes it proposes, each
// described by MyCoNet in plain words and marked when this person may not make it. Nothing changes.
export async function POST(req: NextRequest) {
  const me = await doMe()
  if (!me) return NextResponse.json({ error: 'Sign in to ask the agent to do things.' }, { status: 401 })
  if (!isJoiningOrAbove(me.role)) return NextResponse.json({ error: 'Members can ask the agent to do things.' }, { status: 403 })
  const { instruction, history } = await req.json().catch(() => ({})) as { instruction?: string; history?: { role: string; content: string }[] }
  if (!instruction?.trim()) return NextResponse.json({ error: 'Say what you’d like done.' }, { status: 400 })
  const board = await loadBoard(createServiceClient())
  try {
    const { reply, actions } = await planChanges(instruction.trim().slice(0, 2000), Array.isArray(history) ? history : [], board, me.name)
    const cards = actions.map(a => ({ action: a, summary: describe(a, board), blocked: blocked(a, board, me) })).filter(c => c.summary)
    return NextResponse.json({ reply, changes: cards })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
