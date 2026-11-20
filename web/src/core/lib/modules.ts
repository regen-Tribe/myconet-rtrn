/**
 * Optional modules and features a community turns on in instance/config.jsonc
 * ("modules": ["meetings", "points"]). The build passes the list as NEXT_PUBLIC_MODULES.
 * - meetings: a module that's off has no sidebar entry, and its pages and API routes answer 404.
 * - points: points are always recorded in `points_log`; with this off, no screen mentions them.
 */
export type OptionalModule = 'meetings' | 'points'

const ON = new Set((process.env.NEXT_PUBLIC_MODULES ?? '').split(',').map(s => s.trim()).filter(Boolean))

export const moduleOn = (m: OptionalModule): boolean => ON.has(m)
