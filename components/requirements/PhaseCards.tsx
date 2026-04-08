'use client'
import type { Phase, Requirement } from '@/lib/types-requirements'

interface PhaseCardsProps {
  phases: Phase[]
  requirements: Requirement[]
  activePhase: string | null
  onPhaseClick: (phase: string | null) => void
}

export default function PhaseCards({ phases, requirements, activePhase, onPhaseClick }: PhaseCardsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '12px 16px',
        overflowX: 'auto',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {phases.map(phase => {
        const phaseReqs = requirements.filter(r => r.phase === phase.phase)
        const total = phaseReqs.length
        const doneCount = phaseReqs.filter(r => r.status === 'Done').length
        const criticalCount = phaseReqs.filter(r => r.priority === 'Critical').length
        const pct = total > 0 ? (doneCount / total) * 100 : 0
        const isActive = activePhase === phase.phase

        return (
          <div
            key={phase.id}
            onClick={() => onPhaseClick(isActive ? null : phase.phase)}
            style={{
              minWidth: 120,
              flexShrink: 0,
              padding: '8px 12px',
              background: isActive ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-card))' : 'var(--bg-card)',
              border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                {phase.phase}
              </span>
              {criticalCount > 0 && (
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: '#fff',
                    background: '#F87171',
                    borderRadius: 99,
                    padding: '1px 5px',
                    lineHeight: '14px',
                  }}
                >
                  {criticalCount}
                </span>
              )}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
              {phase.description}
            </div>
            {/* Progress bar */}
            <div
              style={{
                height: 4,
                background: 'var(--border)',
                borderRadius: 2,
                marginTop: 6,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'var(--accent)',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 3 }}>
              {doneCount}/{total} done
            </div>
          </div>
        )
      })}
    </div>
  )
}
