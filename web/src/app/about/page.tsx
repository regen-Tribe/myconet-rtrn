import BlueprintPage from '../blueprint/page'
import BlueprintLayout from '../blueprint/layout'
import { COMMUNITY_NAME, DESIGN } from '@/core/lib/instance'
import { createClient } from '@/core/lib/supabase/server'
import { isCircleAdmin } from '@/core/lib/roles'
import AboutV4 from '@/modules/m04-blueprint/AboutV4'

/**
 * About {community} (v4 menu): the Blueprint told as a page. With the v4 look it's a page to read;
 * `?edit=1` or any `?step=` (old /blueprint?step=… links redirect here) opens the Blueprint wizard.
 */
export default async function AboutPage(props: { searchParams: Promise<{ step?: string; edit?: string }> }) {
  const sp = await props.searchParams
  if (DESIGN === 'v4' && !sp.step && !sp.edit) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = user
      ? await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
      : { data: null }
    const role = profile?.role ?? 'explorer'
    return <AboutV4 supabase={supabase} communityName={COMMUNITY_NAME} role={role} canEdit={isCircleAdmin(role)} />
  }
  return <BlueprintLayout>{await BlueprintPage({ searchParams: Promise.resolve({ step: sp.step }) })}</BlueprintLayout>
}
