'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Requirement, Phase, Comment } from '@/lib/types-requirements'
import {
  REQ_PRIORITIES,
  REQ_STATUSES,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from '@/lib/types-requirements'
import KpiBar from '@/components/shared/KpiBar'
import ViewToggle from '@/components/shared/ViewToggle'
import FilterBar from '@/components/shared/FilterBar'
import RequirementsTable from '@/components/requirements/RequirementsTable'
import RequirementsKanban from '@/components/requirements/RequirementsKanban'
import PhaseCards from '@/components/requirements/PhaseCards'
import RequirementDetail from '@/components/requirements/RequirementDetail'
import RequirementsCalendar from '@/components/requirements/RequirementsCalendar'
import RequirementsDeps from '@/components/requirements/RequirementsDeps'
import UploadButton from '@/components/shared/UploadButton'
import ExportButton from '@/components/shared/ExportButton'

const VIEW_OPTIONS = [
  {
    key: 'table',
    label: 'Table',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
      </svg>
    ),
  },
  {
    key: 'kanban',
    label: 'Kanban',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="5" height="18" rx="1" />
        <rect x="10" y="3" width="5" height="12" rx="1" />
        <rect x="17" y="3" width="5" height="15" rx="1" />
      </svg>
    ),
  },
  {
    key: 'calendar',
    label: 'Calendar',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="16" y1="2" x2="16" y2="6" />
      </svg>
    ),
  },
  {
    key: 'deps',
    label: 'Dependencies',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="12" cy="18" r="3" />
        <line x1="8.5" y1="7.5" x2="10.5" y2="16" />
        <line x1="15.5" y1="7.5" x2="13.5" y2="16" />
      </svg>
    ),
  },
]

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({})
  const [selectedItem, setSelectedItem] = useState<Requirement | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentView, setCurrentView] = useState('table')
  const [activePhase, setActivePhase] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchRequirements = useCallback(async () => {
    const { data } = await supabase
      .from('bl_requirements')
      .select('*')
      .order('ref_id')
    if (data) setRequirements(data)
  }, [])

  const fetchPhases = useCallback(async () => {
    const { data } = await supabase
      .from('bl_phases')
      .select('*')
      .order('phase')
    if (data) setPhases(data)
  }, [])

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('bl_comments')
      .select('*')
      .eq('entity_type', 'requirement')
    if (data) setComments(data)
  }, [])

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      await Promise.all([fetchRequirements(), fetchPhases(), fetchComments()])
      setLoading(false)
    }
    loadAll()
  }, [fetchRequirements, fetchPhases, fetchComments])

  // CRUD handlers
  const onUpdate = useCallback(async (id: string, updates: Partial<Requirement>) => {
    await supabase.from('bl_requirements').update(updates).eq('id', id)
    await fetchRequirements()
    // If the detail panel is open for this item, refresh selected item too
    setSelectedItem(prev => {
      if (prev && prev.id === id) {
        const updated = { ...prev, ...updates }
        return updated as Requirement
      }
      return prev
    })
  }, [fetchRequirements])

  const onDelete = useCallback(async (id: string) => {
    await supabase.from('bl_requirements').delete().eq('id', id)
    await fetchRequirements()
    setSelectedItem(null)
  }, [fetchRequirements])

  const onCreate = useCallback(async () => {
    const nextNum = requirements.length + 1
    const refId = `R${String(nextNum).padStart(3, '0')}`
    await supabase.from('bl_requirements').insert({
      ref_id: refId,
      phase: 'Phase 0',
      domain: '',
      requirement: 'New requirement',
      type: '',
      priority: 'Medium',
      status: 'Backlog',
      assigned_to: null,
      complexity: 'M',
      dependencies: [],
      acceptance_criteria: null,
      saas_tier_gate: 'All Tiers',
      upgrade_feature: false,
      notes: null,
      source: 'manual',
    })
    await fetchRequirements()
  }, [requirements.length, fetchRequirements])

  const handleSeed = useCallback(async () => {
    const { SEED_REQUIREMENTS, SEED_PHASES } = await import('@/lib/seed-data')
    await supabase.from('bl_requirements').insert(SEED_REQUIREMENTS)
    await supabase.from('bl_phases').insert(SEED_PHASES)
    await Promise.all([fetchRequirements(), fetchPhases()])
  }, [fetchRequirements, fetchPhases])

  // Filter logic
  const filteredItems = useMemo(() => {
    return requirements.filter(item => {
      // Phase card filter
      if (activePhase && item.phase !== activePhase) return false
      for (const [key, values] of Object.entries(activeFilters)) {
        if (values.length === 0) continue
        const itemVal = String((item as unknown as Record<string, unknown>)[key] ?? '')
        if (!values.includes(itemVal)) return false
      }
      return true
    })
  }, [requirements, activeFilters, activePhase])

  // Derive filter options
  const filterDefs = useMemo(() => {
    const unique = (field: keyof Requirement) => {
      const vals = requirements.map(r => String(r[field] ?? '')).filter(Boolean)
      return Array.from(new Set(vals)).sort()
    }
    return [
      { key: 'phase', label: 'Phase', options: unique('phase') },
      { key: 'domain', label: 'Domain', options: unique('domain') },
      { key: 'priority', label: 'Priority', options: [...REQ_PRIORITIES] },
      { key: 'status', label: 'Status', options: [...REQ_STATUSES] },
      { key: 'assigned_to', label: 'Assigned', options: unique('assigned_to') },
      { key: 'complexity', label: 'Complexity', options: unique('complexity') },
      { key: 'saas_tier_gate', label: 'Tier Gate', options: unique('saas_tier_gate') },
    ]
  }, [requirements])

  // KPI computation
  const kpis = useMemo(() => {
    const items: { label: string; value: number | string; color?: string }[] = [
      { label: 'Total', value: filteredItems.length },
    ]
    for (const p of REQ_PRIORITIES) {
      items.push({
        label: p,
        value: filteredItems.filter(i => i.priority === p).length,
        color: PRIORITY_COLORS[p],
      })
    }
    for (const s of REQ_STATUSES) {
      items.push({
        label: s,
        value: filteredItems.filter(i => i.status === s).length,
        color: STATUS_COLORS[s],
      })
    }
    return items
  }, [filteredItems])

  const handleFilterChange = useCallback((key: string, values: string[]) => {
    setActiveFilters(prev => ({ ...prev, [key]: values }))
  }, [])

  const handleClearFilters = useCallback(() => {
    setActiveFilters({})
  }, [])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }, [])

  const handleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds(ids)
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        Loading requirements...
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {/* Title bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 16px 12px',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Requirements
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {requirements.length === 0 && (
            <button
              onClick={handleSeed}
              style={{
                padding: '7px 14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Seed Data
            </button>
          )}
          <ExportButton
            data={filteredItems}
            columns={[
              { key: 'ref_id', label: 'ID' },
              { key: 'phase', label: 'Phase' },
              { key: 'domain', label: 'Domain' },
              { key: 'requirement', label: 'Requirement' },
              { key: 'priority', label: 'Priority' },
              { key: 'status', label: 'Status' },
              { key: 'complexity', label: 'Complexity' },
              { key: 'assigned_to', label: 'Assigned' },
            ]}
            filename="requirements-export"
            title="Requirements Status Report"
            comments={comments}
            phases={phases}
            entityType="requirement"
          />
          <UploadButton entityType="requirement" onImportComplete={fetchRequirements} />
          <button
            onClick={onCreate}
            style={{
              padding: '7px 14px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 8,
              color: 'var(--bg-primary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Add Requirement
          </button>
        </div>
      </div>

      {/* KPI Bar */}
      <KpiBar items={kpis} />

      {/* Phase Cards */}
      <PhaseCards
        phases={phases}
        requirements={requirements}
        activePhase={activePhase}
        onPhaseClick={setActivePhase}
      />

      {/* View Toggle + Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <ViewToggle
            views={VIEW_OPTIONS}
            storageKey="req-view"
            defaultView="table"
            onViewChange={setCurrentView}
          />
          <FilterBar
            filters={filterDefs}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearFilters}
          />
        </div>
        {selectedIds.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {selectedIds.length} selected
          </span>
        )}
      </div>

      {/* Active View */}
      {currentView === 'table' ? (
        <RequirementsTable
          items={filteredItems}
          onSelect={setSelectedItem}
          onUpdate={onUpdate}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
        />
      ) : currentView === 'kanban' ? (
        <RequirementsKanban
          items={filteredItems}
          onSelect={setSelectedItem}
          onUpdate={onUpdate}
        />
      ) : currentView === 'calendar' ? (
        <RequirementsCalendar
          items={filteredItems}
          phases={phases}
          onSelect={setSelectedItem}
        />
      ) : currentView === 'deps' ? (
        <RequirementsDeps
          items={filteredItems}
          onSelect={setSelectedItem}
        />
      ) : null}

      {/* Detail Panel */}
      {selectedItem && (
        <RequirementDetail
          item={selectedItem}
          comments={comments}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={() => setSelectedItem(null)}
          onRefreshComments={fetchComments}
        />
      )}
    </div>
  )
}
