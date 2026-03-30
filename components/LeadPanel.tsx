'use client'

import { useState, useEffect, useCallback, CSSProperties } from 'react'
import { X, Plus, Trash2, Calendar, Check, Tag as TagIcon, ExternalLink } from 'lucide-react'
import { LEAD_STAGES, SOURCE_COLORS } from '@/lib/tokens'
import { supabase } from '@/lib/supabase'

/* ── Types ─────────────────────────────────────────────────────── */

export interface Lead {
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
  created_at: string
  updated_at: string | null
}

interface Task {
  id: string
  lead_id: string
  title: string
  description: string | null
  completed: boolean
  due_date: string | null
  section: string | null
  created_at: string
}

interface Tag {
  id: string
  name: string
  category: string | null
  description: string | null
}

interface LeadAction {
  id: string
  lead_id: string
  action_type: string
  notes: string | null
  scheduled_at: string | null
  completed_at: string | null
  created_at: string
}

interface LeadPanelProps {
  lead: Lead
  onUpdate: (id: string, updates: Partial<Lead>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

export type { Lead as LeadType }

/* ── Constants ────────────────────────────────────────────────── */

const ACTION_TYPES = [
  'Connection Request', 'Message Sent', 'Follow-up Message',
  'Call Scheduled', 'Call Completed', 'Proposal Sent',
  'No Response', 'Not Interested', 'Note',
] as const

const ACTION_COLORS: Record<string, string> = {
  'Connection Request': '#7C8CF8',
  'Message Sent': '#53E9C5',
  'Follow-up Message': '#F59E0B',
  'Call Scheduled': '#F97316',
  'Call Completed': '#34D399',
  'Proposal Sent': '#A78BFA',
  'No Response': '#5C6478',
  'Not Interested': '#F87171',
  'Note': '#5C6478',
}

/* ── Styles ────────────────────────────────────────────────────── */

const inputStyle: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  padding: '8px 12px',
  fontSize: 13,
  fontFamily: 'inherit',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
}

const sectionTitle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--text-muted)',
  marginBottom: 12,
  fontFamily: 'inherit',
}

const fieldLabel: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  marginBottom: 4,
  fontFamily: 'inherit',
}

const fieldValue: CSSProperties = {
  fontSize: 13,
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  cursor: 'pointer',
  padding: '4px 0',
  minHeight: 22,
}

/* ── Tag colour helper ─────────────────────────────────────────── */

const TAG_COLORS = [
  '#53E9C5', '#7C8CF8', '#F59E0B', '#34D399',
  '#F97316', '#A78BFA', '#F87171', '#8892A4',
]

function tagColor(tag: Tag): string {
  let hash = 0
  for (let i = 0; i < tag.name.length; i++) {
    hash = tag.name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

/* ── Action date formatter ─────────────────────────────────────── */

function formatActionDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  if (d >= today) return `Today at ${time}`
  if (d >= yesterday) return `Yesterday at ${time}`

  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000)
  if (diffDays < 7) return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} at ${time}`
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} at ${time}`
}

/* ── Action notes placeholder helper ───────────────────────────── */

function actionPlaceholder(type: string): string {
  switch (type) {
    case 'Connection Request': return 'Connection request note...'
    case 'Message Sent': return 'Message summary...'
    case 'Follow-up Message': return 'Message summary...'
    case 'Call Scheduled': return 'What is the call about...'
    case 'Call Completed': return 'What happened on the call...'
    case 'Proposal Sent': return 'Proposal details...'
    default: return 'Note...'
  }
}

/* ── Component ─────────────────────────────────────────────────── */

export default function LeadPanel({ lead, onUpdate, onDelete, onClose }: LeadPanelProps) {
  const [form, setForm] = useState<Lead>({ ...lead })
  const [editingField, setEditingField] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Tags
  const [tags, setTags] = useState<Tag[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [tagsLoading, setTagsLoading] = useState(true)
  const [showTagDropdown, setShowTagDropdown] = useState(false)

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [taskForm, setTaskForm] = useState({ title: '', due_date: '', section: '' })
  const [addingTask, setAddingTask] = useState(false)

  // Actions
  const [actions, setActions] = useState<LeadAction[]>([])
  const [actionsLoading, setActionsLoading] = useState(true)
  const [actionForm, setActionForm] = useState({ type: 'Note', notes: '' })
  const [loggingAction, setLoggingAction] = useState(false)

  /* ── Responsive ───────────────────────────────────────────────── */

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  /* ── Fetch tags ───────────────────────────────────────────────── */

  const fetchTags = useCallback(async () => {
    setTagsLoading(true)
    const { data: leadTags } = await supabase
      .from('bl_crm_prospects_tags')
      .select('tag_id, prospect_tags(id, name, category, description)')
      .eq('lead_id', lead.id)

    if (leadTags) {
      const mapped: Tag[] = leadTags
        .map((lt: Record<string, unknown>) => lt.prospect_tags as Tag | null)
        .filter((t: Tag | null): t is Tag => t !== null)
      setTags(mapped)
    }

    const { data: all } = await supabase
      .from('prospect_tags')
      .select('*')
      .order('category')
      .order('name')

    if (all) setAllTags(all as Tag[])
    setTagsLoading(false)
  }, [lead.id])

  /* ── Fetch tasks ──────────────────────────────────────────────── */

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true)
    const { data } = await supabase
      .from('bl_crm_tasks')
      .select('*')
      .eq('lead_id', lead.id)
      .order('completed')
      .order('due_date', { ascending: true, nullsFirst: false })

    if (data) setTasks(data as Task[])
    setTasksLoading(false)
  }, [lead.id])

  /* ── Fetch actions ─────────────────────────────────────────────── */

  const loadActions = useCallback(async () => {
    setActionsLoading(true)
    try {
      const { data } = await supabase
        .from('bl_lead_actions')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
      if (data) setActions(data)
    } catch {}
    finally { setActionsLoading(false) }
  }, [lead.id])

  useEffect(() => {
    fetchTags()
    fetchTasks()
    loadActions()
  }, [fetchTags, fetchTasks, loadActions])

  /* ── Helpers ──────────────────────────────────────────────────── */

  function updateForm(field: keyof Lead, value: string | number | null) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleFieldBlur(field: string) {
    setEditingField(null)
    // value already in form state
  }

  function handleFieldKeyDown(e: React.KeyboardEvent, field: string) {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur()
      setEditingField(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    const changes: Partial<Lead> = {}
    for (const key of Object.keys(form) as (keyof Lead)[]) {
      if (form[key] !== lead[key]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (changes as Record<string, unknown>)[key] = form[key]
      }
    }
    if (Object.keys(changes).length > 0) {
      await onUpdate(lead.id, changes)
    }
    setSaving(false)
  }

  async function handleDelete() {
    await onDelete(lead.id)
  }

  /* ── Tag operations ───────────────────────────────────────────── */

  async function addTag(tag: Tag) {
    setTags(prev => [...prev, tag])
    setShowTagDropdown(false)
    await supabase
      .from('bl_crm_prospects_tags')
      .insert({ lead_id: lead.id, tag_id: tag.id })
  }

  async function removeTag(tagId: string) {
    setTags(prev => prev.filter(t => t.id !== tagId))
    await supabase
      .from('bl_crm_prospects_tags')
      .delete()
      .eq('lead_id', lead.id)
      .eq('tag_id', tagId)
  }

  /* ── Task operations ──────────────────────────────────────────── */

  async function toggleTask(task: Task) {
    setTasks(prev =>
      prev.map(t => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    )
    await supabase
      .from('bl_crm_tasks')
      .update({ completed: !task.completed, updated_at: new Date().toISOString() })
      .eq('id', task.id)
  }

  async function deleteTask(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    await supabase.from('bl_crm_tasks').delete().eq('id', taskId)
  }

  async function saveTask() {
    if (!taskForm.title.trim()) return
    const { data } = await supabase
      .from('bl_crm_tasks')
      .insert({
        lead_id: lead.id,
        title: taskForm.title.trim(),
        due_date: taskForm.due_date || null,
        section: taskForm.section || null,
        completed: false,
      })
      .select()
      .single()

    if (data) {
      setTasks(prev => [...prev, data as Task])
      setTaskForm({ title: '', due_date: '', section: '' })
      setAddingTask(false)
    }
  }

  /* ── Action operations ─────────────────────────────────────────── */

  async function logAction() {
    if (loggingAction) return
    setLoggingAction(true)
    try {
      const { data } = await supabase
        .from('bl_lead_actions')
        .insert({
          lead_id: lead.id,
          action_type: actionForm.type,
          notes: actionForm.notes || null,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (data) {
        setActions(prev => [data as LeadAction, ...prev])
        setActionForm({ type: 'Note', notes: '' })

        // Auto-advance status based on action type
        if (
          actionForm.type === 'Connection Request' &&
          (lead.status === 'New' || lead.status === 'Identified')
        ) {
          await onUpdate(lead.id, { status: 'Contacted' })
        }
        if (
          actionForm.type === 'Call Completed' &&
          lead.status === 'Contacted'
        ) {
          await onUpdate(lead.id, { status: 'Engaged' })
        }
      }
    } catch {}
    finally { setLoggingAction(false) }
  }

  async function deleteAction(actionId: string) {
    setActions(prev => prev.filter(a => a.id !== actionId))
    await supabase.from('bl_lead_actions').delete().eq('id', actionId)
  }

  /* ── Score badge colour ───────────────────────────────────────── */

  function scoreBg(score: number): string {
    if (score >= 8) return '#34D399'
    if (score >= 6) return '#F59E0B'
    return '#5C6478'
  }

  /* ── Render helpers ───────────────────────────────────────────── */

  function renderEditable(
    field: keyof Lead,
    label: string,
    opts?: { type?: string; readonly?: boolean; textarea?: boolean }
  ) {
    const isEditing = editingField === field && !opts?.readonly
    const val = form[field]
    const displayVal = val !== null && val !== undefined ? String(val) : ''

    return (
      <div style={{ marginBottom: 12 }}>
        <div style={fieldLabel}>{label}</div>
        {opts?.readonly ? (
          <div
            style={{
              ...fieldValue,
              cursor: 'default',
              fontStyle: 'italic',
              opacity: 0.7,
              background: 'var(--bg-card)',
              borderRadius: 6,
              padding: '6px 10px',
            }}
          >
            {displayVal || '—'}
          </div>
        ) : isEditing ? (
          opts?.textarea ? (
            <textarea
              autoFocus
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              value={displayVal}
              onChange={e => updateForm(field, e.target.value || null)}
              onBlur={() => handleFieldBlur(field)}
              onKeyDown={e => {
                if (e.key === 'Escape') setEditingField(null)
              }}
            />
          ) : (
            <input
              autoFocus
              type={opts?.type || 'text'}
              style={inputStyle}
              value={displayVal}
              onChange={e => {
                const v = e.target.value
                if (opts?.type === 'number') {
                  updateForm(field, v === '' ? null : Number(v))
                } else {
                  updateForm(field, v || null)
                }
              }}
              onBlur={() => handleFieldBlur(field)}
              onKeyDown={e => handleFieldKeyDown(e, field)}
            />
          )
        ) : (
          <div
            style={fieldValue}
            onClick={() => setEditingField(field)}
          >
            {field === 'monthly_value' && displayVal ? `£${displayVal}` : displayVal || '—'}
          </div>
        )}
      </div>
    )
  }

  function renderDropdown(field: keyof Lead, label: string, options: readonly string[]) {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={fieldLabel}>{label}</div>
        <select
          style={{ ...inputStyle, cursor: 'pointer' }}
          value={String(form[field] || '')}
          onChange={e => updateForm(field, e.target.value || null)}
        >
          <option value="">—</option>
          {options.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
    )
  }

  /* ── Overdue check ────────────────────────────────────────────── */

  function isOverdue(dateStr: string | null, completed: boolean): boolean {
    if (!dateStr || completed) return false
    return new Date(dateStr) < new Date()
  }

  /* ── Render ──────────────────────────────────────────────────── */

  const panelWidth = isMobile ? '100%' : 480
  const assignedTagIds = new Set(tags.map(t => t.id))
  const availableTags = allTags.filter(t => !assignedTagIds.has(t.id))

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 39,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 52,
          right: 0,
          bottom: 0,
          width: panelWidth,
          background: 'var(--bg-mid)',
          borderLeft: '1px solid var(--border)',
          zIndex: 40,
          overflowY: 'auto',
          fontFamily: 'inherit',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              fontFamily: 'inherit',
            }}
          >
            <X size={18} />
          </button>

          {/* Name */}
          {editingField === 'name' ? (
            <input
              autoFocus
              style={{ ...inputStyle, fontSize: 18, fontWeight: 700, marginBottom: 4 }}
              value={form.name || ''}
              onChange={e => updateForm('name', e.target.value || null)}
              onBlur={() => setEditingField(null)}
              onKeyDown={e => handleFieldKeyDown(e, 'name')}
            />
          ) : (
            <div
              onClick={() => setEditingField('name')}
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                marginBottom: 4,
                paddingRight: 32,
                fontFamily: 'inherit',
              }}
            >
              {form.name || 'Untitled lead'}
            </div>
          )}

          {/* Company */}
          {editingField === 'company_name' ? (
            <input
              autoFocus
              style={{ ...inputStyle, fontSize: 14, marginBottom: 12 }}
              value={form.company_name || ''}
              onChange={e => updateForm('company_name', e.target.value || null)}
              onBlur={() => setEditingField(null)}
              onKeyDown={e => handleFieldKeyDown(e, 'company_name')}
            />
          ) : (
            <div
              onClick={() => setEditingField('company_name')}
              style={{
                fontSize: 14,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                marginBottom: 12,
                fontFamily: 'inherit',
              }}
            >
              {form.company_name || 'No company'}
            </div>
          )}

          {/* Status + Source + Score row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Status dropdown */}
            <select
              style={{
                ...inputStyle,
                width: 'auto',
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 600,
              }}
              value={form.status}
              onChange={e => updateForm('status', e.target.value)}
            >
              {LEAD_STAGES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Source pill */}
            {form.source && (
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  background: SOURCE_COLORS[form.source] || '#5C6478',
                  color: '#0F1B35',
                  fontFamily: 'inherit',
                }}
              >
                {form.source}
              </span>
            )}

            {/* Score badge */}
            {form.bl_score !== null && form.bl_score !== undefined && (
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  background: scoreBg(form.bl_score),
                  color: '#0F1B35',
                  fontFamily: 'inherit',
                }}
              >
                Score: {form.bl_score}
              </span>
            )}
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────── */}
        <div style={{ padding: '20px 24px', flex: 1 }}>

          {/* Contact Details */}
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitle}>Contact Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {renderEditable('email', 'Email')}
              {renderEditable('phone_number', 'Phone')}
              {renderEditable('linkedin_url', 'LinkedIn URL')}
              {renderEditable('website', 'Website')}
              {renderEditable('postcode', 'Postcode')}
              {renderEditable('region', 'Region')}
            </div>
          </div>

          {/* Business Details */}
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitle}>Business Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {renderDropdown('business_type', 'Type', ['SME', 'Accountant'])}
              {renderEditable('industry', 'Industry')}
              {renderEditable('company_number', 'Company Number')}
              {renderEditable('monthly_value', 'Monthly Value (£)', { type: 'number' })}
              {renderEditable('annual_turnover', 'Annual Turnover')}
              {renderEditable('current_accountant', 'Current Accountant')}
              {renderEditable('current_software', 'Current Software')}
              {renderEditable('pain_points', 'Pain Points')}
            </div>
          </div>

          {/* Pipeline Details */}
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitle}>Pipeline Details</div>
            {renderEditable('next_action', 'Next Action')}
            {renderEditable('follow_up_date', 'Follow-up Date', { type: 'date' })}
            {renderEditable('notes', 'Notes', { textarea: true })}
            {renderEditable('bl_reason', 'BL Reason', { readonly: true })}
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitle}>
              <TagIcon size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Tags
            </div>
            {tagsLoading ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading tags...</div>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {tags.map(tag => (
                    <span
                      key={tag.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: tagColor(tag),
                        color: '#0F1B35',
                        fontFamily: 'inherit',
                      }}
                    >
                      {tag.name}
                      <button
                        onClick={() => removeTag(tag.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0F1B35',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: 13,
                          fontWeight: 700,
                          lineHeight: 1,
                          fontFamily: 'inherit',
                          opacity: 0.6,
                        }}
                      >
                        &times;
                      </button>
                    </span>
                  ))}

                  {tags.length === 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No tags</span>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowTagDropdown(!showTagDropdown)}
                    style={{
                      background: 'none',
                      border: '1px dashed var(--border)',
                      borderRadius: 6,
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px 10px',
                      fontSize: 11,
                      fontFamily: 'inherit',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Plus size={12} /> Add tag
                  </button>

                  {showTagDropdown && availableTags.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: 4,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: 4,
                        maxHeight: 200,
                        overflowY: 'auto',
                        zIndex: 50,
                        minWidth: 180,
                      }}
                    >
                      {availableTags.map(tag => (
                        <div
                          key={tag.id}
                          onClick={() => addTag(tag)}
                          style={{
                            padding: '6px 10px',
                            fontSize: 12,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            borderRadius: 4,
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={e => {
                            (e.target as HTMLDivElement).style.background = 'var(--border)'
                          }}
                          onMouseLeave={e => {
                            (e.target as HTMLDivElement).style.background = 'transparent'
                          }}
                        >
                          {tag.category && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 6 }}>
                              {tag.category}
                            </span>
                          )}
                          {tag.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Tasks */}
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitle}>Tasks</div>
            {tasksLoading ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading tasks...</div>
            ) : (
              <>
                {tasks.length === 0 && !addingTask && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                    No tasks yet
                  </div>
                )}

                {tasks.map(task => (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border)',
                      opacity: task.completed ? 0.5 : 1,
                    }}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTask(task)}
                      style={{
                        width: 18,
                        height: 18,
                        minWidth: 18,
                        borderRadius: 4,
                        border: task.completed
                          ? '1px solid #34D399'
                          : '1px solid var(--border)',
                        background: task.completed ? '#34D399' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 2,
                        padding: 0,
                        fontFamily: 'inherit',
                      }}
                    >
                      {task.completed && <Check size={12} color="#0F1B35" />}
                    </button>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--text-primary)',
                          textDecoration: task.completed ? 'line-through' : 'none',
                          fontFamily: 'inherit',
                        }}
                      >
                        {task.title}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        {task.due_date && (
                          <span
                            style={{
                              fontSize: 10,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              color: isOverdue(task.due_date, task.completed)
                                ? '#F87171'
                                : 'var(--text-muted)',
                              fontFamily: 'inherit',
                            }}
                          >
                            <Calendar size={10} />
                            {task.due_date}
                          </span>
                        )}
                        {task.section && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'var(--border)',
                              color: 'var(--text-muted)',
                              fontFamily: 'inherit',
                            }}
                          >
                            {task.section}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteTask(task.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 2,
                        opacity: 0.5,
                        fontFamily: 'inherit',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                {/* Add task form */}
                {addingTask ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 12,
                      background: 'var(--bg-card)',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <input
                      autoFocus
                      placeholder="Task title"
                      style={{ ...inputStyle, marginBottom: 8 }}
                      value={taskForm.title}
                      onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveTask()
                        if (e.key === 'Escape') setAddingTask(false)
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input
                        type="date"
                        style={{ ...inputStyle, flex: 1 }}
                        value={taskForm.due_date}
                        onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
                      />
                      <input
                        placeholder="Section"
                        style={{ ...inputStyle, flex: 1 }}
                        value={taskForm.section}
                        onChange={e => setTaskForm(f => ({ ...f, section: e.target.value }))}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={saveTask}
                        style={{
                          background: '#53E9C5',
                          color: '#0F1B35',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 14px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setAddingTask(false)
                          setTaskForm({ title: '', due_date: '', section: '' })
                        }}
                        style={{
                          background: 'none',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '6px 14px',
                          fontSize: 12,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTask(true)}
                    style={{
                      background: 'none',
                      border: '1px dashed var(--border)',
                      borderRadius: 6,
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '6px 10px',
                      fontSize: 11,
                      fontFamily: 'inherit',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 8,
                    }}
                  >
                    <Plus size={12} /> Add task
                  </button>
                )}
              </>
            )}
          </div>

          {/* Activity Log */}
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitle}>Activity Log</div>

            {/* Quick-log form */}
            <div
              style={{
                padding: 12,
                background: 'var(--bg-card)',
                borderRadius: 8,
                border: '1px solid var(--border)',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <select
                  style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}
                  value={actionForm.type}
                  onChange={e => setActionForm(f => ({ ...f, type: e.target.value }))}
                >
                  {ACTION_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button
                  onClick={logAction}
                  disabled={loggingAction}
                  style={{
                    background: '#53E9C5',
                    color: '#0F1B35',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: loggingAction ? 'not-allowed' : 'pointer',
                    opacity: loggingAction ? 0.6 : 1,
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {loggingAction ? 'Logging...' : 'Log'}
                </button>
              </div>
              <textarea
                style={{ ...inputStyle, minHeight: 52, resize: 'vertical' }}
                placeholder={actionPlaceholder(actionForm.type)}
                value={actionForm.notes}
                onChange={e => setActionForm(f => ({ ...f, notes: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) logAction()
                }}
              />
            </div>

            {/* Action list */}
            {actionsLoading ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading...</div>
            ) : actions.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No activity logged yet</div>
            ) : (
              actions.map((action, idx) => (
                <div
                  key={action.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 0',
                    borderBottom: idx < actions.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {/* Coloured dot */}
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 99,
                      background: ACTION_COLORS[action.action_type] || '#5C6478',
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                  />

                  {/* Middle content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: ACTION_COLORS[action.action_type] || '#5C6478',
                        fontFamily: 'inherit',
                      }}
                    >
                      {action.action_type}
                    </div>
                    {action.notes && (
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-muted)',
                          marginTop: 2,
                          lineHeight: 1.4,
                          fontFamily: 'inherit',
                        }}
                      >
                        {action.notes}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        opacity: 0.7,
                        marginTop: 4,
                        fontFamily: 'inherit',
                      }}
                    >
                      {formatActionDate(action.created_at)}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteAction(action.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 2,
                      opacity: 0.5,
                      fontFamily: 'inherit',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Actions footer ──────────────────────────────────────── */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            padding: '16px 24px',
            background: 'var(--bg-mid)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {confirmDelete ? (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#F87171', marginBottom: 8, fontFamily: 'inherit' }}>
                Delete {form.name || 'this lead'}? This removes all tasks and tags too.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleDelete}
                  style={{
                    background: '#F87171',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    background: 'none',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  background: 'none',
                  border: '1px solid #F87171',
                  borderRadius: 6,
                  color: '#F87171',
                  cursor: 'pointer',
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontFamily: 'inherit',
                }}
              >
                <Trash2 size={13} /> Delete lead
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: '#53E9C5',
                  color: '#0F1B35',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
