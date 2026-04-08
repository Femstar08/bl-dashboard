'use client'
import { useState, useCallback } from 'react'
import type { ContentCalendarItem } from '@/lib/types-requirements'
import { CAL_STATUSES, CAL_STATUS_COLORS, PILLAR_COLORS } from '@/lib/types-requirements'

interface CalendarKanbanProps {
  items: ContentCalendarItem[]
  onSelect: (item: ContentCalendarItem) => void
  onUpdate: (id: string, updates: Partial<ContentCalendarItem>) => Promise<void>
}

const FORMAT_ICONS: Record<string, string> = {
  'Text Post': '\u270D',
  'Carousel': '\u1F5BC',
  'Video': '\u25B6',
  'Poll': '\u2753',
  'Article': '\uD83D\uDCDD',
  'Infographic': '\uD83D\uDCC8',
  'Story': '\u26A1',
}

function truncate(text: string, max: number): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '\u2026' : text
}

export default function CalendarKanban({ items, onSelect, onUpdate }: CalendarKanbanProps) {
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
        onUpdate(dragId, { status: status as ContentCalendarItem['status'] })
      }
    }
    setDragId(null)
  }, [dragId, items, onUpdate])

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
      {CAL_STATUSES.map(status => {
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
                borderBottom: '1px solid var(--border)',
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
                  background: CAL_STATUS_COLORS[status] ?? 'var(--text-muted)',
                  flexShrink: 0,
                }}
              />
              {status} ({colItems.length})
            </div>

            {/* Cards */}
            {colItems.map(item => {
              const isDragging = dragId === item.id
              const pillarColor = PILLAR_COLORS[item.pillar] || '#8892a8'
              const dateLabel = item.publish_date
                ? new Date(item.publish_date + 'T00:00:00').toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })
                : '\u2014'
              const formatIcon = FORMAT_ICONS[item.format] || ''

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
                  {/* Top line: date + pillar badge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4,
                    marginBottom: 4,
                  }}>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                      {dateLabel}
                    </span>
                    {item.pillar && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: pillarColor,
                          background: pillarColor + '22',
                          padding: '1px 6px',
                          borderRadius: 99,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 100,
                        }}
                      >
                        {item.pillar}
                      </span>
                    )}
                  </div>

                  {/* Title: topic */}
                  <div
                    style={{
                      fontSize: 10,
                      lineHeight: 1.3,
                      color: 'var(--text-primary)',
                      marginBottom: 6,
                    }}
                  >
                    {truncate(item.topic, 50)}
                  </div>

                  {/* Bottom: format + channel */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 8,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {formatIcon && <span>{formatIcon}</span>}
                    <span>{item.channel}</span>
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
