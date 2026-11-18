/** "Assigned to" value for someone typed in by name, not an account (v4.32.0) */
export const NAME_TAG = '__name__'

/** A typed name on a task: someone not on MyCoNet yet. Dotted, so it doesn't read as an account */
export function NameTag({ name, style }: { name: string; style?: React.CSSProperties }) {
  return (
    <span title="Not on MyCoNet yet: just a name on the task" style={{ borderBottom: '1px dotted currentColor', ...style }}>
      {name}
    </span>
  )
}
