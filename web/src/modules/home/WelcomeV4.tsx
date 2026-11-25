import Link from 'next/link'
import { createClient } from '@/core/lib/supabase/server'
import { loadBranding } from '@/core/lib/branding-server'
import { Button, Icon, IconTile, List, ListRow } from '@/core/components/v4'
import { COMMUNITY_DESCRIPTION, COMMUNITY_NAME } from '@/core/lib/instance'
import { JOIN_REVIEWER } from '@/core/lib/join-path'
import './welcome-v4.css'

/**
 * The visitor's first page with the design review (Sonia, 24 Nov: About "gives no indicator of what the portal is
 * for", replacing #69 "the welcome screen is About"). Short: who the community is in one line, what this portal is
 * for in three rows, the one way in (Create account, Sign in beside it), and About for the whole story.
 * Signed-in people never see it: / sends them to the Dashboard.
 */
export default async function WelcomeV4() {
  const supabase = await createClient()
  const branding = await loadBranding(supabase)
  const name = COMMUNITY_NAME
  const steward = JOIN_REVIEWER.charAt(0).toUpperCase() + JOIN_REVIEWER.slice(1)

  return (
    <div className="v4-page wl">
      <header className="wl-hero" style={branding.banner_url ? { backgroundImage: `url(${branding.banner_url})` } : undefined}>
        <div className="wl-hero-in">
          <span className="wl-eyebrow">Welcome to</span>
          <h1>{name}</h1>
          {COMMUNITY_DESCRIPTION && <p>{COMMUNITY_DESCRIPTION.replace(/\.$/, '')}.</p>}
          <div className="wl-acts">
            <Button variant="next" href="/auth/signup">Create account</Button>
            <Link href="/auth/login" className="wl-signin">Sign in</Link>
          </div>
        </div>
      </header>

      <section className="v4-card wl-card" aria-labelledby="wl-for">
        <h2 id="wl-for">What this portal is for</h2>
        <p className="wl-text">This is {name}’s own portal: one place where the people of {name} meet, plan and decide together.</p>
        <List>
          <ListRow href="/members" lead={<IconTile name="users" tone="grey" />} title="Meet the people" meta="Who lives here, and what they offer" trail={<Icon name="right" />} />
          <ListRow href="/calendar" lead={<IconTile name="calendar" tone="grey" />} title="See what’s on" meta="Events, workshops and who’s staying" trail={<Icon name="right" />} />
          <ListRow href="/operations" lead={<IconTile name="handshake" tone="grey" />} title="Work and decide together" meta="Tasks, circles and proposals, once you’ve joined" trail={<Icon name="right" />} />
        </List>
      </section>

      <section className="v4-card wl-card" aria-labelledby="wl-join">
        <h2 id="wl-join">Joining {name}</h2>
        <ol className="wl-steps">
          <li><span className="wl-n">1</span><span><b>Create an account</b><small>An email and a password</small></span></li>
          <li><span className="wl-n">2</span><span><b>Two short steps</b><small>Get to know us, then tell us about you. About ten minutes</small></span></li>
          <li><span className="wl-n">3</span><span><b>{steward} answers</b><small>Within a week</small></span></li>
        </ol>
        <div className="wl-acts wl-acts--card">
          <Button variant="next" href="/auth/signup">Create account</Button>
          <Link href="/about" className="wl-more">Read about {name}</Link>
        </div>
      </section>
    </div>
  )
}
