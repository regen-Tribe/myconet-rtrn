import { createClient } from '@/core/lib/supabase/server'
import BlueprintClient from '@/modules/m04-blueprint/BlueprintClient'
import { isCircleAdmin } from '@/core/lib/roles'

export default async function BlueprintPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  let isAdminRole = false
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    isAdmin = isCircleAdmin(profile?.role ?? '')
    isAdminRole = profile?.role === 'admin'
  }

  const { data: communityBlueprint } = await supabase
    .from('blueprints')
    .select('*')
    .eq('is_community', true)
    .maybeSingle()

  if (!communityBlueprint) {
    if (!isAdmin) {
      return (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--ink-3)' }}>
          The community blueprint hasn't been set up yet. Check back soon.
        </div>
      )
    }

    const { data: created } = await supabase
      .from('blueprints')
      .insert({ user_id: user!.id, answers: {}, flags: {}, is_community: true })
      .select()
      .single()

    if (!created) {
      return (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--ink-3)' }}>
          Could not create blueprint. Please refresh.
        </div>
      )
    }

    return (
      <BlueprintClient
        blueprintId={created.id}
        initialAnswers={{}}
        initialFlags={{}}
        readOnly={false}
        isAdmin={isAdminRole}
        initialStep={step}
      />
    )
  }

  return (
    <BlueprintClient
      blueprintId={communityBlueprint.id}
      initialAnswers={(communityBlueprint.answers as Record<string, unknown>) ?? {}}
      initialFlags={(communityBlueprint.flags as Record<string, boolean>) ?? {}}
      readOnly={!isAdmin}
      isAdmin={isAdminRole}
      initialStep={step}
    />
  )
}
