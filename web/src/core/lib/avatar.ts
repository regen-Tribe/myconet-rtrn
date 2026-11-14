import type { createClient } from '@/core/lib/supabase/client'

type SupabaseBrowserClient = ReturnType<typeof createClient>

/**
 * Upload a (square, pre-cropped) avatar blob and point the user's profile at it.
 *
 * The blob is expected to already be a centred square produced by the
 * {@link AvatarCropper}, so that every avatar surface in the app — which all
 * render the image with `object-fit: cover` inside a circular frame — shows an
 * identical crop. Returns a cache-busted public URL safe to drop straight into
 * an `<img src>`.
 */
export async function uploadAvatarBlob(
  supabase: SupabaseBrowserClient,
  userId: string,
  blob: Blob,
): Promise<string> {
  // Always store at a single, stable path so there are never stale
  // per-extension copies (avatar.png + avatar.jpg) fighting each other.
  const path = `${userId}/avatar.jpg`
  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
  if (upErr) throw upErr

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

  // The storage path is stable, so the public URL never changes between
  // uploads — which means the browser and the Supabase CDN keep serving the
  // previously cached image. Every avatar surface (nav bar, member cards,
  // profiles) reads `avatar_url` straight from the DB, so we persist a
  // *versioned* URL. The query string forces a fresh fetch everywhere the new
  // crop should appear, not just on the page that did the upload.
  const versionedUrl = `${publicUrl}?v=${Date.now()}`
  const { error: dbErr } = await supabase
    .from('user_profiles')
    .update({ avatar_url: versionedUrl })
    .eq('id', userId)
  if (dbErr) throw dbErr

  return versionedUrl
}
