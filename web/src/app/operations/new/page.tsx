import { createClient } from '@/core/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewProjectClient from '@/modules/m07-ops/NewProjectClient'
import { isOpsAdmin, isJoiningOrAbove } from '@/core/lib/roles'

export default async function NewProjectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role ?? 'explorer'

  // Only joining+ users can propose/create projects
  if (!isJoiningOrAbove(role)) redirect('/operations')

  const { data: teams } = await supabase.from('org_units').select('id, name, circle').eq('kind', 'team').order('sort_order')
  return <NewProjectClient userId={user.id} isOpsAdmin={isOpsAdmin(role)} teams={teams ?? []} />
}
