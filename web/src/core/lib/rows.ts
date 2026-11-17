/** PostgREST types to-one embeds loosely (object or one-item array): the row, or null */
export const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)
