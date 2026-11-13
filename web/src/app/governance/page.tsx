import { createClient } from '@/core/lib/supabase/server'
import GovernanceClient from '@/modules/m09-governance/GovernanceClient'
import { isFullMember as checkFullMember, isCircleLead, isAdvisorOrAdmin } from '@/core/lib/roles'

export default async function GovernancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [proposalsRes, memberCountRes, voterRolesRes] = await Promise.all([
    supabase
      .from('proposals')
      .select(`
        id, title, description, decision_mode, status, closes_at, created_at,
        proposer:user_profiles!proposals_proposer_id_fkey(username, first_name, last_name),
        votes:proposal_votes(vote, user_id, layer)
      `)
      .eq('status', 'open')
      .order('closes_at', { ascending: true, nullsFirst: false }),
    supabase.rpc('eligible_voter_count'),
    supabase.rpc('open_proposal_voter_roles'),
  ])

  const voterRole = new Map(
    ((voterRolesRes.data ?? []) as { proposal_id: string; user_id: string; role: string }[])
      .map(row => [`${row.proposal_id}:${row.user_id}`, row.role]),
  )
  const proposals = ((proposalsRes.data ?? []) as any[]).map(proposal => ({
    ...proposal,
    votes: (proposal.votes ?? []).map((vote: { user_id: string }) => (
      { ...vote, voter: { role: voterRole.get(`${proposal.id}:${vote.user_id}`) ?? null } }
    )),
  }))

  const myVotes: Record<string, Record<string, string>> = {} // { proposalId: { layer: vote } }
  let isFullMember = false
  let role = 'explorer'

  if (user) {
    const [myVotesRes, profileRes] = await Promise.all([
      supabase.from('proposal_votes').select('proposal_id, vote, layer').eq('user_id', user.id),
      supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle(),
    ])
    for (const v of myVotesRes.data ?? []) {
      if (!myVotes[v.proposal_id]) myVotes[v.proposal_id] = {}
      myVotes[v.proposal_id][v.layer] = v.vote
    }
    role = profileRes.data?.role ?? 'explorer'
    isFullMember = checkFullMember(role)
  }

  return (
    <GovernanceClient
      proposals={proposals}
      memberCount={typeof memberCountRes.data === 'number' ? memberCountRes.data : 0}
      currentUserId={user?.id ?? ''}
      myVotes={myVotes}
      isFullMember={isFullMember}
      isLoggedIn={!!user}
      role={role}
      isCircleLead={isCircleLead(role)}
      isAdvisorOrAdmin={isAdvisorOrAdmin(role)}
    />
  )
}
