'use client'

/** Centered dialog with a title bar and close button; click outside to dismiss. */
export function ModalShell({ title, onClose, children, maxWidth = 520 }: {
  title: React.ReactNode; onClose: () => void; children: React.ReactNode; maxWidth?: number
}) {
  return (
    <div
      className="modal-shell__backdrop"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        className="modal-shell__dialog"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--rule)',
          width: '100%', maxWidth, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)', animation: 'calFadeIn 160ms ease',
        }}
      >
        <div className="modal-shell__head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3, overflowWrap: 'anywhere' }}>{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  )
}
