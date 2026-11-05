import { createClient } from '@/core/lib/supabase/client'

/**
 * Saves the community's logo or banner: uploads the image to the public
 * `branding` bucket, stores its URL in `community_settings` and removes the old
 * file. Admins only (RLS). Used by the Look & feel step and the document import.
 */
export type BrandingKind = 'logo' | 'banner' | 'share_image'

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/gif': 'gif' }

/** "…/storage/v1/object/public/branding/logo-123.png" → "logo-123.png" */
const pathOf = (url: string | null) => url?.split('/object/public/branding/')[1]?.split('?')[0] ?? null

async function saveUrl(kind: BrandingKind, url: string | null) {
  const { error } = await createClient().from('community_settings')
    .upsert({ id: true, [`${kind}_url`]: url }, { onConflict: 'id' })
  if (error) throw new Error(error.message)
}

export async function setBrandingImage(kind: BrandingKind, image: Blob, oldUrl: string | null) {
  const supabase = createClient()
  // A new name each time, so browsers don't keep showing the old image
  const path = `${kind}-${Date.now()}.${EXT[image.type] ?? 'png'}`
  const { error } = await supabase.storage.from('branding').upload(path, image, { contentType: image.type })
  if (error) throw new Error(error.message)
  await saveUrl(kind, supabase.storage.from('branding').getPublicUrl(path).data.publicUrl)
  const old = pathOf(oldUrl)
  if (old) await supabase.storage.from('branding').remove([old])
}

export async function clearBrandingImage(kind: BrandingKind, oldUrl: string | null) {
  await saveUrl(kind, null)
  const old = pathOf(oldUrl)
  if (old) await createClient().storage.from('branding').remove([old])
}
