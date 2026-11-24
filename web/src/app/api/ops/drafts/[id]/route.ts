import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/core/lib/supabase/server'
import { createServiceClient } from '@/core/lib/supabase/service'

// Declining a draft, with an Undo that lasts (v4.130.0: Oscar, "after something is declined… leave the undo button until
// the page is refreshed"). Declining deletes the task, as before (a declined draft stays gone: its meeting line keeps
// its link with no task, so the meeting doesn't draft it again). Now the whole task is kept in agent_actions first,
// with its meeting links and followers, so Undo can put it back exactly.
//   { action: 'decline' }            → deletes it with the person's own session (the database decides who may); returns the log id
//   { action: 'restore', log: id }   → puts back what that person declined
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const mine = await createClient()
  const { data: { user } } = await mine.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const { action, log } = await req.json().catch(() => ({})) as { action?: string; log?: string }
  const admin = createServiceClient()

  if (action === 'decline') {
    const [{ data: row }, { data: links }, { data: subs }] = await Promise.all([
      admin.from('deliverables').select('*').eq('id', id).maybeSingle(),
      admin.from('meeting_action_links').select('meeting_id, item_key').eq('deliverable_id', id),
      admin.from('deliverable_subscriptions').select('*').eq('deliverable_id', id),
    ])
    if (!row) return NextResponse.json({ error: 'It’s already gone.' }, { status: 404 })
    // As the person: RLS decides who may delete it (a lead of its circle or project, or an admin)
    const { data: gone, error } = await mine.from('deliverables').delete().eq('id', id).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!gone?.length) return NextResponse.json({ error: 'You can’t decline this one.' }, { status: 403 })
    const { data: logged } = await admin.from('agent_actions').insert({
      actor: 'person', requested_by: user.id, action: 'draft_declined', target_table: 'deliverables', target_id: id,
      meeting_id: row.source_meeting_id ?? null, detail: { circle: row.circle ?? null, title: row.title, dropped: row, links: links ?? [], subs: subs ?? [] },
    }).select('id').single()
    return NextResponse.json({ ok: true, log: logged?.id ?? null })
  }

  if (action === 'restore' && log) {
    const { data: a } = await admin.from('agent_actions').select('id, detail, undone_at').eq('id', log)
      .eq('action', 'draft_declined').eq('requested_by', user.id).eq('target_id', id).maybeSingle()
    if (!a || a.undone_at) return NextResponse.json({ error: 'Nothing to undo.' }, { status: 409 })
    const d = a.detail as { dropped: Record<string, unknown>; links?: { meeting_id: string; item_key: string }[]; subs?: Record<string, unknown>[] }
    const { error } = await admin.from('deliverables').insert(d.dropped)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const l of d.links ?? []) await admin.from('meeting_action_links').update({ deliverable_id: id }).eq('meeting_id', l.meeting_id).eq('item_key', l.item_key)
    if (d.subs?.length) await admin.from('deliverable_subscriptions').insert(d.subs)
    await admin.from('agent_actions').update({ undone_at: new Date().toISOString(), undone_by: user.id }).eq('id', a.id)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
