'use client'

import { useState, useEffect, useCallback, CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, X, CheckCircle, Trash2, GripVertical } from 'lucide-react'

/* ── Types ──────────────────────────────────────────────────────── */

interface AgentTask {
  id: string
  task_ref: string | null
  title: string
  description: string | null
  status: string
  priority: string
  assigned_to: string
  created_by: string
  due_date: string | null
  completed_at: string | null
  task_type: string | null
  sprint_id: string | null
  queue_position: number | null
  created_at: string
  updated_at: string
  // kept for compat but not shown in minimal UI
  prd: string | null
  acceptance_criteria: string | null
  claude_code_instructions: string | null
  repo_path: string | null
  branch_name: string | null
  complexity: string | null
  depends_on: string[] | null
  notes: string | null
  related_lead_id: string | null
  paperclip_issue_id: string | null
  source_file: string | null
  queue_bucket: string | null
}

/* ── Constants ──────────────────────────────────────────────────── */

const KANBAN_COLS = ['New', 'In Progress', 'Review', 'Done'] as const
const ALL_STATUSES = ['New', 'Backlog', 'In Progress', 'Review', 'Done', 'Blocked', 'Cancelled'] as const

const COL_COLORS: Record<string, string> = {
  'New':         '#8892A4',
  'In Progress': '#7C8CF8',
  'Review':      '#F59E0B',
  'Done':        '#34D399',
}

const AGENTS = ['CEO', 'CTO', 'CMO', 'COO', 'CFO', 'UX Designer', 'Femi'] as const

const AGENT_COLORS: Record<string, string> = {
  'CEO':         '#7C8CF8',
  'CTO':         '#53E9C5',
  'CMO':         '#F59E0B',
  'COO':         '#F97316',
  'CFO':         '#34D399',
  'UX Designer': '#A78BFA',
  'Femi':        '#F87171',
}

/* ── Styles ─────────────────────────────────────────────────────── */

const input: CSSProperties = {
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

/* ══════════════════════════════════════════════════════════════════ */

export default function AgentsPage() {
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [loading, setLoading] = useState(true)

  // Add task
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAssignee, setNewAssignee] = useState('CEO Agent')
  const [newPriority, setNewPriority] = useState('normal')
  const [newDesc, setNewDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Task detail
  const [selected, setSelected] = useState<AgentTask | null>(null)
  const [editFields, setEditFields] = useState<Partial<AgentTask>>({})
  const [saving, setSaving] = useState(false)

  // Kanban drag
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  /* ── Data ────────────────────────────────────────────────────── */

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bl_agent_tasks')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setTasks(data || [])
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchTasks().then(() => setLoading(false))
  }, [fetchTasks])

  /* ── CRUD ────────────────────────────────────────────────────── */

  const createTask = async () => {
    if (!newTitle.trim()) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('bl_agent_tasks').insert({
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        status: 'New',
        priority: newPriority,
        assigned_to: newAssignee,
        created_by: 'Femi',
      })
      if (error) throw error
      setNewTitle(''); setNewDesc(''); setNewPriority('normal')
      setShowAdd(false)
      await fetchTasks()
    } catch { /* silent */ }
    setSubmitting(false)
  }

  const updateStatus = async (id: string, status: string) => {
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === 'Done') updates.completed_at = new Date().toISOString()
    try {
      await supabase.from('bl_agent_tasks').update(updates).eq('id', id)
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } as AgentTask : t))
      if (selected?.id === id) {
        setSelected(prev => prev ? { ...prev, ...updates } as AgentTask : null)
        setEditFields(prev => ({ ...prev, status }))
      }
    } catch { /* silent */ }
  }

  const saveEdits = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const updates = { ...editFields, updated_at: new Date().toISOString() }
      if (editFields.status === 'Done' && selected.status !== 'Done') {
        (updates as Record<string, unknown>).completed_at = new Date().toISOString()
      }
      await supabase.from('bl_agent_tasks').update(updates).eq('id', selected.id)
      await fetchTasks()
      setSelected(prev => prev ? { ...prev, ...updates } as AgentTask : null)
    } catch { /* silent */ }
    setSaving(false)
  }

  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return
    try {
      await supabase.from('bl_agent_tasks').delete().eq('id', id)
      setSelected(null)
      await fetchTasks()
    } catch { /* silent */ }
  }

  /* ── Drag & drop ────────────────────────────────────────────── */

  const onDrop = async (col: string) => {
    if (dragId) await updateStatus(dragId, col)
    setDragId(null); setDragOver(null)
  }

  /* ── Helpers ────────────────────────────────────────────────── */

  const openTask = (task: AgentTask) => {
    setSelected(task)
    setEditFields({
      title: task.title,
      description: task.description,
      status: task.status,
      assigned_to: task.assigned_to,
      priority: task.priority,
      due_date: task.due_date,
      notes: task.notes,
    })
  }

  // Group tasks: "New" column includes New + Backlog
  const colTasks = (col: string) => {
    if (col === 'New') return tasks.filter(t => t.status === 'New' || t.status === 'Backlog')
    return tasks.filter(t => t.status === col)
  }

  /* ── Render ─────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ color: 'var(--accent)', fontSize: 16, fontWeight: 600 }}>Loading...</div>
      </div>
    )
  }

  const activeCount = tasks.filter(t => t.status !== 'Done' && t.status !== 'Cancelled').length

  return (
    <div style={{ padding: '24px 24px 48px', maxWidth: 1200, margin: '0 auto', fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
            Agents
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {activeCount} active task{activeCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            background: 'var(--accent)', color: 'var(--bg-primary)', border: 'none',
            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <Plus size={14} /> Add Task
        </button>
      </div>

      {/* Add task form */}
      {showAdd && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 20, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>New Task</span>
            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="What needs to be done?"
              style={input}
              onKeyDown={e => e.key === 'Enter' && createTask()}
              autoFocus
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={newPriority} onChange={e => setNewPriority(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <textarea
              value={newDesc} onChange={e => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2} style={{ ...input, resize: 'vertical' }}
            />
            <button
              onClick={createTask}
              disabled={submitting || !newTitle.trim()}
              style={{
                background: 'var(--accent)', color: 'var(--bg-primary)', border: 'none',
                borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                opacity: submitting || !newTitle.trim() ? 0.5 : 1,
              }}
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Kanban */}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${KANBAN_COLS.length}, 1fr)`,
        gap: 12,
      }}>
        {KANBAN_COLS.map(col => {
          const items = colTasks(col)
          const isOver = dragOver === col
          return (
            <div
              key={col}
              onDragOver={e => { e.preventDefault(); setDragOver(col) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => onDrop(col)}
              style={{
                background: isOver ? `${COL_COLORS[col]}08` : 'var(--bg-card)',
                border: `1px solid ${isOver ? COL_COLORS[col] + '40' : 'var(--border)'}`,
                borderRadius: 12,
                borderTop: `3px solid ${COL_COLORS[col]}`,
                minHeight: 200,
                transition: 'all 0.15s',
              }}
            >
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 8px' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: COL_COLORS[col] }}>{col}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 10,
                  background: `${COL_COLORS[col]}15`, color: COL_COLORS[col],
                }}>{items.length}</span>
              </div>

              {/* Cards */}
              <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(task => {
                  const agentColor = AGENT_COLORS[task.assigned_to] || '#5C6478'
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => { setDragId(null); setDragOver(null) }}
                      onClick={() => openTask(task)}
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        cursor: 'grab',
                        opacity: dragId === task.id ? 0.4 : 1,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>
                        {task.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 10,
                          background: `${agentColor}15`, color: agentColor,
                        }}>{task.assigned_to}</span>
                        {task.priority !== 'normal' && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 10,
                            background: task.priority === 'urgent' ? '#F8717115' : task.priority === 'high' ? '#F59E0B15' : 'var(--bg-card)',
                            color: task.priority === 'urgent' ? '#F87171' : task.priority === 'high' ? '#F59E0B' : 'var(--text-muted)',
                            textTransform: 'capitalize',
                          }}>{task.priority}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Task detail slide-out */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90 }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, maxWidth: '100vw',
            background: 'var(--bg-mid)', borderLeft: '1px solid var(--border)', zIndex: 100,
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}>
            {/* Panel header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
              position: 'sticky', top: 0, background: 'var(--bg-mid)', zIndex: 2,
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Task</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { updateStatus(selected.id, 'Done'); }} style={{
                  background: '#34D39915', color: '#34D399', border: '1px solid #34D39930',
                  borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
                }}><CheckCircle size={12} /> Done</button>
                <button onClick={() => deleteTask(selected.id)} style={{
                  background: '#F8717115', color: '#F87171', border: '1px solid #F8717130',
                  borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
                }}><Trash2 size={12} /></button>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
              </div>
            </div>

            {/* Panel body */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Title</label>
                <input value={editFields.title || ''} onChange={e => setEditFields(prev => ({ ...prev, title: e.target.value }))} style={input} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Description</label>
                <textarea value={editFields.description || ''} onChange={e => setEditFields(prev => ({ ...prev, description: e.target.value }))} rows={3} style={{ ...input, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Status</label>
                  <select value={editFields.status || ''} onChange={e => setEditFields(prev => ({ ...prev, status: e.target.value }))} style={{ ...input, cursor: 'pointer' }}>
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Assigned to</label>
                  <select value={editFields.assigned_to || ''} onChange={e => setEditFields(prev => ({ ...prev, assigned_to: e.target.value }))} style={{ ...input, cursor: 'pointer' }}>
                    {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Priority</label>
                  <select value={editFields.priority || ''} onChange={e => setEditFields(prev => ({ ...prev, priority: e.target.value }))} style={{ ...input, cursor: 'pointer' }}>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Due date</label>
                  <input type="date" value={editFields.due_date || ''} onChange={e => setEditFields(prev => ({ ...prev, due_date: e.target.value }))} style={input} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes</label>
                <textarea value={editFields.notes || ''} onChange={e => setEditFields(prev => ({ ...prev, notes: e.target.value }))} rows={3} style={{ ...input, resize: 'vertical' }} />
              </div>
              <button
                onClick={saveEdits}
                disabled={saving}
                style={{
                  background: 'var(--accent)', color: 'var(--bg-primary)', border: 'none',
                  borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  opacity: saving ? 0.5 : 1, marginTop: 4,
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>

              {/* Metadata */}
              {selected.created_at && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  Created {new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {selected.completed_at && <> · Completed {new Date(selected.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
