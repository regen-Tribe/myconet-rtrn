import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { isJoiningOrAbove } from '@/core/lib/roles'
import { blocked, describe, loadBoard } from '@/modules/assistant/lib/do-actions'
import { planChanges } from '@/modules/assistant/lib/do-plan'
import { doMe } from '@/modules/assistant/lib/do-access'
import { describeGeneral, loadRefs, type GeneralAction } from '@/modules/assistant/lib/do-catalog'
import type { DoAction } from '@/modules/assistant/lib/do-actions'
import { describeContext, type PageContext } from '@/modules/assistant/lib/do-context'

const isGeneral = (a: DoAction | GeneralAction): a is GeneralAction => ['update', 'add_member', 'remove_member'].includes(a.kind)

// Ask / Do, step 1: { instruction, history?, context? } → the agent's reply and the changes it proposes, each
// described by MyCoNet in plain words and marked when this person may not make it. Nothing changes.
export async function POST(req: NextRequest) {
  const me = await doMe()
  if (!me) return NextResponse.json({ error: 'Sign in to ask the agent to do things.' }, { status: 401 })
  if (!isJoiningOrAbove(me.role)) return NextResponse.json({ error: 'Members can ask the agent to do things.' }, { status: 403 })
  const { instruction, history, context } = await req.json().catch(() => ({})) as { instruction?: string; history?: { role: string; content: string }[]; context?: PageContext }
  if (!instruction?.trim()) return NextResponse.json({ error: 'Say what you’d like done.' }, { status: 400 })
  const admin = createServiceClient()
  const board = await loadBoard(admin)
  const refs = await loadRefs(admin, board)
  try {
    // What's on their screen (v4.36.0): the page, the open task or project, a suggestion they're answering
    const seen = await describeContext(admin, context, board)
    const { reply, actions } = await planChanges(instruction.trim().slice(0, 2000), Array.isArray(history) ? history : [], board, refs, me.name, seen)
    const cards = await Promise.all(actions.map(async a => isGeneral(a)
      // General changes: the database decides when they're made; roles are the one rule worth saying first
      ? { action: a, summary: await describeGeneral(admin, a, refs), blocked: a.kind === 'update' && a.what === 'person' && ('role' in a.set || 'lead_circles' in a.set) && me.role !== 'admin' ? 'Only admins can change roles and circle leadership.' : null }
      : { action: a, summary: describe(a, board), blocked: blocked(a, board, me) }))
    return NextResponse.json({ reply, changes: cards.filter(c => c.summary) })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
