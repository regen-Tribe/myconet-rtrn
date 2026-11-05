'use client'
import { createContext, useContext } from 'react'
import { NO_BRANDING, type Branding } from '@/core/lib/branding'

const BrandingContext = createContext<Branding>(NO_BRANDING)

/** Provided once in the root layout, so every client component can read the logo and banner. */
export function BrandingProvider({ branding, children }: { branding: Branding; children: React.ReactNode }) {
  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>
}

export function useBranding(): Branding {
  return useContext(BrandingContext)
}
