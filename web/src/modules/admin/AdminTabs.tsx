import Link from 'next/link'

/** Tabs across the admin pages */
export default function AdminTabs({ active, openQuestions }: { active: 'users' | 'questions'; openQuestions?: number }) {
  const tab = (id: 'users' | 'questions', href: string, label: string, badge?: number) => (
    <Link href={href} style={{
      padding: '8px 14px', fontSize: 13.5, fontWeight: active === id ? 700 : 500, textDecoration: 'none',
      color: active === id ? 'var(--ink)' : 'var(--ink-3)', borderBottom: `2px solid ${active === id ? '#dc2626' : 'transparent'}`,
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>
      {label}
      {!!badge && <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#dc2626', borderRadius: 999, padding: '0 7px' }}>{badge}</span>}
    </Link>
  )
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--rule)', marginBottom: 24 }}>
      {tab('users', '/admin/users', 'Users')}
      {tab('questions', '/admin/questions', 'Questions', openQuestions)}
    </div>
  )
}
