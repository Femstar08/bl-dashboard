'use client'
import { useState, useCallback } from 'react'
import type { Requirement } from '@/lib/types-requirements'
import {
  REQ_PRIORITIES,
  REQ_STATUSES,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from '@/lib/types-requirements'

interface RequirementsTableProps {
  items: Requirement[]
  onSelect: (item: Requirement) => void
  onUpdate: (id: string, updates: Partial<Requirement>) => Promise<void>
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  onSelectAll: (ids: string[]) => void
}

type SortKey = 'ref_id' | 'phase' | 'requirement' | 'priority' | 'status' | 'complexity' | 'assigned_to'
type SortDir = 'asc' | 'desc'

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
const STATUS_ORDER: Record<string, number> = { Backlog: 0, Ready: 1, 'In Progress': 2, Review: 3, Done: 4, Blocked: 5 }
const COMPLEXITY_ORDER: Record<string, number> = { S: 0, M: 1, L: 2, XL: 3 }

function Badge({ label, colorMap }: { label: string; colorMap: Record<string, string> }) {
  const color = colorMap[label] || '#8892a8'
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600,
        background: `${color}33`,
        color,
      }}
    >
      {label}
    </span>
  )
}

export default function RequirementsTable({
  items,
  onSelect,
  onUpdate,
  selectedIds,
  onToggleSelect,
  onSelectAll,
}: RequirementsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('ref_id')
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
    if (sortKey === 'priority') {
      return ((PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)) * dir
    }
    if (sortKey === 'status') {
      return ((STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)) * dir
    }
    if (sortKey === 'complexity') {
      return ((COMPLEXITY_ORDER[a.complexity] ?? 99) - (COMPLEXITY_ORDER[b.complexity] ?? 99)) * dir
    }
    const aVal = String(a[sortKey] ?? '')
    const bVal = String(b[sortKey] ?? '')
    return aVal.localeCompare(bVal) * dir
  })

  const allSelected = items.length > 0 && items.every(i => selectedIds.includes(i.id))

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectAll([])
    } else {
      onSelectAll(items.map(i => i.id))
    }
  }

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
            <th style={{ ...thStyle, cursor: 'default', width: 36 }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                style={{ cursor: 'pointer' }}
              />
            </th>
            <th style={thStyle} onClick={() => handleSort('ref_id')}>
              ID{sortIndicator('ref_id')}
            </th>
            <th style={thStyle} onClick={() => handleSort('phase')}>
              Phase{sortIndicator('phase')}
            </th>
            <th style={{ ...thStyle, minWidth: 200 }} onClick={() => handleSort('requirement')}>
              Requirement{sortIndicator('requirement')}
            </th>
            <th style={thStyle} onClick={() => handleSort('priority')}>
              Priority{sortIndicator('priority')}
            </th>
            <th style={thStyle} onClick={() => handleSort('status')}>
              Status{sortIndicator('status')}
            </th>
            <th style={thStyle} onClick={() => handleSort('complexity')}>
              Complexity{sortIndicator('complexity')}
            </th>
            <th style={thStyle} onClick={() => handleSort('assigned_to')}>
              Assigned{sortIndicator('assigned_to')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(item => {
            const isSelected = selectedIds.includes(item.id)
            return (
              <tr
                key={item.id}
                onClick={() => onSelect(item)}
                style={{
                  cursor: 'pointer',
                  background: isSelected ? 'var(--bg-mid)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => {
                  if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-card)'
                }}
                onMouseLeave={e => {
                  if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
                }}
              >
                <td style={{ ...tdStyle, width: 36 }} onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(item.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td style={{ ...tdStyle, color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {item.ref_id}
                </td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{item.phase}</td>
                <td style={{ ...tdStyle, maxWidth: 300 }}>
                  <div style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.requirement}
                  </div>
                </td>
                <td style={tdStyle} onClick={e => e.stopPropagation()}>
                  <select
                    value={item.priority}
                    onChange={e => onUpdate(item.id, { priority: e.target.value as Requirement['priority'] })}
                    style={{
                      background: `${PRIORITY_COLORS[item.priority] || '#8892a8'}33`,
                      color: PRIORITY_COLORS[item.priority] || '#8892a8',
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
                    {REQ_PRIORITIES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </td>
                <td style={tdStyle} onClick={e => e.stopPropagation()}>
                  <select
                    value={item.status}
                    onChange={e => onUpdate(item.id, { status: e.target.value as Requirement['status'] })}
                    style={{
                      background: `${STATUS_COLORS[item.status] || '#8892a8'}33`,
                      color: STATUS_COLORS[item.status] || '#8892a8',
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
                    {REQ_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td style={tdStyle}>
                  <Badge label={item.complexity} colorMap={{ S: '#34D399', M: '#60a5fa', L: '#F59E0B', XL: '#F87171' }} />
                </td>
                <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 11 }}>
                  {item.assigned_to || '\u2014'}
                </td>
              </tr>
            )
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', padding: '24px 12px' }}>
                No requirements found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
