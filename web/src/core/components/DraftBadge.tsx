/** "Draft" on a task the agent drafted (e.g. from a meeting) until a lead confirms it */
export function DraftBadge({ size = 9 }: { size?: number }) {
  return (
    <span title="A draft (e.g. from a meeting): a lead opens it and saves to confirm" style={{
      fontSize: size, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
      color: '#b45309', background: '#fef3c7', borderRadius: 4, padding: '1px 5px', marginRight: 6, verticalAlign: 1,
    }}>
      Draft
    </span>
  )
}
