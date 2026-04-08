'use client'
import { useState, useMemo, useCallback } from 'react'
import type { ContentCalendarItem } from '@/lib/types-requirements'
import { PILLAR_COLORS } from '@/lib/types-requirements'

interface CalendarGridProps {
  items: ContentCalendarItem[]
  onSelect: (item: ContentCalendarItem) => void
  onUpdate: (id: string, updates: Partial<ContentCalendarItem>) => Promise<void>
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FULL_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function pillarAbbrev(pillar: string): string {
  if (!pillar) return ''
  const words = pillar.split(/\s+/)
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase()
  return words.map(w => w[0]).join('').toUpperCase().substring(0, 3)
}

export default function CalendarGrid({ items, onSelect, onUpdate }: CalendarGridProps) {
  // Determine initial month: April 2026 if items exist with April 2026 dates, else current month
  const initialMonth = useMemo(() => {
    const hasApril2026 = items.some(item => {
      if (!item.publish_date) return false
      const d = new Date(item.publish_date + 'T00:00:00')
      return d.getFullYear() === 2026 && d.getMonth() === 3
    })
    if (hasApril2026) return new Date(2026, 3, 1)
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [currentMonth, setCurrentMonth] = useState(initialMonth)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  // Map items by date
  const dateItems = useMemo(() => {
    const map: Record<string, ContentCalendarItem[]> = {}
    for (const item of items) {
      if (!item.publish_date) continue
      const key = item.publish_date
      if (!map[key]) map[key] = []
      map[key].push(item)
    }
    return map
  }, [items])

  // Generate calendar cells
  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1)
    const lastOfMonth = new Date(year, month + 1, 0)

    const startDay = firstOfMonth.getDay()
    const mondayOffset = startDay === 0 ? 6 : startDay - 1

    const startDate = new Date(firstOfMonth)
    startDate.setDate(startDate.getDate() - mondayOffset)

    const endDay = lastOfMonth.getDay()
    const sundayOffset = endDay === 0 ? 0 : 7 - endDay
    const endDate = new Date(lastOfMonth)
    endDate.setDate(endDate.getDate() + sundayOffset)

    const days: Date[] = []
    const current = new Date(startDate)
    while (current <= endDate) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return days
  }, [year, month])

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragId(null)
    setDragOverDate(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(key)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverDate(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, date: Date) => {
    e.preventDefault()
    setDragOverDate(null)
    if (!dragId) return

    const newDateStr = dateKey(date)
    const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1
    const dayName = DAY_FULL_NAMES[dayIndex]

    const item = items.find(i => i.id === dragId)
    if (item && item.publish_date !== newDateStr) {
      onUpdate(dragId, { publish_date: newDateStr, day: dayName })
    }
    setDragId(null)
  }, [dragId, items, onUpdate])

  return (
    <div style={{ padding: '0 0 16px' }}>
      {/* Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '8px 0 12px',
      }}>
        <button
          onClick={prevMonth}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        >
          &larr;
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 140, textAlign: 'center' }}>
          {monthLabel}
        </span>
        <button
          onClick={nextMonth}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        >
          &rarr;
        </button>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
      }}>
        {/* Day name headers */}
        {DAY_NAMES.map(d => (
          <div
            key={d}
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: 6,
            }}
          >
            {d}
          </div>
        ))}

        {/* Calendar cells */}
        {cells.map((date) => {
          const key = dateKey(date)
          const isCurrentMonth = date.getMonth() === month
          const cellItems = dateItems[key] || []
          const isOver = dragOverDate === key

          return (
            <div
              key={key}
              onDragOver={(e) => handleDragOver(e, key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, date)}
              style={{
                background: 'var(--bg-card)',
                border: isOver
                  ? '2px dashed var(--accent)'
                  : '1px solid var(--border)',
                borderRadius: 6,
                minHeight: 70,
                padding: 4,
                transition: 'border 0.15s',
              }}
            >
              <div style={{
                fontSize: 9,
                color: 'var(--text-muted)',
                marginBottom: 3,
                opacity: isCurrentMonth ? 1 : 0.3,
              }}>
                {date.getDate()}
              </div>
              {cellItems.map(item => {
                const color = PILLAR_COLORS[item.pillar] || '#8892a8'
                const isDragging = dragId === item.id
                const abbrev = pillarAbbrev(item.pillar)
                const topicText = item.topic
                  ? (item.topic.length > 20 ? item.topic.substring(0, 20) + '\u2026' : item.topic)
                  : ''

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!dragId) onSelect(item)
                    }}
                    style={{
                      fontSize: 8,
                      padding: '2px 4px',
                      borderRadius: 3,
                      marginBottom: 2,
                      cursor: 'pointer',
                      borderLeft: `3px solid ${color}`,
                      background: color + '33',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      opacity: isDragging ? 0.4 : (isCurrentMonth ? 1 : 0.3),
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {abbrev}{abbrev && topicText ? ' ' : ''}{topicText}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
