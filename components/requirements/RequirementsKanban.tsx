'use client'
import { useState, useCallback } from 'react'
import type { Requirement } from '@/lib/types-requirements'
import { REQ_STATUSES, PRIORITY_COLORS, STATUS_COLORS } from '@/lib/types-requirements'

interface RequirementsKanbanProps {
  items: Requirement[]
  onSelect: (item: Requirement) => void
  onUpdate: (id: string, updates: Partial<Requirement>) => Promise<void>
}

export default function RequirementsKanban({ items, onSelect, onUpdate }: RequirementsKanbanProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)

  const handleDragStart = useCallback((id: string) => {
    setDragId(id)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragId(null)
    setDragOverStatus(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault()
    setDragOverStatus(status)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverStatus(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault()
    setDragOverStatus(null)
    if (dragId) {
      const item = items.find(i => i.id === dragId)
      if (item && item.status !== status) {
        onUpdate(dragId, { status: status as Requirement['status'] })
      }
    }
    setDragId(null)
  }, [dragId, items, onUpdate])

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + '...' : text

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: 12,
        overflowX: 'auto',
        minHeight: 400,
      }}
    >
      {REQ_STATUSES.map(status => {
        const colItems = items.filter(i => i.status === status)
        const isOver = dragOverStatus === status

        return (
          <div
            key={status}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
            style={{
              flex: 1,
              minWidth: 150,
              background: 'var(--bg-card)',
              borderRadius: 8,
              padding: 8,
              border: isOver ? '2px dashed var(--accent)' : '2px solid transparent',
              transition: 'border-color 0.15s ease',
            }}
          >
            {/* Column header */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: 8,
                paddingBottom: 6,
                borderBottom: `1px solid var(--border)`,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: STATUS_COLORS[status] ?? 'var(--text-muted)',
                  flexShrink: 0,
                }}
              />
              {status} ({colItems.length})
            </div>

            {/* Cards */}
            {colItems.map(item => {
              const isDragging = dragId === item.id

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(item.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    if (!dragId) onSelect(item)
                  }}
                  style={{
                    padding: 8,
                    background: 'var(--bg-mid)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    marginBottom: 6,
                    cursor: 'pointer',
                    opacity: isDragging ? 0.4 : 1,
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 10 }}>
                    {item.ref_id}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      lineHeight: 1.3,
                      marginTop: 2,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {truncate(item.requirement, 60)}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 6,
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Priority badge */}
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 600,
                        color: '#fff',
                        background: PRIORITY_COLORS[item.priority] ?? '#8892a8',
                        borderRadius: 99,
                        padding: '1px 6px',
                        lineHeight: '14px',
                      }}
                    >
                      {item.priority}
                    </span>
                    {/* Phase tag */}
                    <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>
                      {item.phase}
                    </span>
                    {/* Complexity pill */}
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        background: 'var(--border)',
                        borderRadius: 99,
                        padding: '1px 5px',
                        lineHeight: '14px',
                      }}
                    >
                      {item.complexity}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
