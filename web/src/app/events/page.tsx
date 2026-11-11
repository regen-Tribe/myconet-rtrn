import { after } from 'next/server'
import { createClient } from '@/core/lib/supabase/server'
import EventsClient from '@/modules/m14-events/EventsClient'
import { isJoiningOrAbove } from '@/core/lib/roles'
import { loadCircles } from '@/core/lib/circles-server'
import { isEventKind } from '@/modules/m14-events/lib/permissions'
import { EVENT_SELECT, FEED_SELECT, RSVP_SELECT, toEvent, toRsvp } from '@/modules/m14-events/lib/queries'
import { syncCalendarFeeds } from '@/modules/m14-events/lib/feed-sync'
import type { EventDraft } from '@/modules/m14-events/EventFormModal'
import type { CalendarFeed, EventsView, LinkOption } from '@/modules/m14-events/types'

const VIEWS: EventsView[] = ['month', 'week', 'list']

export default async function EventsPage({ searchParams }: {
  searchParams: Promise<{ tab?: string; view?: string; event?: string; new?: string; project?: string; proposal?: string; circle?: string }>
}) {
  const sp = await searchParams
  // Linked calendars (Google etc.) refresh at most hourly, after this page is sent
  after(() => syncCalendarFeeds().catch(() => {}))
  const supabase = await createClient()
  const [{ data: { user } }, circles] = await Promise.all([supabase.auth.getUser(), loadCircles(supabase)])

  let role = 'explorer'
  let leadCircles: string[] = []
  let me: { first_name: string | null; username: string | null } | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, lead_circles, first_name, username')
      .eq('id', user.id)
      .maybeSingle()
    role = profile?.role ?? 'explorer'
    leadCircles = profile?.lead_circles ?? []
    me = { first_name: profile?.first_name ?? null, username: profile?.username ?? null }
  }

  // RLS limits logged-out visitors and explorers to public events
  const since = new Date(Date.now() - 365 * 86400000).toISOString()
  const { data: eventRows } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .gte('starts_at', since)
    .order('starts_at', { ascending: true })
  const events = (eventRows ?? []).map(toEvent)

  const eventIds = events.map(e => e.id)
  const { data: rsvpRows } = user && eventIds.length
    ? await supabase.from('event_rsvps').select(RSVP_SELECT).in('event_id', eventIds)
    : { data: [] }
  const rsvps = (rsvpRows ?? []).map(toRsvp)

  // Link pickers for the event form — only needed by people who can post
  let projects: LinkOption[] = []
  let proposals: LinkOption[] = []
  if (isJoiningOrAbove(role)) {
    const [projRes, propRes] = await Promise.all([
      supabase.from('projects').select('id, title, circle').order('title'),
      supabase.from('proposals').select('id, title').order('created_at', { ascending: false }).limit(50),
    ])
    projects = (projRes.data ?? []) as LinkOption[]
    proposals = (propRes.data ?? []) as LinkOption[]
  }

  // Admins manage linked calendars from this page
  const { data: feedRows } = role === 'admin'
    ? await supabase.from('calendar_feeds').select(FEED_SELECT).order('created_at')
    : { data: null }
  const feeds = (feedRows ?? []) as CalendarFeed[]

  const linked = sp.event ? events.find(e => e.id === sp.event) : undefined
  const initialTab = linked?.kind ?? (isEventKind(sp.tab) ? sp.tab : 'core')
  const initialView = VIEWS.find(v => v === sp.view) ?? 'month'
  const initialDraft: EventDraft | null = sp.new && isJoiningOrAbove(role)
    ? {
        kind: initialTab,
        project_id: projects.some(p => p.id === sp.project) ? sp.project! : null,
        proposal_id: proposals.some(p => p.id === sp.proposal) ? sp.proposal! : null,
        circle: circles.has(sp.circle)
          ? sp.circle
          : projects.find(p => p.id === sp.project)?.circle ?? null,
      }
    : null

  return (
    <EventsClient
      initialEvents={events}
      initialRsvps={rsvps}
      userId={user?.id ?? null}
      me={me}
      role={role}
      leadCircles={leadCircles}
      projects={projects}
      proposals={proposals}
      initialTab={initialTab}
      initialView={initialView}
      initialEventId={linked?.id ?? null}
      initialDraft={initialDraft}
      initialFeeds={role === 'admin' ? feeds : null}
    />
  )
}
