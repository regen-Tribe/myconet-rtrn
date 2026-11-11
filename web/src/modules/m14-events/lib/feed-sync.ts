/**
 * Server-side calendar feed sync. Fetches each due feed, expands it with parseFeed()
 * and hands the occurrences to calendar_feed_apply(). The database functions allow it
 * when the caller is an admin or passes CALENDAR_SYNC_SECRET (the portal's own server).
 */
import { createClient as createSupabase, type SupabaseClient } from '@supabase/supabase-js'
import { FEED_DAYS_AHEAD, parseFeed } from './feeds'

export interface FeedSyncResult { id: string; count?: number; error?: string }

const MAX_FEED_BYTES = 10_000_000

async function fetchFeed(url: string): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 20_000)
  try {
    const resp = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'text/calendar, */*' }, redirect: 'follow' })
    if (!resp.ok) throw new Error(`The calendar link answered ${resp.status}${resp.status === 404 ? ' (not found: check the link, and that the calendar is public or the secret address is current)' : ''}.`)
    const text = await resp.text()
    if (text.length > MAX_FEED_BYTES) throw new Error('That calendar is too large to read (over 10 MB).')
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('That link isn’t an iCal calendar (.ics).')
    return text
  } catch (e) {
    throw (e as Error).name === 'AbortError' ? new Error('The calendar took too long to answer.') : e
  } finally {
    clearTimeout(t)
  }
}

/**
 * Syncs the feeds that are due (or just `feedId`, now). `supabase` is an admin's client
 * for "Sync now"; without it, a session-less client is used with the sync secret.
 */
export async function syncCalendarFeeds(opts: { supabase?: SupabaseClient; feedId?: string; maxAgeMinutes?: number } = {}): Promise<FeedSyncResult[]> {
  const secret = process.env.CALENDAR_SYNC_SECRET ?? null
  const supabase = opts.supabase ?? (secret ? anonClient() : null)
  if (!supabase) return []

  const { data: feeds, error } = await supabase.rpc('calendar_feeds_claim', {
    p_secret: secret, p_max_age: `${opts.maxAgeMinutes ?? 60} minutes`, p_feed_id: opts.feedId ?? null,
  })
  if (error) throw new Error(error.message)
  if (!feeds?.length) return []

  const { data: circleRows } = await supabase.from('circles').select('slug, name')
  const from = new Date()
  from.setUTCHours(0, 0, 0, 0)
  const to = new Date(from.getTime() + FEED_DAYS_AHEAD * 86400000)

  const results: FeedSyncResult[] = []
  for (const feed of feeds as { id: string; url: string; match_circles: boolean }[]) {
    try {
      const occurrences = parseFeed(await fetchFeed(feed.url), from, to, feed.match_circles ? circleRows ?? [] : null)
      const { data: count, error: applyError } = await supabase.rpc('calendar_feed_apply', {
        p_secret: secret, p_feed_id: feed.id, p_events: occurrences, p_from: from.toISOString(), p_to: to.toISOString(),
      })
      if (applyError) throw new Error(applyError.message)
      results.push({ id: feed.id, count: count as number })
    } catch (e) {
      const message = (e as Error).message || 'The calendar couldn’t be read.'
      await supabase.rpc('calendar_feed_apply', {
        p_secret: secret, p_feed_id: feed.id, p_events: [], p_from: from.toISOString(), p_to: to.toISOString(), p_error: message,
      })
      results.push({ id: feed.id, error: message })
    }
  }
  return results
}

function anonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key ? createSupabase(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null
}
