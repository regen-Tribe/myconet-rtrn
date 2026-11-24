import { createClient } from '@/core/lib/supabase/server'
import { profileColumns, withProfileDetails } from '@/core/lib/public-profile'
import DiscoverClient from '@/modules/m01-network/DiscoverClient'

export default async function DiscoverPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profilesQuery = supabase
    .from('user_profiles')
    .select(profileColumns(!!user, 'id, username, first_name, last_name, headline, avatar_url'))
    .eq('approved', true)
    .order('created_at', { ascending: false })

  if (user) profilesQuery = profilesQuery.neq('id', user.id)

  const [profilesRes, biosRes, myBioRes] = await Promise.all([
    profilesQuery,
    user
      ? supabase.from('user_bio').select('*')
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from('user_bio').select('*').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const bioMap: Record<string, any> = {}
  for (const b of biosRes.data ?? []) bioMap[b.user_id] = b

  return (
    <DiscoverClient
      // City, country and kinds of people: joining members and up only (decision #71)
      profiles={(user ? await withProfileDetails(supabase, profilesRes.data as unknown as { id: string }[]) : profilesRes.data ?? []) as any}
      bioMap={bioMap}
      myBio={(myBioRes as any).data ?? null}
      isLoggedIn={!!user}
    />
  )
}
