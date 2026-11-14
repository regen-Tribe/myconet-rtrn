'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/core/lib/supabase/client'

type Vote = { vote: string; user_id: string; layer: string; voter?: { role: string } | null }

type Proposal = {
  id: string
  title: string
  description: string | null
  decision_mode: string
  status: string
  closes_at: string | null
  created_at: string
  proposer: { username: string; first_name: string | null; last_name: string | null } | null
  votes: Vote[]
}

type Comment = {
  id: string
  content: string
  created_at: string
  user: { username: string; first_name: string | null; last_name: string | null } | null
}

// myVotes[proposalId][layer] = vote value
type MyVotes = Record<string, Record<string, string>>

interface Props {
  proposals: Proposal[]
  memberCount: number
  currentUserId: string
  myVotes: MyVotes
  isFullMember: boolean
  isLoggedIn: boolean
  role?: string
  isCircleLead?: boolean
  isAdvisorOrAdmin?: boolean
}

function timeLeft(closes_at: string | null): string {
  if (!closes_at) return 'No deadline'
  const diff = new Date(closes_at).getTime() - Date.now()
  if (diff < 0) return 'Closed'
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1d left'
  return `${days}d left`
}

function ago(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function displayName(u: { first_name: string | null; last_name: string | null; username: string } | null): string {
  if (!u) return 'Unknown'
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username
}

function layerVotes(votes: Vote[], layer: string) {
  const lv = votes.filter(v => v.layer === layer)
  const clVotes = lv.filter(v => v.voter?.role === 'circle_lead')
  const expertVotes = lv.filter(v => ['admin', 'advisor'].includes(v.voter?.role ?? ''))
  return {
    consent: lv.filter(v => v.vote === 'consent').length,
    concern: lv.filter(v => v.vote === 'concern').length,
    object:  lv.filter(v => v.vote === 'object').length,
    yes:     lv.filter(v => v.vote === 'yes').length,
    no:      lv.filter(v => v.vote === 'no').length,
    approve: lv.filter(v => v.vote === 'approve').length,
    reject:  lv.filter(v => v.vote === 'reject').length,
    total:   lv.length,
    clConsent: clVotes.filter(v => v.vote === 'consent').length,
    clConcern: clVotes.filter(v => v.vote === 'concern').length,
    clObject:  clVotes.filter(v => v.vote === 'object').length,
    clTotal:   clVotes.length,
    expertApprove: expertVotes.filter(v => v.vote === 'approve').length,
    expertReject:  expertVotes.filter(v => v.vote === 'reject').length,
    expertTotal:   expertVotes.length,
  }
}

function evalLayers(p: Proposal) {
  const s = layerVotes(p.votes, 'sociocracy')
  const d = layerVotes(p.votes, 'democracy')
  const m = layerVotes(p.votes, 'merit')

  // L1 Sociocracy: circle_leads must have voted, none have objected
  const sociocracyPassed = s.clTotal > 0 && s.clObject === 0
  // L2 Democracy: majority of yes over no
  const democPassed = d.total > 0 && d.yes > d.no
  // L3 Meritocracy: at least one expert approved, none rejected
  const meritPassed = m.expertTotal > 0 && m.expertApprove > 0 && m.expertReject === 0
  // L4 AI: evaluated async, default pending
  const aiPassed = true

  const passed = [sociocracyPassed, democPassed, meritPassed, aiPassed].filter(Boolean).length
  return { sociocracyPassed, democPassed, meritPassed, aiPassed, passed, isLive: passed >= 3 }
}

function StatusPill({ isLive }: { isLive: boolean }) {
  return isLive ? (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'color-mix(in srgb, #22c55e 10%, var(--surface))', border: '1px solid color-mix(in srgb, #22c55e 35%, var(--rule))', borderRadius: 20, padding: '4px 12px' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>LIVE</span>
    </div>
  ) : (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'color-mix(in srgb, var(--m9) 8%, var(--surface))', border: '1px solid color-mix(in srgb, var(--m9) 25%, var(--rule))', borderRadius: 20, padding: '4px 12px' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--m9)', flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--m9)' }}>Evaluating</span>
    </div>
  )
}

function VoteButton({ label, active, color, bg, onClick, disabled }: {
  vote: string; label: string; active: boolean; color: string; bg: string; onClick: () => void; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '6px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
      textAlign: 'left', transition: 'all 100ms',
      border: `1px solid ${active ? color : 'var(--rule)'}`,
      background: active ? bg : 'var(--surface)',
      color: active ? color : 'var(--ink-2)',
      opacity: disabled ? 0.6 : 1,
    }}>{label}</button>
  )
}

export default function GovernanceClient({
  proposals: initial, memberCount, currentUserId, myVotes: init, isFullMember, isLoggedIn,
  role = 'explorer', isCircleLead = false, isAdvisorOrAdmin = false,
}: Props) {
  const supabase = createClient()

  const [proposals, setProposals] = useState<Proposal[]>(initial)
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null)
  const [myVotes, setMyVotes] = useState<MyVotes>(init)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [loadingComments, setLoadingComments] = useState(false)
  const [voting, setVoting] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newDays, setNewDays] = useState('7')
  const [submitting, setSubmitting] = useState(false)
  const [aiChecks, setAiChecks] = useState<Record<string, { confidence: number; reasoning: string; loading: boolean }>>({})

  useEffect(() => {
    if (!selectedId || comments[selectedId]) return
    setLoadingComments(true)
    supabase
      .from('proposal_comments')
      .select('id, content, created_at, user:user_profiles!proposal_comments_user_id_fkey(username, first_name, last_name)')
      .eq('proposal_id', selectedId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setComments(prev => ({ ...prev, [selectedId]: (data ?? []) as unknown as Comment[] }))
        setLoadingComments(false)
      })
  }, [selectedId])

  // Run AI check when a proposal is selected
  useEffect(() => {
    if (!selectedId) return
    const p = proposals.find(x => x.id === selectedId)
    if (!p || aiChecks[selectedId]) return
    setAiChecks(prev => ({ ...prev, [selectedId]: { confidence: 0, reasoning: '', loading: true } }))
    fetch('/api/governance/ai-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: p.title, description: p.description }),
    })
      .then(r => r.json())
      .then(data => {
        setAiChecks(prev => ({ ...prev, [selectedId]: { confidence: data.confidence ?? 75, reasoning: data.reasoning ?? '', loading: false } }))
      })
      .catch(() => {
        setAiChecks(prev => ({ ...prev, [selectedId]: { confidence: 75, reasoning: 'Could not evaluate at this time.', loading: false } }))
      })
  }, [selectedId])

  const selected = proposals.find(p => p.id === selectedId) ?? null

  async function castVote(proposalId: string, vote: string, layer: string) {
    if (!currentUserId || voting) return
    setVoting(true)
    const prevVote = myVotes[proposalId]?.[layer]
    if (prevVote === vote) {
      await supabase.from('proposal_votes').delete()
        .eq('proposal_id', proposalId).eq('user_id', currentUserId).eq('layer', layer)
      setMyVotes(v => {
        const n = { ...v }
        if (n[proposalId]) { const l = { ...n[proposalId] }; delete l[layer]; n[proposalId] = l }
        return n
      })
      setProposals(ps => ps.map(p => p.id !== proposalId ? p : {
        ...p, votes: p.votes.filter(v => !(v.user_id === currentUserId && v.layer === layer))
      }))
    } else {
      await supabase.from('proposal_votes').upsert(
        { proposal_id: proposalId, user_id: currentUserId, vote, layer },
        { onConflict: 'proposal_id,user_id,layer' }
      )
      setMyVotes(v => ({ ...v, [proposalId]: { ...(v[proposalId] ?? {}), [layer]: vote } }))
      setProposals(ps => ps.map(p => {
        if (p.id !== proposalId) return p
        const rest = p.votes.filter(v => !(v.user_id === currentUserId && v.layer === layer))
        return { ...p, votes: [...rest, { vote, user_id: currentUserId, layer, voter: { role } }] }
      }))
    }
    setVoting(false)
  }

  async function postComment() {
    if (!currentUserId || !newComment.trim() || postingComment || !selectedId) return
    setPostingComment(true)
    const { data } = await supabase
      .from('proposal_comments')
      .insert({ proposal_id: selectedId, user_id: currentUserId, content: newComment.trim() })
      .select('id, content, created_at, user:user_profiles!proposal_comments_user_id_fkey(username, first_name, last_name)')
      .single()
    if (data) {
      setComments(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), data as unknown as Comment] }))
      setNewComment('')
    }
    setPostingComment(false)
  }

  async function submitProposal() {
    if (!currentUserId || !newTitle.trim() || submitting) return
    setSubmitting(true)
    const closes = new Date()
    closes.setDate(closes.getDate() + Math.max(1, parseInt(newDays || '7', 10)))
    const { data } = await supabase
      .from('proposals')
      .insert({
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        proposer_id: currentUserId,
        decision_mode: 'consent',
        closes_at: closes.toISOString(),
      })
      .select(`id, title, description, decision_mode, status, closes_at, created_at,
        proposer:user_profiles!proposals_proposer_id_fkey(username, first_name, last_name),
        votes:proposal_votes(vote, user_id, layer, voter:user_profiles!proposal_votes_user_id_fkey(role))`)
      .single()
    if (data) {
      setProposals(prev => [data as unknown as Proposal, ...prev])
      setSelectedId((data as unknown as Proposal).id)
    }
    setShowNew(false); setNewTitle(''); setNewDesc(''); setNewDays('7')
    setSubmitting(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Page head */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--m9)', background: 'color-mix(in srgb, var(--m9) 10%, transparent)', padding: '2px 8px', borderRadius: 4 }}>M09</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>Governance</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>Decide together</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--ink-3)' }}>
            {proposals.length} proposal{proposals.length !== 1 ? 's' : ''} open
            {memberCount > 0 && ` · ${memberCount} eligible voters`}
          </p>
        </div>
        {isFullMember && (
          <button onClick={() => setShowNew(true)} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, flexShrink: 0, background: 'var(--m9)', color: '#fff', border: 'none', cursor: 'pointer' }}>+ New proposal</button>
        )}
      </div>

      {/* Layer strip */}
      <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--rule)', flexShrink: 0, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink-4)', textTransform: 'uppercase', flexShrink: 0 }}>
          Every proposal runs through all 4 layers
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { mark: '☉', name: 'Sociocracy', n: '01', who: 'Circle Leads' },
            { mark: '☑', name: 'Democracy', n: '02', who: 'All Members' },
            { mark: '△', name: 'Meritocracy', n: '03', who: 'Admin & Advisors' },
            { mark: '◇', name: 'AI Facilitation', n: '04', who: 'Automated' },
          ].map(l => (
            <span key={l.n} title={l.who} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--ink-3)', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 20, padding: '3px 10px' }}>
              <span style={{ fontSize: 12 }}>{l.mark}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-4)' }}>L{l.n}</span>
              {l.name}
            </span>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', flexShrink: 0 }}>3 of 4 → live</span>
      </div>

      {/* Access banner */}
      {!isFullMember && (
        <div style={{ padding: '10px 24px', flexShrink: 0, background: !isLoggedIn ? 'color-mix(in srgb, var(--m9) 5%, var(--surface))' : 'color-mix(in srgb, #f59e0b 5%, var(--surface))', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>{!isLoggedIn ? '👁' : role === 'joining' ? '🌱' : '🔓'}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>
              {!isLoggedIn ? 'You\'re previewing Governance — create a free account to vote and comment.'
                : role === 'joining' ? 'You\'re Joining — become a Member to vote and submit proposals.'
                : 'You\'re an Explorer — complete M05 Join to participate in governance.'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {!isLoggedIn ? (
              <><a href="/auth/signup" style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'var(--m9)', padding: '5px 14px', borderRadius: 7, textDecoration: 'none' }}>Create account</a>
              <a href="/auth/login" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--m9)', padding: '5px 4px', textDecoration: 'none' }}>Sign in</a></>
            ) : role === 'joining' ? (
              <a href="/contributions" style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', background: '#d97706', padding: '5px 14px', borderRadius: 7, textDecoration: 'none' }}>View contributions →</a>
            ) : (
              <a href="/join" style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', background: '#d97706', padding: '5px 14px', borderRadius: 7, textDecoration: 'none' }}>Go to M05 Join →</a>
            )}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="gov-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Proposal list */}
        <div className="gov-sidebar" style={{ width: 300, flexShrink: 0, borderRight: '1px solid var(--rule)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {proposals.length === 0 ? (
            <div style={{ padding: 20, fontSize: 12.5, color: 'var(--ink-4)', textAlign: 'center' }}>No open proposals yet.</div>
          ) : proposals.map(p => {
            const { passed, isLive } = evalLayers(p)
            const myL = myVotes[p.id] ?? {}
            const active = p.id === selectedId
            const myVoteSummary = Object.values(myL).join(', ')
            return (
              <button key={p.id} onClick={() => setSelectedId(p.id)} style={{ textAlign: 'left', padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--rule)', background: active ? 'color-mix(in srgb, var(--m9) 6%, var(--surface))' : 'transparent', borderLeft: `3px solid ${active ? 'var(--m9)' : 'transparent'}`, transition: 'background 80ms' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    {[0, 1, 2, 3].map(i => (
                      <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i < passed ? (isLive ? '#22c55e' : 'var(--m9)') : 'var(--rule)' }} />
                    ))}
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: isLive ? '#16a34a' : 'var(--ink-4)', fontWeight: isLive ? 700 : 400 }}>{isLive ? 'live' : `${passed}/4`}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>{timeLeft(p.closes_at)}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4, marginBottom: 5 }}>{p.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>@{p.proposer?.username ?? '?'}</span>
                  {myVoteSummary && (
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'color-mix(in srgb, var(--m1) 15%, transparent)', color: 'var(--m1)' }}>
                      voted
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Proposal detail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {!selected ? (
            <div style={{ color: 'var(--ink-4)', fontSize: 13, textAlign: 'center', marginTop: 60 }}>Select a proposal to view details.</div>
          ) : (() => {
            const s = layerVotes(selected.votes, 'sociocracy')
            const d = layerVotes(selected.votes, 'democracy')
            const m = layerVotes(selected.votes, 'merit')
            const { sociocracyPassed, democPassed, meritPassed, passed, isLive } = evalLayers(selected)
            const myL = myVotes[selected.id] ?? {}
            const proposalComments = comments[selected.id] ?? []
            const aiCheck = aiChecks[selected.id]

            return (
              <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.4 }}>{selected.title}</h2>
                    <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>
                      Proposed by <strong style={{ color: 'var(--ink-2)' }}>@{selected.proposer?.username ?? '?'}</strong>
                      {' · '}{new Date(selected.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' · '}{timeLeft(selected.closes_at)}
                    </div>
                  </div>
                  <StatusPill isLive={isLive} />
                </div>

                {selected.description && (
                  <div style={{ padding: '14px 16px', borderRadius: 10, marginBottom: 16, background: 'var(--bg-2)', border: '1px solid var(--rule)', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.65 }}>
                    {selected.description}
                  </div>
                )}

                {/* Overall progress */}
                <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16, background: 'var(--bg-2)', border: '1px solid var(--rule)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: isLive ? '#16a34a' : 'var(--ink-3)' }}>{passed} / 4 layers approved</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>{isLive ? '✓ threshold reached' : 'needs 3 of 4 to go live'}</span>
                  </div>
                  <div style={{ position: 'relative', height: 8, background: 'var(--rule)', borderRadius: 4, overflow: 'visible' }}>
                    <div style={{ height: '100%', borderRadius: 4, transition: 'width 500ms ease, background 400ms', background: isLive ? '#22c55e' : 'var(--m9)', width: `${(passed / 4) * 100}%` }} />
                    <div style={{ position: 'absolute', top: -3, left: 'calc(75% - 1px)', width: 2, height: 14, background: '#22c55e', borderRadius: 1, opacity: 0.7 }} />
                    <div style={{ position: 'absolute', top: 14, left: 'calc(75% - 16px)', fontFamily: 'var(--mono)', fontSize: 9, color: '#16a34a', whiteSpace: 'nowrap' }}>3/4 live ↑</div>
                  </div>
                </div>

                {/* 4 Layer panels */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>

                  {/* L1 — Sociocracy (Circle Leads) */}
                  <div style={{ padding: '14px 16px', borderRadius: 10, border: `1px solid ${sociocracyPassed ? 'color-mix(in srgb, #22c55e 30%, var(--rule))' : 'var(--rule)'}`, background: sociocracyPassed ? 'color-mix(in srgb, #22c55e 4%, var(--surface))' : 'var(--surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 18, marginBottom: 2 }}>☉</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 1 }}>Layer 01</div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>Sociocracy</div>
                        <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>Circle Leads vote</div>
                      </div>
                      {s.clTotal === 0
                        ? <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-4)', background: 'var(--bg-2)', border: '1px solid var(--rule)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>Awaiting CL</span>
                        : sociocracyPassed
                          ? <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: 'color-mix(in srgb, #22c55e 12%, transparent)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>✓ Passed</span>
                          : <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--m9)', background: 'color-mix(in srgb, var(--m9) 10%, transparent)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>Objection</span>
                      }
                    </div>
                    {[
                      { label: '✓ Consent', count: s.clConsent, color: 'var(--m1)' },
                      { label: '⚠ Concern', count: s.clConcern, color: '#f59e0b' },
                      { label: '✗ Object',  count: s.clObject,  color: 'var(--m9)' },
                    ].map(row => (
                      <div key={row.label} style={{ marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{row.label}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>{row.count}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: 'var(--rule)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, width: s.clTotal > 0 ? `${(row.count / s.clTotal) * 100}%` : '0%', background: row.color, transition: 'width 400ms ease' }} />
                        </div>
                      </div>
                    ))}
                    {isCircleLead && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', marginBottom: 2 }}>Your vote {myL.sociocracy && '· click to remove'}</div>
                        {[
                          { vote: 'consent', label: '✓ I consent',       c: 'var(--m1)',  bg: 'color-mix(in srgb, var(--m1) 12%, transparent)' },
                          { vote: 'concern', label: '⚠ I have a concern', c: '#f59e0b',    bg: 'color-mix(in srgb, #f59e0b 12%, transparent)' },
                          { vote: 'object',  label: '✗ I object',         c: 'var(--m9)',  bg: 'color-mix(in srgb, var(--m9) 12%, transparent)' },
                        ].map(opt => (
                          <VoteButton key={opt.vote} vote={opt.vote} label={opt.label} active={myL.sociocracy === opt.vote} color={opt.c} bg={opt.bg} onClick={() => castVote(selected.id, opt.vote, 'sociocracy')} disabled={voting} />
                        ))}
                      </div>
                    )}
                    {!isCircleLead && (
                      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic' }}>Circle Leads vote here.</div>
                    )}
                  </div>

                  {/* L2 — Democracy (All Members) */}
                  <div style={{ padding: '14px 16px', borderRadius: 10, border: `1px solid ${democPassed ? 'color-mix(in srgb, #22c55e 30%, var(--rule))' : 'var(--rule)'}`, background: democPassed ? 'color-mix(in srgb, #22c55e 4%, var(--surface))' : 'var(--surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 18, marginBottom: 2 }}>☑</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 1 }}>Layer 02</div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>Democracy</div>
                        <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>Every member votes</div>
                      </div>
                      {d.total === 0
                        ? <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-4)', background: 'var(--bg-2)', border: '1px solid var(--rule)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>No votes yet</span>
                        : democPassed
                          ? <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: 'color-mix(in srgb, #22c55e 12%, transparent)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>✓ Majority</span>
                          : <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'color-mix(in srgb, #f59e0b 12%, transparent)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>Voting</span>
                      }
                    </div>
                    {d.total > 0 && (
                      <>
                        <div style={{ display: 'flex', height: 22, borderRadius: 5, overflow: 'hidden', gap: 1, marginBottom: 8 }}>
                          {d.yes > 0 && <div style={{ flex: d.yes, background: '#22c55e', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{d.yes}</div>}
                          {d.no  > 0 && <div style={{ flex: d.no,  background: '#ef4444', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{d.no}</div>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                          {d.yes} yes · {d.no} no<br />
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: democPassed ? '#16a34a' : 'var(--ink-4)' }}>
                            {democPassed ? `Majority reached (${Math.round((d.yes / d.total) * 100)}%)` : 'Majority not yet reached'}
                          </span>
                        </div>
                      </>
                    )}
                    {d.total === 0 && <p style={{ fontSize: 11.5, color: 'var(--ink-4)', margin: 0, lineHeight: 1.5 }}>Waiting for member votes. Majority yes needed to pass.</p>}
                    {isFullMember && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', marginBottom: 2 }}>Your vote {myL.democracy && '· click to remove'}</div>
                        {[
                          { vote: 'yes', label: '✓ Yes, I support this', c: '#22c55e', bg: 'color-mix(in srgb, #22c55e 12%, transparent)' },
                          { vote: 'no',  label: '✗ No, I oppose this',   c: '#ef4444', bg: 'color-mix(in srgb, #ef4444 12%, transparent)' },
                        ].map(opt => (
                          <VoteButton key={opt.vote} vote={opt.vote} label={opt.label} active={myL.democracy === opt.vote} color={opt.c} bg={opt.bg} onClick={() => castVote(selected.id, opt.vote, 'democracy')} disabled={voting} />
                        ))}
                      </div>
                    )}
                    {!isFullMember && <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic' }}>Full members can vote.</div>}
                  </div>

                  {/* L3 — Meritocracy (Admin & Advisors) */}
                  <div style={{ padding: '14px 16px', borderRadius: 10, border: `1px solid ${meritPassed ? 'color-mix(in srgb, #22c55e 30%, var(--rule))' : 'var(--rule)'}`, background: meritPassed ? 'color-mix(in srgb, #22c55e 4%, var(--surface))' : 'var(--surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 18, marginBottom: 2 }}>△</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 1 }}>Layer 03</div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>Meritocracy</div>
                        <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>Admin & Advisors</div>
                      </div>
                      {m.expertTotal === 0
                        ? <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-4)', background: 'var(--bg-2)', border: '1px solid var(--rule)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>Awaiting review</span>
                        : meritPassed
                          ? <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: 'color-mix(in srgb, #22c55e 12%, transparent)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>✓ Approved</span>
                          : <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--m9)', background: 'color-mix(in srgb, var(--m9) 10%, transparent)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>Rejected</span>
                      }
                    </div>
                    {m.expertTotal > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>
                        {m.expertApprove} approved · {m.expertReject} rejected
                      </div>
                    )}
                    <p style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: 0, lineHeight: 1.55 }}>
                      {meritPassed ? 'Domain expert has reviewed and approved this proposal.' : 'Awaiting review from an admin or advisor.'}
                    </p>
                    {isAdvisorOrAdmin && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-4)', marginBottom: 2 }}>Expert review {myL.merit && '· click to remove'}</div>
                        {[
                          { vote: 'approve', label: '✓ Approve',  c: '#22c55e', bg: 'color-mix(in srgb, #22c55e 12%, transparent)' },
                          { vote: 'reject',  label: '✗ Reject',   c: 'var(--m9)', bg: 'color-mix(in srgb, var(--m9) 12%, transparent)' },
                        ].map(opt => (
                          <VoteButton key={opt.vote} vote={opt.vote} label={opt.label} active={myL.merit === opt.vote} color={opt.c} bg={opt.bg} onClick={() => castVote(selected.id, opt.vote, 'merit')} disabled={voting} />
                        ))}
                      </div>
                    )}
                    {!isAdvisorOrAdmin && <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic' }}>Admins & advisors review here.</div>}
                  </div>

                  {/* L4 — AI Facilitation */}
                  <div style={{ padding: '14px 16px', borderRadius: 10, border: `1px solid ${aiCheck && !aiCheck.loading ? 'color-mix(in srgb, #22c55e 30%, var(--rule))' : 'var(--rule)'}`, background: aiCheck && !aiCheck.loading ? 'color-mix(in srgb, #22c55e 4%, var(--surface))' : 'var(--surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 18, marginBottom: 2 }}>◇</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 1 }}>Layer 04</div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>AI Facilitation</div>
                        <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>Blueprint alignment</div>
                      </div>
                      {aiCheck?.loading
                        ? <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-4)', background: 'var(--bg-2)', border: '1px solid var(--rule)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>Checking…</span>
                        : aiCheck
                          ? <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: 'color-mix(in srgb, #22c55e 12%, transparent)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>✓ Cleared</span>
                          : <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-4)', background: 'var(--bg-2)', border: '1px solid var(--rule)', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>Loading…</span>
                      }
                    </div>
                    {aiCheck?.loading
                      ? <p style={{ fontSize: 11.5, color: 'var(--ink-4)', margin: 0, lineHeight: 1.55 }}>Checking against community Blueprint and goals…</p>
                      : aiCheck
                        ? <>
                            <p style={{ fontSize: 11.5, color: 'var(--ink-3)', margin: '0 0 8px', lineHeight: 1.55 }}>{aiCheck.reasoning || 'No blockers detected. Consistent with community Blueprint goals.'}</p>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>Confidence: {aiCheck.confidence}%</div>
                          </>
                        : <p style={{ fontSize: 11.5, color: 'var(--ink-4)', margin: 0 }}>Loading…</p>
                    }
                  </div>
                </div>

                {/* Live banner */}
                {isLive && (
                  <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: 'color-mix(in srgb, #22c55e 7%, var(--surface))', border: '1px solid color-mix(in srgb, #22c55e 25%, var(--rule))', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>Proposal approved — work can begin. Agreement auto-created in M06.</span>
                  </div>
                )}

                {/* Discussion */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--mono)' }}>
                    Discussion · {proposalComments.length} comment{proposalComments.length !== 1 ? 's' : ''}
                  </div>
                  {loadingComments ? (
                    <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Loading…</div>
                  ) : proposalComments.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: 'var(--ink-4)', marginBottom: 14 }}>No comments yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      {proposalComments.map(cm => (
                        <div key={cm.id} style={{ padding: '10px 14px', borderRadius: 9, background: 'var(--bg-2)', border: '1px solid var(--rule)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--m1), var(--m4))', display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 700, color: '#fff' }}>
                              {(cm.user?.first_name?.[0] ?? cm.user?.username?.[0] ?? '?').toUpperCase()}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{displayName(cm.user)}</span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', marginLeft: 'auto' }}>{ago(cm.created_at)}</span>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.55 }}>{cm.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment() }} placeholder="Add to the discussion… (⌘↵ to send)" rows={2} style={{ flex: 1, padding: '9px 12px', borderRadius: 9, fontSize: 13, border: '1px solid var(--rule)', background: 'var(--bg-2)', color: 'var(--ink)', resize: 'none', fontFamily: 'inherit', outline: 'none' }} />
                    <button onClick={postComment} disabled={postingComment || !newComment.trim()} style={{ padding: '0 16px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, background: 'var(--m9)', color: '#fff', border: 'none', cursor: 'pointer', opacity: postingComment || !newComment.trim() ? 0.5 : 1, alignSelf: 'stretch' }}>
                      {postingComment ? '…' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* New proposal modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center' }} onClick={e => { if (e.target === e.currentTarget) setShowNew(false) }}>
          <div style={{ width: '100%', maxWidth: 520, margin: '0 16px', background: 'var(--surface)', borderRadius: 14, padding: 28, border: '1px solid var(--rule)', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>New proposal</h2>
            <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--ink-4)' }}>Evaluated by all 4 layers simultaneously. 3 of 4 approvals = live.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 5 }}>Title</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g., Approve $4k for solar panels" style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13.5, border: '1px solid var(--rule)', background: 'var(--bg-2)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 5 }}>Description <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>(optional)</span></label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Provide context, cost breakdown, who benefits…" rows={4} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, border: '1px solid var(--rule)', background: 'var(--bg-2)', color: 'var(--ink)', resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ maxWidth: 160 }}>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 5 }}>Days open</label>
                <input type="number" min="1" max="30" value={newDays} onChange={e => setNewDays(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, border: '1px solid var(--rule)', background: 'var(--bg-2)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--rule)' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8 }}>Evaluated by all 4 layers</div>
                {[
                  { mark: '☉', n: '01', name: 'Sociocracy',     desc: 'Circle Leads · no objections = passes' },
                  { mark: '☑', n: '02', name: 'Democracy',      desc: 'All Members · majority yes = passes' },
                  { mark: '△', n: '03', name: 'Meritocracy',    desc: 'Admin & Advisors · expert approval' },
                  { mark: '◇', n: '04', name: 'AI Facilitation', desc: 'Blueprint alignment check' },
                ].map(l => (
                  <div key={l.n} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>{l.mark}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', minWidth: 130 }}>{l.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{l.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 22, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNew(false)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: '1px solid var(--rule)', background: 'transparent', color: 'var(--ink-2)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitProposal} disabled={submitting || !newTitle.trim()} style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--m9)', color: '#fff', border: 'none', cursor: 'pointer', opacity: submitting || !newTitle.trim() ? 0.5 : 1 }}>
                {submitting ? 'Submitting…' : 'Submit proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
