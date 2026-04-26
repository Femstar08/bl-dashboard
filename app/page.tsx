'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { DEFAULT_CONTENT } from '@/lib/defaults'
import { ContentItem, ContentStatus } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { LEAD_STAGES, LEAD_STAGE_COLORS, LEAD_SOURCES, SOURCE_COLORS, type LeadStage } from '@/lib/tokens'
import LeadPanel from '@/components/LeadPanel'
import type { Lead } from '@/components/LeadPanel'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { LayoutDashboard } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────
interface DbLead {
  id: string
  name: string | null
  company_name: string | null
  contact_name: string | null
  email: string | null
  phone_number: string | null
  status: string
  source: string | null
  business_type: string | null
  linkedin_url: string | null
  next_action: string | null
  follow_up_date: string | null
  snoozed_until: string | null
  notes: string | null
  bl_score: number | null
  bl_priority: string | null
  bl_reason: string | null
  monthly_value: number | null
  company_number: string | null
  industry: string | null
  postcode: string | null
  region: string | null
  website: string | null
  current_accountant: string | null
  current_software: string | null
  pain_points: string | null
  annual_turnover: string | null
  revenue: number | null
  annual_turnover_num: number | null
  created_at: string
  updated_at: string | null
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
    <Card className="bl-card cursor-default">
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <span className="material-symbols-outlined" style={{ color: 'var(--accent)' }}>{icon}</span>
          <Badge
            className="text-[10px] font-bold"
            style={{ background: 'var(--accent)', color: 'var(--bg-primary)', border: 'none' }}
          >
            {badgeText}
          </Badge>
        </div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{title}</p>
        <p className="text-2xl font-extrabold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-manrope)' }}>{value}</p>
      </CardContent>
    </Card>
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

// ── PIPELINE (kanban + list + LeadPanel) ─────────────────────────
function Pipeline({ leads, onUpdate, onAdd, onDelete }: {
  leads: DbLead[]
  onUpdate: (id: string, updates: Partial<DbLead>) => Promise<void>
  onAdd: (lead: Partial<DbLead>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '', company_name: '', email: '', phone_number: '', business_type: 'SME',
    source: 'Manual', status: 'New', monthly_value: '', linkedin_url: '',
    next_action: '', follow_up_date: '', notes: '',
  })
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  function handleAdd() {
    if (!addForm.name.trim() && !addForm.company_name.trim()) return
    onAdd({
      name: addForm.name || null,
      company_name: addForm.company_name || null,
      email: addForm.email || null,
      phone_number: addForm.phone_number || null,
      business_type: addForm.business_type || null,
      source: addForm.source || null,
      status: addForm.status,
      monthly_value: addForm.monthly_value ? Number(addForm.monthly_value) : null,
      linkedin_url: addForm.linkedin_url || null,
      next_action: addForm.next_action || null,
      follow_up_date: addForm.follow_up_date || null,
      notes: addForm.notes || null,
    })
    setAddForm({
      name: '', company_name: '', email: '', phone_number: '', business_type: 'SME',
      source: 'Manual', status: 'New', monthly_value: '', linkedin_url: '',
      next_action: '', follow_up_date: '', notes: '',
    })
    setAddOpen(false)
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

  function handleDragOver(e: React.DragEvent, stage: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stage)
  }

  function handleDragLeave() {
    setDragOverStage(null)
  }

  function handleDrop(e: React.DragEvent, stage: string) {
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

  const stageSet = new Set(LEAD_STAGES as readonly string[])
  const unmapped = leads.filter(l => !stageSet.has(l.status))
  const selectedLead = selectedLeadId ? leads.find(l => l.id === selectedLeadId) || null : null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <section style={{ gridColumn: '1 / -1' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Sales Pipeline</h2>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <span>{leads.length} leads</span>
            <span>{leads.filter(l => new Date(l.created_at) > new Date(Date.now() - 30 * 86400000)).length} this month</span>
            <span>{leads.length > 0 ? Math.round(leads.filter(l => l.status === 'Signed').length / Math.max(leads.filter(l => l.status !== 'Lost').length, 1) * 100) : 0}% conversion</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* View toggle */}
          <button
            onClick={() => setViewMode('kanban')}
            style={{
              background: viewMode === 'kanban' ? 'var(--accent)' : 'var(--bg-primary)',
              color: viewMode === 'kanban' ? 'var(--bg-primary)' : 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Board
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              background: viewMode === 'list' ? 'var(--accent)' : 'var(--bg-primary)',
              color: viewMode === 'list' ? 'var(--bg-primary)' : 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            List
          </button>
          {/* Add lead button */}
          <button
            onClick={() => setAddOpen(!addOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Add Lead
          </button>
        </div>
      </div>

      {/* Add lead form */}
      {addOpen && (
        <div style={{ ...cardStyle, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Input placeholder="Name" value={addForm.name} onChange={v => setAddForm({ ...addForm, name: v })} />
          <Input placeholder="Company" value={addForm.company_name} onChange={v => setAddForm({ ...addForm, company_name: v })} />
          <Input placeholder="Email" value={addForm.email} onChange={v => setAddForm({ ...addForm, email: v })} />
          <Input placeholder="Phone" value={addForm.phone_number} onChange={v => setAddForm({ ...addForm, phone_number: v })} />
          <Select value={addForm.business_type} onChange={v => setAddForm({ ...addForm, business_type: v })} options={['Accountant', 'SME', 'Startup', 'Enterprise']} />
          <Select value={addForm.source} onChange={v => setAddForm({ ...addForm, source: v })} options={[...LEAD_SOURCES]} />
          <Select value={addForm.status} onChange={v => setAddForm({ ...addForm, status: v })} options={[...LEAD_STAGES]} />
          <Input placeholder="Monthly value (£)" type="number" value={addForm.monthly_value} onChange={v => setAddForm({ ...addForm, monthly_value: v })} />
          <Input placeholder="LinkedIn URL" value={addForm.linkedin_url} onChange={v => setAddForm({ ...addForm, linkedin_url: v })} />
          <Input placeholder="Next action" value={addForm.next_action} onChange={v => setAddForm({ ...addForm, next_action: v })} />
          <Input placeholder="Follow-up date" type="date" value={addForm.follow_up_date} onChange={v => setAddForm({ ...addForm, follow_up_date: v })} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input placeholder="Notes (optional)" value={addForm.notes} onChange={v => setAddForm({ ...addForm, notes: v })} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" onClick={handleAdd}>Save</Button>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* ── Kanban view ───────────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }} className="custom-scrollbar">
            {LEAD_STAGES.map(stage => {
              const stageLeads = leads.filter(l => l.status === stage)
              const isOver = dragOverStage === stage
              const color = stageColor(stage)
              const isDimStage = stage === 'New' || stage === 'Lost'

              return (
                <div
                  key={stage}
                  onDragOver={e => handleDragOver(e, stage)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, stage)}
                  style={{
                    flexShrink: 0,
                    width: 260,
                    minHeight: 200,
                    background: isOver ? color + '11' : isDimStage ? 'var(--bg-primary)' : 'transparent',
                    borderRadius: 12,
                    transition: 'background 0.15s',
                    border: isOver ? `2px dashed ${color}44` : '2px dashed transparent',
                    opacity: isDimStage ? 0.85 : 1,
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
                      const isDragging = dragId === lead.id
                      const isOverdue = lead.follow_up_date && new Date(lead.follow_up_date) < today

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={e => onDragStart(e, lead.id)}
                          onDragEnd={onDragEnd}
                          onClick={() => setSelectedLeadId(lead.id)}
                          style={{
                            ...cardStyle,
                            padding: 14,
                            borderLeft: `4px solid ${color}`,
                            cursor: isDragging ? 'grabbing' : 'grab',
                            opacity: isDragging ? 0.4 : 1,
                            userSelect: 'none',
                          }}
                        >
                          {/* Name row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, flex: 1 }}>
                              {lead.company_name || lead.name || 'Unnamed'}
                            </p>
                            {isOverdue && (
                              <span style={{ width: 8, height: 8, borderRadius: 99, background: '#F87171', flexShrink: 0, marginTop: 4, marginLeft: 6 }} title="Follow-up overdue" />
                            )}
                          </div>

                          {/* Source + type + score tags */}
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                            <SourceTag source={lead.source} />
                            {lead.business_type && (
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-mid)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                {lead.business_type}
                              </span>
                            )}
                            {lead.bl_score != null && (
                              <span style={{
                                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                                background: lead.bl_score >= 8 ? '#34D39922' : lead.bl_score >= 6 ? '#F59E0B22' : 'var(--bg-mid)',
                                color: lead.bl_score >= 8 ? '#34D399' : lead.bl_score >= 6 ? '#F59E0B' : 'var(--text-muted)',
                              }}>
                                {lead.bl_score}
                              </span>
                            )}
                          </div>

                          {/* Revenue if set */}
                          {(lead.revenue || 0) > 0 && (
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>
                              £{(lead.revenue || 0).toLocaleString()}/mo
                            </div>
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

          {/* Unmapped leads */}
          {unmapped.length > 0 && (
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
                    onClick={() => setSelectedLeadId(lead.id)}
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
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── List view ─────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name / Company', 'Status', 'Source', 'Score', 'Follow-up', 'Next Action', 'Actions'].map(h => (
                  <th key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: 12, color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 20, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No leads yet.</td></tr>
              )}
              {leads.map(lead => {
                const sc = stageColor(lead.status)
                const isOverdue = lead.follow_up_date && new Date(lead.follow_up_date) < today
                return (
                  <tr key={lead.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{lead.company_name || lead.name || 'Unnamed'}</span>
                      {lead.company_name && lead.name && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{lead.name}</span>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: sc + '22', color: sc, textTransform: 'uppercase' }}>{lead.status}</span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <SourceTag source={lead.source} />
                    </td>
                    <td style={{ padding: 12 }}>
                      {lead.bl_score != null ? (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                          background: lead.bl_score >= 8 ? '#34D39922' : lead.bl_score >= 6 ? '#F59E0B22' : 'var(--bg-mid)',
                          color: lead.bl_score >= 8 ? '#34D399' : lead.bl_score >= 6 ? '#F59E0B' : 'var(--text-muted)',
                        }}>
                          {lead.bl_score}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      {lead.follow_up_date ? (
                        <span style={{ fontSize: 11, color: isOverdue ? '#F87171' : 'var(--text-muted)', fontWeight: isOverdue ? 700 : 400 }}>
                          {new Date(lead.follow_up_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: 12, fontSize: 12, color: 'var(--text-primary)' }}>
                      {lead.next_action || '—'}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setSelectedLeadId(lead.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                          title="Edit lead"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                        </button>
                        <button
                          onClick={() => onDelete(lead.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                          title="Delete lead"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── LeadPanel slide-over ──────────────────────────────────── */}
      {selectedLead && (
        <LeadPanel
          lead={selectedLead as Lead}
          onUpdate={async (id, updates) => { await onUpdate(id, updates) }}
          onDelete={async (id) => { await onDelete(id); setSelectedLeadId(null) }}
          onClose={() => setSelectedLeadId(null)}
        />
      )}
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
    <Card className="bl-card">
      <CardContent className="p-6">
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>Revenue Targets</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Consulting MRR</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>£{signedMrr.toLocaleString()} / £{revenue.consulting_target.toLocaleString()}</span>
          </div>
          <Progress value={pctConsulting} className="h-2" />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>SaaS ARR (pilot)</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>£0 / £{revenue.saas_target.toLocaleString()}</span>
          </div>
          <Progress value={pctSaas} className="h-2 opacity-60" />
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
      </CardContent>
    </Card>
  )
}

// ── MILESTONES ────────────────────────────────────────────────────
function Milestones({ milestones, onToggle }: { milestones: DbRoadmap[]; onToggle: (id: string, done: boolean) => void }) {
  const tracks = ['Marketing', 'Platform', 'Consulting'] as const

  return (
    <Card className="bl-card">
      <CardContent className="p-6">
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
      </CardContent>
    </Card>
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
    <Card className="bl-card">
      <CardContent className="p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Content Queue</h2>
        <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>Add Post</Button>
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
            <Button size="sm" onClick={add}>Save</Button>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
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
      </CardContent>
    </Card>
  )
}

// ── ROOT PAGE ─────────────────────────────────────────────────────
export default function Dashboard() {
  const [leads, setLeads] = useState<DbLead[]>([])
  const [milestones, setMilestones] = useState<DbRoadmap[]>([])
  const [revenue, setRevenue] = useState<DbRevenue>({ id: '', consulting_target: 10500, saas_target: 10000, updated_at: '' })
  const [agentTasks, setAgentTasks] = useState<{ assigned_to: string; title: string; status: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [content, setContentRaw, contentLoaded] = useLocalStorage('bl_content', DEFAULT_CONTENT)
  const setContent = (c: ContentItem[]) => setContentRaw(c)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [leadsRes, revenueRes, roadmapRes, agentRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('bl_revenue_targets').select('*').limit(1).single(),
        supabase.from('roadmap').select('*').not('week', 'is', null).order('week').order('sort_order'),
        supabase.from('bl_agent_tasks').select('assigned_to, title, status').in('status', ['In Progress', 'Review', 'New']).order('updated_at', { ascending: false }),
      ])

      if (leadsRes.error) throw leadsRes.error
      if (revenueRes.error && revenueRes.error.code !== 'PGRST116') throw revenueRes.error
      if (roadmapRes.error) throw roadmapRes.error

      setLeads(leadsRes.data || [])
      if (revenueRes.data) setRevenue(revenueRes.data)
      setMilestones(roadmapRes.data || [])
      setAgentTasks(agentRes.data || [])
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

  const addLead = async (lead: Partial<DbLead>) => {
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
          <Button onClick={loadData}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bl-page">
      <PageHeader
        title="Dashboard"
        subtitle={`${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · B&L Growth Overview`}
        icon={LayoutDashboard}
        gradientFrom="#0F1B35"
        gradientTo="#162240"
        accentColor="#53E9C5"
      />
      <KpiBar leads={leads} milestones={milestones} content={content} consultingTarget={revenue.consulting_target} />

      {/* Agent Activity */}
      {(() => {
        const agents = ['CEO Agent', 'Prospect Agent', 'Content Agent', 'Pipeline Agent'] as const
        const colors: Record<string, string> = { 'CEO Agent': '#7C8CF8', 'Prospect Agent': '#53E9C5', 'Content Agent': '#F59E0B', 'Pipeline Agent': '#F97316' }
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 24 }}>
            {agents.map(agent => {
              const active = agentTasks.find(t => t.assigned_to === agent && t.status === 'In Progress')
              const queued = agentTasks.filter(t => t.assigned_to === agent && t.status !== 'In Progress').length
              const color = colors[agent]
              return (
                <div key={agent} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
                  padding: '12px 14px', borderLeft: `3px solid ${color}`,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4 }}>{agent.replace(' Agent', '')}</div>
                  {active ? (
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {active.title}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Idle</div>
                  )}
                  {queued > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{queued} queued</div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      <Pipeline leads={leads} onUpdate={updateLead} onAdd={addLead} onDelete={deleteLead} />

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
