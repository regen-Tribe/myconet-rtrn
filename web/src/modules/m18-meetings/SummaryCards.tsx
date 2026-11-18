import NotesText, { inline } from './NotesText'

// Fireflies' summary is a list of "- **Topic:** what was said" bullets (v4.33.3): each becomes a card with the topic
// as its heading. A summary in any other shape is shown as a note (NotesText).
const TOPIC = /^\s*[-*•]\s+\*\*(.+?):?\*\*:?\s*(.*)$/

export default function SummaryCards({ text, accent = 'var(--m18)' }: { text: string; accent?: string }) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const topics = lines.map(l => l.match(TOPIC)).filter((m): m is RegExpMatchArray => !!m)
  if (!topics.length || topics.length < lines.length * 0.6) {
    return <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink)' }}><NotesText text={text} /></div>
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: 10 }}>
      {topics.map(([, topic, body], i) => (
        <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderTop: `3px solid ${accent}`, borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 4, lineHeight: 1.35 }}>{topic.replace(/:$/, '')}</div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)' }}>{inline(body)}</div>
        </div>
      ))}
    </div>
  )
}
