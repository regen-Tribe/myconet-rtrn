'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { circleSet, type Circle, type CircleSet, type CircleSlug } from '@/core/lib/circles'

type Patch = (slug: CircleSlug, patch: Partial<Circle>) => void

const CirclesContext = createContext<{ set: CircleSet; patch: Patch }>({ set: circleSet([]), patch: () => {} })

/**
 * Provided once in the root layout, so every client component reads the same
 * circles. A change saved on one screen (a lead's name on the org chart, Ops or the
 * Blueprint) is patched in here, so the others show it straight away.
 */
export function CirclesProvider({ rows, children }: { rows: Circle[]; children: React.ReactNode }) {
  const [local, setLocal] = useState(rows)
  useEffect(() => setLocal(rows), [rows])
  const patch = useCallback<Patch>((slug, p) => setLocal(list => list.map(c => (c.slug === slug ? { ...c, ...p } : c))), [])
  const value = useMemo(() => ({ set: circleSet(local), patch }), [local, patch])
  return <CirclesContext.Provider value={value}>{children}</CirclesContext.Provider>
}

export function useCircles(): CircleSet {
  return useContext(CirclesContext).set
}

/** Update a circle in the shared list after saving it. */
export function usePatchCircle(): Patch {
  return useContext(CirclesContext).patch
}
