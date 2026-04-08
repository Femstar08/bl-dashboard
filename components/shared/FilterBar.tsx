'use client'
import { useState, useRef, useEffect } from 'react'

interface FilterDef {
  key: string
  label: string
  options: string[]
}

interface FilterBarProps {
  filters: FilterDef[]
  activeFilters: Record<string, string[]>
  onFilterChange: (key: string, values: string[]) => void
  onClearAll: () => void
}

export default function FilterBar({ filters, activeFilters, onFilterChange, onClearAll }: FilterBarProps) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenKey(null)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  const hasAnyActive = Object.values(activeFilters).some(v => v.length > 0)

  const toggleOption = (filterKey: string, option: string) => {
    const current = activeFilters[filterKey] || []
    const next = current.includes(option)
      ? current.filter(v => v !== option)
      : [...current, option]
    onFilterChange(filterKey, next)
  }

  return (
    <div ref={containerRef} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {filters.map(filter => {
        const selected = activeFilters[filter.key] || []
        const isActive = selected.length > 0
        const isOpen = openKey === filter.key

        return (
          <div key={filter.key} style={{ position: 'relative' }}>
            <button
              onClick={() => setOpenKey(isOpen ? null : filter.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                fontFamily: 'inherit',
                background: isActive ? 'var(--accent)' : 'var(--bg-card)',
                color: isActive ? 'var(--bg-primary)' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {filter.label}
              {isActive ? ` (${selected.length})` : ' \u25BE'}
            </button>

            {isOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 4,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 4,
                minWidth: 160,
                maxHeight: 220,
                overflowY: 'auto',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 100,
              }}>
                {filter.options.map(option => {
                  const checked = selected.includes(option)
                  return (
                    <div
                      key={option}
                      onClick={() => toggleOption(filter.key, option)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 10px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        color: 'var(--text-primary)',
                        background: checked ? 'var(--bg-mid)' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-mid)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.background = checked ? 'var(--bg-mid)' : 'transparent'
                      }}
                    >
                      <span style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        background: checked ? 'var(--accent)' : 'transparent',
                        color: checked ? 'var(--bg-primary)' : 'transparent',
                        flexShrink: 0,
                      }}>
                        {checked ? '✓' : ''}
                      </span>
                      {option}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {hasAnyActive && (
        <button
          onClick={onClearAll}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
        >
          Clear all
        </button>
      )}
    </div>
  )
}
