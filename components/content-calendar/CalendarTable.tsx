'use client'
import { useState, useCallback } from 'react'
import type { ContentCalendarItem } from '@/lib/types-requirements'
import { CAL_STATUSES, CAL_STATUS_COLORS, PILLAR_COLORS } from '@/lib/types-requirements'

interface CalendarTableProps {
  items: ContentCalendarItem[]
  onSelect: (item: ContentCalendarItem) => void
  onUpdate: (id: string, updates: Partial<ContentCalendarItem>) => Promise<void>
}

type SortKey = 'week' | 'publish_date' | 'day' | 'channel' | 'pillar' | 'topic' | 'status'
type SortDir = 'asc' | 'desc'

const STATUS_ORDER: Record<string, number> = {
  'To Draft': 0,
  Drafting: 1,
  Review: 2,
  Scheduled: 3,
  Published: 4,
}

export default function CalendarTable({ items, onSelect, onUpdate }: CalendarTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('publish_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
        return key
      }
      setSortDir('asc')
      return key
    })
  }, [])

  const sorted = [...items].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'week') {
      return (a.week - b.week) * dir
    }
    if (sortKey === 'status') {
      return ((STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)) * dir
    }
    const aVal = String(a[sortKey] ?? '')
    const bVal = String(b[sortKey] ?? '')
    return aVal.localeCompare(bVal) * dir
  })

  const thStyle: React.CSSProperties = {
    fontSize: 10,
    color: 'var(--text-muted)',
    textAlign: 'left',
    padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  }

  const tdStyle: React.CSSProperties = {
    fontSize: 11,
    padding: '8px 12px',
    borderBottom: '1px solid rgba(var(--border-rgb, 128,128,128), 0.2)',
    color: 'var(--text-primary)',
  }

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC'
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle} onClick={() => handleSort('week')}>
              Week{sortIndicator('week')}
            </th>
            <th style={thStyle} onClick={() => handleSort('publish_date')}>
              Date{sortIndicator('publish_date')}
            </th>
            <th style={thStyle} onClick={() => handleSort('day')}>
              Day{sortIndicator('day')}
            </th>
            <th style={thStyle} onClick={() => handleSort('channel')}>
              Channel{sortIndicator('channel')}
            </th>
            <th style={thStyle} onClick={() => handleSort('pillar')}>
              Pillar{sortIndicator('pillar')}
            </th>
            <th style={{ ...thStyle, minWidth: 200 }} onClick={() => handleSort('topic')}>
              Topic{sortIndicator('topic')}
            </th>
            <th style={thStyle} onClick={() => handleSort('status')}>
              Status{sortIndicator('status')}
            </th>
            <th style={{ ...thStyle, cursor: 'default', width: 32 }} />
          </tr>
        </thead>
        <tbody>
          {sorted.map(item => (
            <tr
              key={item.id}
              onClick={() => onSelect(item)}
              style={{
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-card)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
              }}
            >
              <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--accent)' }}>
                {item.week}
              </td>
              <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                {item.publish_date
                  ? new Date(item.publish_date + 'T00:00:00').toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : '\u2014'}
              </td>
              <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{item.day}</td>
              <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{item.channel}</td>
              <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                <span style={{ color: PILLAR_COLORS[item.pillar] || 'var(--text-primary)' }}>
                  {item.pillar}
                </span>
              </td>
              <td style={{ ...tdStyle, maxWidth: 300 }}>
                <div
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.topic && item.topic.length > 50
                    ? item.topic.substring(0, 50) + '\u2026'
                    : item.topic}
                </div>
              </td>
              <td style={tdStyle} onClick={e => e.stopPropagation()}>
                <select
                  value={item.status}
                  onChange={e =>
                    onUpdate(item.id, {
                      status: e.target.value as ContentCalendarItem['status'],
                    })
                  }
                  style={{
                    background: `${CAL_STATUS_COLORS[item.status] || '#8892a8'}33`,
                    color: CAL_STATUS_COLORS[item.status] || '#8892a8',
                    border: 'none',
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                >
                  {CAL_STATUSES.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td style={{ ...tdStyle, width: 32 }}>
                <div
                  title={item.source === 'sync' ? 'Via Google Sheet' : item.source === 'upload' ? 'Via Excel Upload' : 'Edited in Dashboard'}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: item.source === 'sync' ? '#34D399' : item.source === 'upload' ? '#60a5fa' : '#7C8CF8',
                  }}
                />
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td
                colSpan={8}
                style={{
                  ...tdStyle,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  padding: '24px 12px',
                }}
              >
                No posts found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
