'use client'
import { useState, useMemo } from 'react'
import type { Requirement, Phase } from '@/lib/types-requirements'

interface RequirementsCalendarProps {
  items: Requirement[]
  phases: Phase[]
  onSelect: (item: Requirement) => void
}

const PHASE_COLORS = ['#53E9C5', '#7C8CF8', '#F59E0B', '#60a5fa', '#F87171', '#34D399', '#a78bfa', '#fb923c']

const BASE_DATE = new Date(2026, 3, 6) // Monday 2026-04-06

function parseWeekTarget(weekTarget: string): { start: Date; end: Date } | null {
  if (!weekTarget) return null
  if (weekTarget === 'NOW') {
    return {
      start: new Date(BASE_DATE),
      end: new Date(BASE_DATE.getTime() + 6 * 86400000),
    }
  }
  const match = weekTarget.match(/Week\s+(\d+)-(\d+)/i)
  if (match) {
    const x = parseInt(match[1], 10)
    const y = parseInt(match[2], 10)
    return {
      start: new Date(BASE_DATE.getTime() + (x - 1) * 7 * 86400000),
      end: new Date(BASE_DATE.getTime() + (y * 7 - 1) * 86400000),
    }
  }
  return null
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function RequirementsCalendar({ items, phases, onSelect }: RequirementsCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 3, 1)) // April 2026

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // Map phase names to colors
  const phaseColorMap = useMemo(() => {
    const uniquePhases = Array.from(new Set(phases.map(p => p.phase))).sort()
    const map: Record<string, string> = {}
    uniquePhases.forEach((p, i) => {
      map[p] = PHASE_COLORS[i % PHASE_COLORS.length]
    })
    return map
  }, [phases])

  // Map phase names to their week_target
  const phaseWeekMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of phases) {
      map[p.phase] = p.week_target
    }
    return map
  }, [phases])

  // Place requirements on dates
  const dateRequirements = useMemo(() => {
    const map: Record<string, Requirement[]> = {}

    // Group items by phase
    const byPhase: Record<string, Requirement[]> = {}
    for (const item of items) {
      if (!byPhase[item.phase]) byPhase[item.phase] = []
      byPhase[item.phase].push(item)
    }

    for (const [phase, reqs] of Object.entries(byPhase)) {
      const weekTarget = phaseWeekMap[phase]
      if (!weekTarget) continue
      const range = parseWeekTarget(weekTarget)
      if (!range) continue

      // Compute total days in range
      const totalDays = Math.round((range.end.getTime() - range.start.getTime()) / 86400000) + 1

      // Distribute requirements across the days
      reqs.forEach((req, idx) => {
        const dayOffset = totalDays > 0 ? idx % totalDays : 0
        const d = new Date(range.start.getTime() + dayOffset * 86400000)
        const key = dateKey(d)
        if (!map[key]) map[key] = []
        map[key].push(req)
      })
    }

    return map
  }, [items, phaseWeekMap])

  // Generate calendar cells
  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1)
    const lastOfMonth = new Date(year, month + 1, 0)

    // Monday = 1, Sunday = 7 (ISO)
    let startDay = firstOfMonth.getDay() // 0=Sun
    // Convert to Monday-start: Mon=0, Tue=1, ..., Sun=6
    const mondayOffset = startDay === 0 ? 6 : startDay - 1

    const startDate = new Date(firstOfMonth)
    startDate.setDate(startDate.getDate() - mondayOffset)

    let endDay = lastOfMonth.getDay()
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

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div style={{ padding: '0 16px 16px' }}>
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
          const reqs = dateRequirements[key] || []
          const visible = reqs.slice(0, 3)
          const remaining = reqs.length - 3

          return (
            <div
              key={key}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                minHeight: 60,
                padding: 4,
                opacity: isCurrentMonth ? 1 : undefined,
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
              {visible.map(req => (
                <div
                  key={req.id}
                  onClick={() => onSelect(req)}
                  style={{
                    fontSize: 8,
                    padding: '2px 4px',
                    borderRadius: 3,
                    marginBottom: 2,
                    cursor: 'pointer',
                    color: '#fff',
                    background: phaseColorMap[req.phase] || '#8892a8',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    opacity: isCurrentMonth ? 1 : 0.3,
                  }}
                >
                  {req.ref_id}
                </div>
              ))}
              {remaining > 0 && (
                <div style={{
                  fontSize: 7,
                  color: 'var(--text-muted)',
                  opacity: isCurrentMonth ? 1 : 0.3,
                }}>
                  +{remaining} more
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
