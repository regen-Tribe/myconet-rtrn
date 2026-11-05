/**
 * The community's logo and banner image, from `community_settings` (set by an
 * admin in the Blueprint's Look & feel step). Client components read them with
 * `useBranding()`; server code loads them with `loadBranding()` (branding-server.ts).
 */
export interface Branding {
  logo_url: string | null
  banner_url: string | null
}

export const BRANDING_SELECT = 'logo_url, banner_url'

export const NO_BRANDING: Branding = { logo_url: null, banner_url: null }

/** Blueprint step where admins set the logo and banner */
export const BRANDING_STEP_HREF = '/blueprint?step=branding'
