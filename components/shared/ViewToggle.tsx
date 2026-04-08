'use client'
import { useEffect } from 'react'
import { useLocalStorage } from '@/lib/useLocalStorage'

interface ViewOption {
  key: string
  label: string
  icon: React.ReactNode
}

interface ViewToggleProps {
  views: ViewOption[]
  storageKey: string
  defaultView: string
  onViewChange: (view: string) => void
}

export default function ViewToggle({ views, storageKey, defaultView, onViewChange }: ViewToggleProps) {
  const [activeView, setActiveView, loaded] = useLocalStorage<string>(storageKey, defaultView)

  useEffect(() => {
    if (loaded) {
      onViewChange(activeView)
    }
  }, [loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = (key: string) => {
    setActiveView(key)
    onViewChange(key)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {views.map(view => {
        const isActive = activeView === view.key
        return (
          <button
            key={view.key}
            title={view.label}
            onClick={() => handleClick(view.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '7px 10px',
              borderRadius: 5,
              border: '1px solid var(--border)',
              cursor: 'pointer',
              background: isActive ? 'var(--accent)' : 'var(--bg-card)',
              color: isActive ? 'var(--bg-primary)' : 'var(--text-muted)',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {view.icon}
          </button>
        )
      })}
    </div>
  )
}
