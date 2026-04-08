'use client'
import { X } from 'lucide-react'

interface DetailPanelProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  width?: number
}

const slideInKeyframes = `
@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
`

export default function DetailPanel({ title, onClose, children, width = 400 }: DetailPanelProps) {
  return (
    <>
      <style>{slideInKeyframes}</style>

      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 99,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          width,
          height: '100vh',
          zIndex: 100,
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border)',
          overflowY: 'auto',
          padding: 20,
          animation: 'slideIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {children}
      </div>
    </>
  )
}
