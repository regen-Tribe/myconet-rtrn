import { NextResponse } from 'next/server'
import { VERSION } from '@/core/lib/version'

// What's live: the core version and the commit it was built from. The deploy check
// (scripts/deploy-check.mjs) and start-work (scripts/start-work.mjs) read this.
export function GET() {
  return NextResponse.json({ version: VERSION, sha: process.env.NEXT_PUBLIC_GIT_SHA || null }, { headers: { 'cache-control': 'no-store' } })
}
