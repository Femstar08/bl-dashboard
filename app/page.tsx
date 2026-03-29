'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { DEFAULT_CONTENT } from '@/lib/defaults'
import { ContentItem, ContentStatus } from '@/lib/types'
import { supabase } from '@/lib/supabase'

// ── Types ────────────────────────────────────────────────────────
interface DbLead {
  id: string
  name: string | null
  company_name: string | null
  status: string
  business_type: string | null
  notes: string | null
  source: string | null
  revenue: number | null
  annual_turnover: number | null
  created_at: string
}

interface DbRoadmap {
  id: string
  title: string
  description: string | null
  status: string
  category: string | null
  week: number | null
  track: string | null
  sort_order: number
  done: boolean
}

interface DbRevenue {
  id: string
  consulting_target: number
  saas_target: number
  updated_at: string
}

// ── Lead pipeline stages (canonical order) ───────────────────────
const LEAD_STAGES = ['Discovery', 'Proposal', 'Negotiation', 'Signed', 'Lost'] as const
type LeadStage = typeof LEAD_STAGES[number]

const LEAD_STAGE_COLORS: Record<LeadStage, string> = {
  Discovery: '#7C8CF8',
  Proposal: '#F59E0B',
  Negotiation: '#F97316',
  Signed: '#34D399',
  Lost: '#F87171',
}

const LEAD_SOURCES = ['CompanyQuery', 'LinkedIn', 'Referral', 'Inbound', 'Event', 'Manual'] as const
type LeadSource = typeof LEAD_SOURCES[number]

const SOURCE_COLORS: Record<string, string> = {
  CompanyQuery: '#53E9C5',
  LinkedIn: '#7C8CF8',
  Referral: '#F59E0B',
  Inbound: '#34D399',
  Event: '#F97316',
  Manual: '#8892A4',
  'Companies House Search': '#53E9C5',
  'ai_onboarding': '#A78BFA',
}

// ── Shared styles ────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 24,
  transition: 'transform 0.3s',
}

const inputStyle = (small?: boolean): React.CSSProperties => ({
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  padding: small ? '6px 10px' : '8px 12px',
  fontSize: small ? 12 : 13,
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
})

const selectStyle: React.CSSProperties = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  padding: '8px 12px',
  fontSize: 13,
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
}

function Input({ value, onChange, placeholder, type = 'text', small, onBlur }: { value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; small?: boolean; onBlur?: () => void }) {
  return <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} onBlur={onBlur} style={inputStyle(small)} />
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle}>{options.map(o => <option key={o}>{o}</option>)}</select>
}

function Btn({ onClick, children, variant = 'ghost', small }: { onClick?: () => void; children: React.ReactNode; variant?: 'ghost' | 'primary' | 'danger'; small?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    ghost: { background: 'var(--bg-primary)', color: 'var(--text-muted)', border: '1px solid var(--border)' },
    primary: { background: 'var(--accent)', color: 'var(--bg-primary)', border: '1px solid var(--accent)' },
    danger: { background: 'transparent', color: '#F87171', border: '1px solid rgba(248,113,113,0.4)' },
  }
  return (
    <button onClick={onClick} style={{ ...styles[variant], padding: small ? '4px 10px' : '8px 16px', borderRadius: 8, fontSize: small ? 11 : 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit', transition: 'opacity 0.15s' }}>
      {children}
    </button>
  )
}

function SourceTag({ source }: { source: string | null }) {
  if (!source) return null
  const color = SOURCE_COLORS[source] || 'var(--text-muted)'
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: color + '22', color, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {source}
    </span>
  )
}

// ── KPI BAR ───────────────────────────────────────────────────────
function KpiBar({ leads, milestones, content, consultingTarget }: { leads: DbLead[]; milestones: DbRoadmap[]; content: ContentItem[]; consultingTarget: number }) {
  const signedMrr = leads.filter(l => l.status === 'Signed').reduce((s, l) => s + (l.revenue || 0), 0)
  const pct = consultingTarget > 0 ? Math.min(100, Math.round((signedMrr / consultingTarget) * 100)) : 0
  const done = milestones.filter(m => m.done).length
  const published = content.filter(c => c.status === 'Published').length
  const active = leads.filter(l => !['Lost', 'Dead', 'Passed'].includes(l.status)).length

  const mkCard = (icon: string, badgeText: string, title: string, value: string | number) => (
    <div style={{ ...cardStyle, cursor: 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <span className="material-symbols-outlined" style={{ color: 'var(--accent)' }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--accent)', color: 'var(--bg-primary)' }}>{badgeText}</span>
      </div>
      <h3 style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{title}</h3>
      <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )

  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
      {mkCard('payments', `${pct}%`, 'MRR (signed)', `£${signedMrr.toLocaleString()}`)}
      {mkCard('group', String(active), 'Active leads', active)}
      {mkCard('task_alt', `${Math.round(done/(milestones.length || 1)*100)}%`, 'Milestones done', `${done}/${milestones.length}`)}
      {mkCard('article', String(published), 'Posts published', published)}
    </section>
  )
}

// ── KANBAN PIPELINE (drag & drop + full CRUD) ────────────────────
function Pipeline({ leads, onUpdate, onAdd, onEdit, onDelete }: {
  leads: DbLead[]
  onUpdate: (id: string, updates: Partial<DbLead>) => void
  onAdd: (lead: { company_name: string; business_type: string; status: string; notes: string; source: string }) => void
  onEdit: (id: string, updates: Partial<DbLead>) => void
  onDelete: (id: string) => void
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', type: 'SME', stage: 'Discovery' as string, note: '', source: 'Manual' as string })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ company_name: string; business_type: string; notes: string; source: string; revenue: string }>({ company_name: '', business_type: '', notes: '', source: '', revenue: '' })
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  function handleAdd() {
    if (!addForm.name.trim()) return
    onAdd({ company_name: addForm.name, business_type: addForm.type, status: addForm.stage, notes: addForm.note, source: addForm.source })
    setAddForm({ name: '', type: 'SME', stage: 'Discovery', note: '', source: 'Manual' })
    setAddOpen(false)
  }

  function startEdit(lead: DbLead) {
    setEditingId(lead.id)
    setEditForm({
      company_name: lead.company_name || '',
      business_type: lead.business_type || 'SME',
      notes: lead.notes || '',
      source: lead.source || 'Manual',
      revenue: lead.revenue ? String(lead.revenue) : '',
    })
  }

  function saveEdit() {
    if (!editingId) return
    onEdit(editingId, {
      company_name: editForm.company_name,
      business_type: editForm.business_type,
      notes: editForm.notes,
      source: editForm.source,
      revenue: Number(editForm.revenue) || null,
    })
    setEditingId(null)
  }

  // ── Drag handlers ──
  function onDragStart(e: React.DragEvent, id: string) {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.4'
    }
  }

  function onDragEnd(e: React.DragEvent) {
    setDragId(null)
    setDragOverStage(null)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }

  function onDragOver(e: React.DragEvent, stage: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stage)
  }

  function onDragLeave() {
    setDragOverStage(null)
  }

  function onDrop(e: React.DragEvent, stage: string) {
    e.preventDefault()
    setDragOverStage(null)
    if (dragId) {
      const lead = leads.find(l => l.id === dragId)
      if (lead && lead.status !== stage) {
        onUpdate(dragId, { status: stage })
      }
    }
    setDragId(null)
  }

  const stageColor = (stage: string) => LEAD_STAGE_COLORS[stage as LeadStage] || 'var(--text-muted)'

  return (
    <section style={{ gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Sales Pipeline</h2>
        <button onClick={() => setAddOpen(!addOpen)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Add Lead
        </button>
      </div>

      {/* Add lead form */}
      {addOpen && (
        <div style={{ ...cardStyle, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Input placeholder="Company name" value={addForm.name} onChange={v => setAddForm({ ...addForm, name: v })} />
          <Select value={addForm.type} onChange={v => setAddForm({ ...addForm, type: v })} options={['Accountant', 'SME']} />
          <Select value={addForm.stage} onChange={v => setAddForm({ ...addForm, stage: v })} options={[...LEAD_STAGES]} />
          <Select value={addForm.source} onChange={v => setAddForm({ ...addForm, source: v })} options={[...LEAD_SOURCES]} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input placeholder="Notes (optional)" value={addForm.note} onChange={v => setAddForm({ ...addForm, note: v })} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="primary" onClick={handleAdd}>Save</Btn>
            <Btn onClick={() => setAddOpen(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }} className="custom-scrollbar">
        {LEAD_STAGES.map(stage => {
          const stageLeads = leads.filter(l => l.status === stage)
          const isOver = dragOverStage === stage
          const color = stageColor(stage)

          return (
            <div
              key={stage}
              onDragOver={e => onDragOver(e, stage)}
              onDragLeave={onDragLeave}
              onDrop={e => onDrop(e, stage)}
              style={{
                flexShrink: 0,
                width: 260,
                minHeight: 200,
                background: isOver ? color + '11' : 'transparent',
                borderRadius: 12,
                transition: 'background 0.15s',
                border: isOver ? `2px dashed ${color}44` : '2px dashed transparent',
              }}
            >
              {/* Column header */}
              <div style={{ background: 'var(--bg-mid)', padding: '10px 14px', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `3px solid ${color}` }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color }}>{stage}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: color + '22', color }}>{stageLeads.length}</span>
              </div>

              {/* Cards */}
              <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 100 }}>
                {stageLeads.map(lead => {
                  const isEditing = editingId === lead.id
                  const isDragging = dragId === lead.id

                  if (isEditing) {
                    return (
                      <div key={lead.id} style={{ ...cardStyle, padding: 12, borderLeft: `4px solid ${color}` }}>
                        <Input small placeholder="Company name" value={editForm.company_name} onChange={v => setEditForm({ ...editForm, company_name: v })} />
                        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <Select value={editForm.business_type} onChange={v => setEditForm({ ...editForm, business_type: v })} options={['Accountant', 'SME']} />
                          <Select value={editForm.source} onChange={v => setEditForm({ ...editForm, source: v })} options={[...LEAD_SOURCES, 'Companies House Search', 'ai_onboarding']} />
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <Input small placeholder="Revenue (£/mo)" type="number" value={editForm.revenue} onChange={v => setEditForm({ ...editForm, revenue: v })} />
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <Input small placeholder="Notes" value={editForm.notes} onChange={v => setEditForm({ ...editForm, notes: v })} />
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <Btn small variant="primary" onClick={saveEdit}>Save</Btn>
                          <Btn small onClick={() => setEditingId(null)}>Cancel</Btn>
                          <Btn small variant="danger" onClick={() => { onDelete(lead.id); setEditingId(null) }}>Delete</Btn>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={e => onDragStart(e, lead.id)}
                      onDragEnd={onDragEnd}
                      style={{
                        ...cardStyle,
                        padding: 14,
                        borderLeft: `4px solid ${color}`,
                        cursor: isDragging ? 'grabbing' : 'grab',
                        opacity: isDragging ? 0.4 : 1,
                        userSelect: 'none',
                      }}
                    >
                      {/* Name + edit button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, flex: 1 }}>
                          {lead.company_name || lead.name || 'Unnamed'}
                        </p>
                        <button
                          onClick={() => startEdit(lead)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                          title="Edit lead"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                        </button>
                      </div>

                      {/* Source + type tags */}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                        <SourceTag source={lead.source} />
                        {lead.business_type && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-mid)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {lead.business_type}
                          </span>
                        )}
                      </div>

                      {/* Revenue if set */}
                      {(lead.revenue || 0) > 0 && (
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>
                          £{(lead.revenue || 0).toLocaleString()}/mo
                        </div>
                      )}

                      {/* Notes */}
                      {lead.notes && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 4 }}>{lead.notes}</p>
                      )}

                      {/* Date */}
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.7 }}>
                        {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  )
                })}

                {/* Empty state per column */}
                {stageLeads.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, opacity: 0.5 }}>
                    Drop leads here
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Leads outside canonical stages */}
      {(() => {
        const stageSet = new Set(LEAD_STAGES as readonly string[])
        const unmapped = leads.filter(l => !stageSet.has(l.status))
        if (unmapped.length === 0) return null
        return (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Unmapped ({unmapped.length}) — drag to a stage above to categorise
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {unmapped.map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={e => onDragStart(e, lead.id)}
                  onDragEnd={onDragEnd}
                  style={{
                    ...cardStyle,
                    padding: '8px 14px',
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderLeft: '4px solid var(--text-muted)',
                    opacity: dragId === lead.id ? 0.4 : 1,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{lead.company_name || lead.name || 'Unnamed'}</span>
                  <SourceTag source={lead.source} />
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-mid)', color: 'var(--text-muted)' }}>{lead.status}</span>
                  <button onClick={() => startEdit(lead)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </section>
  )
}

// ── REVENUE TRACKER ───────────────────────────────────────────────
function RevenueTracker({ leads, revenue, onUpdateTarget }: {
  leads: DbLead[]
  revenue: DbRevenue
  onUpdateTarget: (field: 'consulting_target' | 'saas_target', value: number) => void
}) {
  const signedMrr = leads.filter(l => l.status === 'Signed').reduce((s, l) => s + (l.revenue || 0), 0)
  const pctConsulting = revenue.consulting_target > 0 ? Math.min(100, (signedMrr / revenue.consulting_target) * 100) : 0
  const pctSaas = revenue.saas_target > 0 ? Math.min(100, (0 / revenue.saas_target) * 100) : 0
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedUpdate = (field: 'consulting_target' | 'saas_target', value: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onUpdateTarget(field, value), 600)
  }

  return (
    <section style={cardStyle}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>Revenue Targets</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Consulting MRR</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>£{signedMrr.toLocaleString()} / £{revenue.consulting_target.toLocaleString()}</span>
          </div>
          <div style={{ width: '100%', background: 'var(--bg-primary)', height: 10, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ background: 'var(--accent)', height: '100%', width: `${pctConsulting}%`, transition: 'width 1s', borderRadius: 99 }} />
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>SaaS ARR (pilot)</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>£0 / £{revenue.saas_target.toLocaleString()}</span>
          </div>
          <div style={{ width: '100%', background: 'var(--bg-primary)', height: 10, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ background: 'var(--accent)', height: '100%', width: `${pctSaas}%`, opacity: 0.6, transition: 'width 1s', borderRadius: 99 }} />
          </div>
        </div>
        <div style={{ paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, display: 'block' }}>Consulting Target</label>
            <Input small value={revenue.consulting_target} onChange={v => debouncedUpdate('consulting_target', Number(v) || 0)} type="number" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, display: 'block' }}>SaaS Target</label>
            <Input small value={revenue.saas_target} onChange={v => debouncedUpdate('saas_target', Number(v) || 0)} type="number" />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── MILESTONES ────────────────────────────────────────────────────
function Milestones({ milestones, onToggle }: { milestones: DbRoadmap[]; onToggle: (id: string, done: boolean) => void }) {
  const tracks = ['Marketing', 'Platform', 'Consulting'] as const

  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>30-Day Milestones</h2>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
          {milestones.filter(m => m.done).length} done
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {tracks.map(track => {
          const trackMilestones = milestones.filter(m => m.track === track)
          if (trackMilestones.length === 0) return null
          return (
            <div key={track}>
              <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: 12 }}>{track}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {trackMilestones.map(m => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={m.done} onChange={() => onToggle(m.id, !m.done)} style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
                    <div>
                      <span style={{ fontSize: 13, color: m.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: m.done ? 'line-through' : 'none', transition: 'color 0.15s' }}>{m.title}</span>
                      {m.description && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.description}</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── CONTENT QUEUE ─────────────────────────────────────────────────
function ContentQueue({ content, setContent }: { content: ContentItem[]; setContent: (c: ContentItem[]) => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ channel: 'Femi', topic: '', status: 'Draft', scheduledDate: '', note: '' })

  function add() {
    if (!form.topic.trim()) return
    setContent([...content, { id: Date.now().toString(), channel: form.channel as ContentItem['channel'], topic: form.topic, status: form.status as ContentStatus, scheduledDate: form.scheduledDate, note: form.note }])
    setForm({ channel: 'Femi', topic: '', status: 'Draft', scheduledDate: '', note: '' })
    setOpen(false)
  }

  const statusColor = (s: string) => s === 'Published' ? 'var(--accent)' : s === 'Queued' ? '#F59E0B' : 'var(--text-muted)'

  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Content Queue</h2>
        <button onClick={() => setOpen(!open)} style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8, background: 'var(--bg-primary)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}>Add Post</button>
      </div>

      {open && (
        <div style={{ ...cardStyle, background: 'var(--bg-primary)', marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Select value={form.channel} onChange={v => setForm({ ...form, channel: v })} options={['Femi', 'B&L']} />
          <Select value={form.status} onChange={v => setForm({ ...form, status: v })} options={['Draft', 'Queued', 'Published']} />
          <Input placeholder="Scheduled Date" type="date" value={form.scheduledDate} onChange={v => setForm({ ...form, scheduledDate: v })} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input placeholder="Topic / post idea" value={form.topic} onChange={v => setForm({ ...form, topic: v })} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="primary" onClick={add}>Save</Btn>
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Channel', 'Topic', 'Status', 'Date', ''].map(h => (
                <th key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: 12, color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>No content found. Add a post idea.</td></tr>
            )}
            {content.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 99, background: item.channel === 'Femi' ? 'var(--text-primary)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--bg-primary)' }}>
                      {item.channel === 'Femi' ? 'F' : 'BL'}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{item.channel}</span>
                  </div>
                </td>
                <td style={{ padding: 12, fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{item.topic}</td>
                <td style={{ padding: 12 }}>
                  <select
                    value={item.status}
                    onChange={e => setContent(content.map(c => c.id === item.id ? { ...c, status: e.target.value as ContentStatus } : c))}
                    style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', background: statusColor(item.status) + '22', color: statusColor(item.status), fontFamily: 'inherit' }}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Queued">Queued</option>
                    <option value="Published">Published</option>
                  </select>
                </td>
                <td style={{ padding: 12, fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{item.scheduledDate || '-'}</td>
                <td style={{ padding: 12, textAlign: 'right' }}>
                  <button onClick={() => setContent(content.filter(c => c.id !== item.id))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── ROOT PAGE ─────────────────────────────────────────────────────
export default function Dashboard() {
  const [leads, setLeads] = useState<DbLead[]>([])
  const [milestones, setMilestones] = useState<DbRoadmap[]>([])
  const [revenue, setRevenue] = useState<DbRevenue>({ id: '', consulting_target: 10500, saas_target: 10000, updated_at: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [content, setContentRaw, contentLoaded] = useLocalStorage('bl_content', DEFAULT_CONTENT)
  const setContent = (c: ContentItem[]) => setContentRaw(c)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [leadsRes, revenueRes, roadmapRes] = await Promise.all([
        supabase.from('leads').select('id,name,company_name,status,business_type,notes,source,revenue,annual_turnover,created_at').order('created_at', { ascending: false }),
        supabase.from('bl_revenue_targets').select('*').limit(1).single(),
        supabase.from('roadmap').select('*').not('week', 'is', null).order('week').order('sort_order'),
      ])

      if (leadsRes.error) throw leadsRes.error
      if (revenueRes.error && revenueRes.error.code !== 'PGRST116') throw revenueRes.error
      if (roadmapRes.error) throw roadmapRes.error

      setLeads(leadsRes.data || [])
      if (revenueRes.data) setRevenue(revenueRes.data)
      setMilestones(roadmapRes.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const updateLead = async (id: string, updates: Partial<DbLead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
    try {
      const { error } = await supabase.from('leads').update(updates).eq('id', id)
      if (error) throw error
    } catch { loadData() }
  }

  const addLead = async (lead: { company_name: string; business_type: string; status: string; notes: string; source: string }) => {
    try {
      const { data, error } = await supabase.from('leads').insert(lead).select().single()
      if (error) throw error
      if (data) setLeads(prev => [data, ...prev])
    } catch { loadData() }
  }

  const deleteLead = async (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id))
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) throw error
    } catch { loadData() }
  }

  const updateRevenueTarget = async (field: 'consulting_target' | 'saas_target', value: number) => {
    setRevenue(prev => ({ ...prev, [field]: value }))
    if (!revenue.id) return
    try {
      const { error } = await supabase.from('bl_revenue_targets').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', revenue.id)
      if (error) throw error
    } catch { loadData() }
  }

  const toggleMilestone = async (id: string, done: boolean) => {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, done, status: done ? 'completed' : 'pending' } : m))
    try {
      const { error } = await supabase.from('roadmap').update({ done, status: done ? 'completed' : 'pending', updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    } catch { loadData() }
  }

  if (loading || !contentLoaded) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--accent)', fontSize: 18, fontWeight: 600 }}>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#F87171', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Error loading dashboard</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>{error}</p>
          <Btn variant="primary" onClick={loadData}>Retry</Btn>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '32px 24px 80px' }}>
      <KpiBar leads={leads} milestones={milestones} content={content} consultingTarget={revenue.consulting_target} />

      <Pipeline leads={leads} onUpdate={updateLead} onAdd={addLead} onEdit={updateLead} onDelete={deleteLead} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginTop: 32 }}>
        <RevenueTracker leads={leads} revenue={revenue} onUpdateTarget={updateRevenueTarget} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginTop: 32 }}>
        <Milestones milestones={milestones} onToggle={toggleMilestone} />
        <ContentQueue content={content} setContent={setContent} />
      </div>
    </div>
  )
}
