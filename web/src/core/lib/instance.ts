/**
 * This community's identity, from instance/config.jsonc (inlined at build time
 * by scripts/instance.mjs). Core code must never hard-code a community's name.
 */

/** Short name, e.g. "Regen Hood 0". Used for login, headers and branding. */
export const COMMUNITY_NAME = process.env.NEXT_PUBLIC_COMMUNITY_NAME || 'Our community'

/** Which look the portal uses: 'v4' turns on the redesign (DESIGN-SYSTEM.md › v4), '' keeps the current one. */
export const DESIGN = process.env.NEXT_PUBLIC_DESIGN === 'v4' ? 'v4' : ''

/** The Blueprint's working name for the neighborhood, falling back to the short name. */
export function communityName(answers: Record<string, unknown> | null | undefined): string {
  const name = answers?.project_name
  return typeof name === 'string' && name.trim() ? name.trim() : COMMUNITY_NAME
}

/** Shown under the hero until the Blueprint has a Purpose answer. */
export const DEFAULT_PURPOSE = 'A regenerative neighborhood in the making: a place where people meet their core and higher needs while living in alignment with nature, and build it together. Our Blueprint is still being written.'

/** Framework credit shown on every MyCoNet community (footers, Blueprint exports). */
export const FRAMEWORK_CREDIT = 'MyCoNet · Regenerative Neighborhood Framework · Open sourced by The Regen Tribe Collective'
