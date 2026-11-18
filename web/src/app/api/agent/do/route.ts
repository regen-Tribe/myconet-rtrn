import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/core/lib/supabase/service'
import { blocked, circleOf, describe, execute, loadBoard, type DoAction } from '@/modules/assistant/lib/do-actions'
import { doMe } from '@/modules/assistant/lib/do-access'
import { requestBoardReview } from '@/modules/m07-ops/lib/board-review'

// Ask / Do, step 2: the person confirmed the card → { actions, instruction } are made. The board is read
// again and every change checked again with this person's rights (nothing from the card is trusted);
// each is logged in agent_actions with what's needed to undo it.
export async function POST(req: NextRequest) {
  const me = await doMe()
  if (!me) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const { actions, instruction } = await req.json().catch(() => ({})) as { actions?: DoAction[]; instruction?: string }
  if (!Array.isArray(actions) || !actions.length) return NextResponse.json({ error: 'Nothing to do.' }, { status: 400 })
  const admin = createServiceClient()
  const results: { summary: string; ok: boolean; error?: string; undo?: string }[] = []
  const circles = new Set<string>()
  // Read once; execute() keeps it in step with each change (a Worker may make only 50 outside calls)
  const board = await loadBoard(admin)
  for (const a of actions.slice(0, 10)) {
    const summary = describe(a, board)
    if (!summary) { results.push({ summary: 'A change that no longer fits the board', ok: false, error: 'Skipped' }); continue }
    const no = blocked(a, board, me)
    if (no) { results.push({ summary, ok: false, error: no }); continue }
    const circle = circleOf(a, board)
    const r = await execute(admin, a, board, me)
    let undo: string | undefined
    if (r.rows.length || r.created.length) {
      const { data } = await admin.from('agent_actions').insert({
        actor: 'agent-do', requested_by: me.id, action: `do_${a.kind}`,
        target_table: r.created[0]?.table ?? r.rows[0]?.table ?? null, target_id: r.created[0]?.id ?? r.rows[0]?.id ?? null,
        detail: { circle, summary, instruction: instruction?.slice(0, 500) ?? null, rows: r.rows, created: r.created },
      }).select('id').single()
      undo = data?.id
    }
    if (circle) circles.add(circle)
    results.push({ summary, ok: !r.error, ...(r.error ? { error: r.error } : {}), undo })
  }
  // Keep the circles' board notes current
  await requestBoardReview(admin, [...circles])
  return NextResponse.json({ results })
}
