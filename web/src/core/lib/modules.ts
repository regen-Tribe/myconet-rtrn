/**
 * Optional modules a community turns on in instance/config.jsonc ("modules": ["meetings"]).
 * The build passes the list as NEXT_PUBLIC_MODULES; a module that's off has no sidebar
 * entry, and its pages and API routes answer 404.
 */
export type OptionalModule = 'meetings'

const ON = new Set((process.env.NEXT_PUBLIC_MODULES ?? '').split(',').map(s => s.trim()).filter(Boolean))

export const moduleOn = (m: OptionalModule): boolean => ON.has(m)
