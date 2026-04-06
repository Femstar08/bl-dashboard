'use client'

import { useState, useEffect, useCallback, useRef, CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Bot, User, Plus, ChevronLeft, ChevronRight,
  Pencil, Trash2, Link, Clock, AlertCircle, CheckCircle,
  X, Search, Send, Upload, Download, Copy, Check,
  RefreshCw, FileText, Code, Zap, ChevronDown, ChevronUp,
  GripVertical, Layers, ArrowRight, Calendar,
} from 'lucide-react'

/* ── Types ──────────────────────────────────────────────────────── */

type Complexity = 'small' | 'medium' | 'large' | 'epic'
type TaskType = 'coding' | 'research' | 'prospecting' | 'content' | 'pipeline' | 'review'

interface AgentTask {
  id: string
  task_ref: string | null
  title: string
  description: string | null
  prd: string | null
  acceptance_criteria: string | null
  status: string
  priority: string
  complexity: Complexity | null
  assigned_to: string
  created_by: string
  related_lead_id: string | null
  notes: string | null
  due_date: string | null
  completed_at: string | null
  paperclip_issue_id: string | null
  claude_code_instructions: string | null
  repo_path: string | null
  branch_name: string | null
  depends_on: string[] | null
  source_file: string | null
  sprint_id: string | null
  queue_position: number | null
  task_type: TaskType | null
  queue_bucket: string | null
  created_at: string
  updated_at: string
}

interface Sprint {
  id: string
  name: string
  goal: string | null
  start_date: string | null
  end_date: string | null
  status: 'planned' | 'active' | 'completed'
  created_at: string
  updated_at: string
}

interface AgentInboxMessage {
  id: string
  from_role: string
  to_agent: string
  message: string
  status: string
  response: string | null
  priority: string
  created_at: string
  updated_at: string
  responded_at: string | null
}

interface LeadOption {
  id: string
  name: string | null
  company_name: string | null
}

/* ── Constants ──────────────────────────────────────────────────── */

const TASK_STAGES = ['New', 'Backlog', 'In Progress', 'Review', 'Done', 'Blocked', 'Cancelled'] as const
type TaskStage = typeof TASK_STAGES[number]

const MAIN_PROGRESSION: TaskStage[] = ['New', 'Backlog', 'In Progress', 'Review', 'Done']

const STAGE_COLORS: Record<string, string> = {
  'New':         '#5C6478',
  'Backlog':     '#8892A4',
  'In Progress': '#7C8CF8',
  'Review':      '#F59E0B',
  'Done':        '#34D399',
  'Blocked':     '#F87171',
  'Cancelled':   '#3D4555',
}

const AGENTS = ['CEO Agent', 'Prospect Agent', 'Content Agent', 'Pipeline Agent', 'Femi', 'Unassigned'] as const

const ASSIGNEE_COLORS: Record<string, string> = {
  'CEO Agent':      '#7C8CF8',
  'Prospect Agent': '#53E9C5',
  'Content Agent':  '#F59E0B',
  'Pipeline Agent': '#F97316',
  'Femi':           '#34D399',
  'Unassigned':     '#5C6478',
}

const PRIORITY_LEVELS = ['low', 'normal', 'high', 'urgent'] as const
type Priority = typeof PRIORITY_LEVELS[number]

const PRIORITY_COLORS: Record<string, string> = {
  'low':    '#5C6478',
  'normal': 'transparent',
  'high':   '#F59E0B',
  'urgent': '#F87171',
}

const COMPLEXITY_LEVELS = ['small', 'medium', 'large', 'epic'] as const

const COMPLEXITY_COLORS: Record<string, string> = {
  'small':  '#34D399',
  'medium': '#F59E0B',
  'large':  '#F97316',
  'epic':   '#F87171',
}

const TASK_TYPES: TaskType[] = ['coding', 'research', 'prospecting', 'content', 'pipeline', 'review']

const TASK_TYPE_COLORS: Record<string, string> = {
  'coding':       '#7C8CF8',
  'research':     '#53E9C5',
  'prospecting':  '#F59E0B',
  'content':      '#F97316',
  'pipeline':     '#34D399',
  'review':       '#5C6478',
}

const TASK_TYPE_AGENTS: Record<string, string> = {
  'coding':       'CEO Agent',
  'research':     'CEO Agent',
  'prospecting':  'Prospect Agent',
  'content':      'Content Agent',
  'pipeline':     'Pipeline Agent',
  'review':       'Femi',
}

const AGENT_ROLES: Record<string, string> = {
  'CEO Agent':      'Strategic oversight & coordination',
  'Prospect Agent': 'Lead discovery & outreach',
  'Content Agent':  'Content creation & scheduling',
  'Pipeline Agent': 'Deal progression & follow-ups',
  'Femi':           'Founder & decision maker',
}

const CSV_TEMPLATE = `task_id,task_name,description,prd,assignee,status,priority,acceptance_criteria,repo_path,branch_name,complexity,task_type
BL-001,Example Task,Brief description,Full PRD text here,CEO Agent,New,normal,- Feature works,/path/to/repo,feature/example,medium,coding`

const JSON_TEMPLATE = JSON.stringify([{
  task_id: 'BL-001',
  task_name: 'Example Task',
  description: 'Brief description',
  prd: 'Full PRD text here',
  assignee: 'CEO Agent',
  status: 'New',
  priority: 'normal',
  acceptance_criteria: '- Feature works',
  repo_path: '/path/to/repo',
  branch_name: 'feature/example',
  complexity: 'medium',
  task_type: 'coding',
}], null, 2)

/* ── Styles ─────────────────────────────────────────────────────── */

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

const monoInputStyle: CSSProperties = {
  ...inputStyle,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  fontSize: 12,
  lineHeight: 1.5,
}

const labelStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  marginBottom: 4,
  fontFamily: 'inherit',
  display: 'block',
}

const sectionHeader: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--text-muted)',
  marginBottom: 12,
  marginTop: 8,
  fontFamily: 'inherit',
}

const btnPrimary: CSSProperties = {
  background: 'var(--accent)',
  color: 'var(--bg-primary)',
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const btnSecondary: CSSProperties = {
  background: 'var(--bg-card)',
  color: 'var(--text-muted)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
}

/* ── Helpers ────────────────────────────────────────────────────── */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function getDueDateStyle(dueDateStr: string | null): { color: string; label: string } | null {
  if (!dueDateStr) return null
  const diffDays = (new Date(dueDateStr + 'T23:59:59').getTime() - Date.now()) / 86400000
  if (diffDays < 0) return { color: '#F87171', label: formatDate(dueDateStr) }
  if (diffDays <= 2) return { color: '#F59E0B', label: formatDate(dueDateStr) }
  return { color: 'var(--text-muted)', label: formatDate(dueDateStr) }
}

function getPrevStage(current: string): string | null {
  const idx = MAIN_PROGRESSION.indexOf(current as TaskStage)
  return idx > 0 ? MAIN_PROGRESSION[idx - 1] : null
}

function getNextStage(current: string): string | null {
  const idx = MAIN_PROGRESSION.indexOf(current as TaskStage)
  return idx >= 0 && idx < MAIN_PROGRESSION.length - 1 ? MAIN_PROGRESSION[idx + 1] : null
}

/* ── Upload Parsers ─────────────────────────────────────────────── */

const mapAssignee = (raw: string): string => {
  const map: Record<string, string> = {
    'ceo': 'CEO Agent', 'ceo agent': 'CEO Agent',
    'prospect': 'Prospect Agent', 'prospect agent': 'Prospect Agent',
    'content': 'Content Agent', 'content agent': 'Content Agent',
    'pipeline': 'Pipeline Agent', 'pipeline agent': 'Pipeline Agent',
    'femi': 'Femi', 'me': 'Femi', 'unassigned': 'Unassigned',
  }
  return map[raw.toLowerCase()] || 'CEO Agent'
}

const mapStatus = (raw: string): string => {
  const valid = ['New', 'Backlog', 'In Progress', 'Review', 'Done', 'Blocked', 'Cancelled']
  return valid.find(s => s.toLowerCase() === raw.toLowerCase()) || 'New'
}

const mapComplexity = (raw: string): Complexity | null => {
  const valid: Complexity[] = ['small', 'medium', 'large', 'epic']
  return valid.find(c => c === raw.toLowerCase()) || null
}

const mapTaskType = (raw: string): TaskType | null => {
  return TASK_TYPES.find(t => t === raw.toLowerCase()) || null
}

const parseCSV = (text: string): Partial<AgentTask>[] => {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue }
      current += ch
    }
    values.push(current.trim())
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = values[i] || '' })
    return {
      task_ref: obj.task_id || obj.task_ref || '',
      title: obj.task_name || obj.title || '',
      description: obj.description || '',
      prd: obj.prd || '',
      assigned_to: mapAssignee(obj.assignee || obj.assigned_to || 'CEO Agent'),
      status: mapStatus(obj.status || 'New'),
      priority: (obj.priority || 'normal') as Priority,
      acceptance_criteria: obj.acceptance_criteria || '',
      repo_path: obj.repo_path || '',
      branch_name: obj.branch_name || '',
      complexity: mapComplexity(obj.complexity || 'medium'),
      task_type: mapTaskType(obj.task_type || ''),
      source_file: 'csv_upload',
    }
  })
}

const parseJSON = (text: string): Partial<AgentTask>[] => {
  const data = JSON.parse(text)
  const items: Record<string, string>[] = Array.isArray(data) ? data : data.tasks || [data]
  return items.map((item) => ({
    task_ref: item.task_id || item.task_ref || '',
    title: item.task_name || item.title || '',
    description: item.description || '',
    prd: item.prd || '',
    assigned_to: mapAssignee(item.assignee || item.assigned_to || 'CEO Agent'),
    status: mapStatus(item.status || 'New'),
    priority: (item.priority || 'normal') as Priority,
    acceptance_criteria: item.acceptance_criteria || '',
    repo_path: item.repo_path || '',
    branch_name: item.branch_name || '',
    complexity: mapComplexity(item.complexity || 'medium'),
    task_type: mapTaskType(item.task_type || ''),
    source_file: 'json_upload',
  }))
}

/* ── Claude Code Prompt Builder ─────────────────────────────────── */

const buildClaudePrompt = (task: Partial<AgentTask>): string => {
  return `Generate precise Claude Code instructions for this task.
Claude Code is an AI coding agent that runs in a terminal and executes autonomously.

Task ID: ${task.task_ref || 'N/A'}
Task Name: ${task.title}
Description: ${task.description || 'Not provided'}
PRD: ${task.prd || 'Not provided'}
Acceptance Criteria: ${task.acceptance_criteria || 'Not provided'}
Repo Path: ${task.repo_path || 'Not provided'}
Branch: ${task.branch_name || 'Not provided'}
Complexity: ${task.complexity || 'medium'}
Assigned to: ${task.assigned_to}

Please generate instructions in this exact format:

## Task: [task name]
## Context: [brief context]
## Steps:
1. [specific actionable step with file paths and function names]
2. [specific actionable step]
...
## Acceptance Criteria:
- [verifiable criterion Claude Code can check]
- [verifiable criterion]
## Notes: [warnings, dependencies, or important context]

Make the steps specific enough that Claude Code can execute without asking clarifying questions.`
}

/* ── Download Template Helper ───────────────────────────────────── */

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ══════════════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════════════ */

export default function AgentsPage() {
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [inboxMessages, setInboxMessages] = useState<AgentInboxMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(true)
  const [filter, setFilter] = useState<'all' | 'mine' | 'agents'>('all')

  // Sprint state
  const [selectedSprintTab, setSelectedSprintTab] = useState<string | null>(null) // null = Backlog
  const [showSprintForm, setShowSprintForm] = useState(false)
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null)
  const [sprintForm, setSprintForm] = useState({ name: '', goal: '', start_date: '', end_date: '', status: 'planned' as Sprint['status'] })
  const [sprintSaving, setSprintSaving] = useState(false)
  const [sprintSearchTerm, setSprintSearchTerm] = useState('')
  const [sprintDragIdx, setSprintDragIdx] = useState<number | null>(null)
  const [sprintDragOverIdx, setSprintDragOverIdx] = useState<number | null>(null)

  // Quick instruct form
  const [qiTitle, setQiTitle] = useState('')
  const [qiAssignee, setQiAssignee] = useState<string>('CEO Agent')
  const [qiPriority, setQiPriority] = useState<Priority>('normal')
  const [qiDescription, setQiDescription] = useState('')
  const [qiDueDate, setQiDueDate] = useState('')
  const [qiTaskType, setQiTaskType] = useState<TaskType>('coding')
  const [qiSprintId, setQiSprintId] = useState<string | null>(null)
  const [qiLeadId, setQiLeadId] = useState<string | null>(null)
  const [qiLeadSearch, setQiLeadSearch] = useState('')
  const [qiLeadResults, setQiLeadResults] = useState<LeadOption[]>([])
  const [qiLeadSelected, setQiLeadSelected] = useState<LeadOption | null>(null)
  const [qiSubmitting, setQiSubmitting] = useState(false)
  const [qiSuccess, setQiSuccess] = useState('')
  const [showQuickInstruct, setShowQuickInstruct] = useState(false)

  // Task detail panel
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null)
  const [editTask, setEditTask] = useState<Partial<AgentTask>>({})
  const [taskInbox, setTaskInbox] = useState<AgentInboxMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [panelSaving, setPanelSaving] = useState(false)
  const [editLeadSearch, setEditLeadSearch] = useState('')
  const [editLeadResults, setEditLeadResults] = useState<LeadOption[]>([])
  const [editLeadSelected, setEditLeadSelected] = useState<LeadOption | null>(null)
  const [prdExpanded, setPrdExpanded] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)
  const [instructionsCopied, setInstructionsCopied] = useState(false)

  // Upload state
  const csvInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const [uploadPreview, setUploadPreview] = useState<Partial<AgentTask>[]>([])
  const [uploadChecked, setUploadChecked] = useState<boolean[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Kanban drag state
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  /* ── Data Fetching ───────────────────────────────────────────── */

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bl_agent_tasks')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setTasks(data || [])
      setConnected(true)
    } catch { setConnected(false) }
  }, [])

  const fetchSprints = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bl_agent_sprints')
        .select('*')
        .order('start_date', { ascending: true })
      if (error) throw error
      setSprints(data || [])
    } catch { /* silent */ }
  }, [])

  const fetchInbox = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bl_agent_inbox')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setInboxMessages(data || [])
    } catch { /* silent */ }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchTasks(), fetchSprints(), fetchInbox()])
    setLoading(false)
  }, [fetchTasks, fetchSprints, fetchInbox])

  useEffect(() => {
    loadAll()
    const interval = setInterval(loadAll, 60000)
    return () => clearInterval(interval)
  }, [loadAll])

  // Set default sprint tab to active sprint on load
  const activeSprint = sprints.find(s => s.status === 'active')
  useEffect(() => {
    if (activeSprint && selectedSprintTab === null && sprints.length > 0) {
      setSelectedSprintTab(activeSprint.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sprints])

  // Default QI sprint to active sprint
  useEffect(() => {
    if (activeSprint && qiSprintId === null) setQiSprintId(activeSprint.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSprint])

  /* ── Lead search ─────────────────────────────────────────────── */

  const searchLeads = useCallback(async (query: string, setter: (r: LeadOption[]) => void) => {
    if (query.length < 2) { setter([]); return }
    try {
      const { data } = await supabase
        .from('leads')
        .select('id, name, company_name')
        .or(`name.ilike.%${query}%,company_name.ilike.%${query}%`)
        .limit(10)
      setter(data || [])
    } catch { setter([]) }
  }, [])

  /* ── Sprint CRUD ─────────────────────────────────────────────── */

  const openSprintForm = (sprint?: Sprint) => {
    if (sprint) {
      setEditingSprint(sprint)
      setSprintForm({
        name: sprint.name,
        goal: sprint.goal || '',
        start_date: sprint.start_date || '',
        end_date: sprint.end_date || '',
        status: sprint.status,
      })
    } else {
      setEditingSprint(null)
      setSprintForm({ name: '', goal: '', start_date: '', end_date: '', status: 'planned' })
    }
    setShowSprintForm(true)
  }

  const saveSprint = async () => {
    if (!sprintForm.name.trim()) return
    setSprintSaving(true)
    try {
      // Warn if setting active when another is active
      if (sprintForm.status === 'active') {
        const other = sprints.find(s => s.status === 'active' && s.id !== editingSprint?.id)
        if (other && !confirm(`"${other.name}" is already active. Setting this sprint to active will deactivate it. Continue?`)) {
          setSprintSaving(false)
          return
        }
        if (other) {
          await supabase.from('bl_agent_sprints').update({ status: 'planned', updated_at: new Date().toISOString() }).eq('id', other.id)
        }
      }
      if (editingSprint) {
        await supabase.from('bl_agent_sprints').update({
          name: sprintForm.name.trim(),
          goal: sprintForm.goal.trim() || null,
          start_date: sprintForm.start_date || null,
          end_date: sprintForm.end_date || null,
          status: sprintForm.status,
          updated_at: new Date().toISOString(),
        }).eq('id', editingSprint.id)
      } else {
        await supabase.from('bl_agent_sprints').insert({
          name: sprintForm.name.trim(),
          goal: sprintForm.goal.trim() || null,
          start_date: sprintForm.start_date || null,
          end_date: sprintForm.end_date || null,
          status: sprintForm.status,
        })
      }
      setShowSprintForm(false)
      await loadAll()
    } catch { /* silent */ }
    setSprintSaving(false)
  }

  const completeSprint = async (sprintId: string) => {
    const sprint = sprints.find(s => s.id === sprintId)
    if (!sprint) return
    const undone = tasks.filter(t => t.sprint_id === sprintId && t.status !== 'Done' && t.status !== 'Cancelled')
    if (!confirm(`Complete "${sprint.name}"? ${undone.length} unfinished task${undone.length !== 1 ? 's' : ''} will move to Backlog.`)) return
    try {
      // Move undone tasks to backlog
      for (const t of undone) {
        await supabase.from('bl_agent_tasks').update({
          sprint_id: null, queue_bucket: 'Backlog', updated_at: new Date().toISOString(),
        }).eq('id', t.id)
      }
      // Mark sprint completed
      await supabase.from('bl_agent_sprints').update({
        status: 'completed', updated_at: new Date().toISOString(),
      }).eq('id', sprintId)
      setSelectedSprintTab(null)
      await loadAll()
    } catch { /* silent */ }
  }

  /* ── Task CRUD ───────────────────────────────────────────────── */

  const createTask = async () => {
    if (!qiTitle.trim()) return
    setQiSubmitting(true)
    try {
      // Compute queue_position
      let queuePos: number | null = null
      if (qiSprintId) {
        const sprintTasks = tasks.filter(t => t.sprint_id === qiSprintId)
        const maxPos = sprintTasks.reduce((m, t) => Math.max(m, t.queue_position || 0), 0)
        queuePos = maxPos + 1
      }
      const { error } = await supabase.from('bl_agent_tasks').insert({
        title: qiTitle.trim(),
        description: qiDescription.trim() || null,
        status: 'New',
        priority: qiPriority,
        assigned_to: qiAssignee,
        created_by: 'Femi',
        related_lead_id: qiLeadId,
        due_date: qiDueDate || null,
        task_type: qiTaskType,
        sprint_id: qiSprintId,
        queue_position: queuePos,
        queue_bucket: qiSprintId ? 'Active Sprint' : 'Backlog',
      })
      if (error) throw error

      if (qiAssignee !== 'Unassigned') {
        await supabase.from('bl_agent_inbox').insert({
          from_role: 'board',
          to_agent: qiAssignee,
          message: qiDescription ? `${qiTitle.trim()}: ${qiDescription.trim()}` : qiTitle.trim(),
          priority: qiPriority === 'urgent' ? 'urgent' : 'normal',
        })
      }

      setQiSuccess(`Task created and assigned to ${qiAssignee}`)
      setQiTitle(''); setQiDescription(''); setQiPriority('normal')
      setQiDueDate(''); setQiLeadId(null); setQiLeadSearch('')
      setQiLeadSelected(null)
      setTimeout(() => setQiSuccess(''), 3000)
      await loadAll()
    } catch { /* silent */ }
    setQiSubmitting(false)
  }

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const updates: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }
      if (newStatus === 'Done') {
        updates.completed_at = new Date().toISOString()
        updates.queue_bucket = 'Done'
      }
      if (newStatus === 'Blocked') updates.queue_bucket = 'Blocked'
      const { error } = await supabase.from('bl_agent_tasks').update(updates).eq('id', taskId)
      if (error) throw error
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } as AgentTask : t))
      if (selectedTask?.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, ...updates } as AgentTask : null)
        setEditTask(prev => ({ ...prev, status: newStatus }))
      }
    } catch { /* silent */ }
  }

  const saveTaskEdits = async () => {
    if (!selectedTask) return
    setPanelSaving(true)
    try {
      const updates: Record<string, unknown> = {
        ...editTask,
        updated_at: new Date().toISOString(),
        related_lead_id: editLeadSelected?.id ?? selectedTask.related_lead_id,
      }
      if (typeof editTask.depends_on === 'string') {
        updates.depends_on = (editTask.depends_on as unknown as string).split(',').map(s => s.trim()).filter(Boolean)
      }
      if (editTask.status === 'Done' && selectedTask.status !== 'Done') {
        updates.completed_at = new Date().toISOString()
      }
      const { error } = await supabase.from('bl_agent_tasks').update(updates).eq('id', selectedTask.id)
      if (error) throw error
      await loadAll()
      setSelectedTask(prev => prev ? { ...prev, ...updates } as AgentTask : null)
    } catch { /* silent */ }
    setPanelSaving(false)
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return
    try {
      await supabase.from('bl_agent_tasks').delete().eq('id', taskId)
      setSelectedTask(null)
      await loadAll()
    } catch { /* silent */ }
  }

  const markDone = async () => {
    if (!selectedTask) return
    await updateTaskStatus(selectedTask.id, 'Done')
  }

  /* ── Sprint task management ──────────────────────────────────── */

  const addTaskToSprint = async (taskId: string, sprintId: string) => {
    const sprintTasks = tasks.filter(t => t.sprint_id === sprintId)
    const maxPos = sprintTasks.reduce((m, t) => Math.max(m, t.queue_position || 0), 0)
    try {
      await supabase.from('bl_agent_tasks').update({
        sprint_id: sprintId,
        queue_bucket: 'Active Sprint',
        queue_position: maxPos + 1,
        updated_at: new Date().toISOString(),
      }).eq('id', taskId)
      await loadAll()
    } catch { /* silent */ }
  }

  const removeTaskFromSprint = async (taskId: string) => {
    try {
      await supabase.from('bl_agent_tasks').update({
        sprint_id: null,
        queue_bucket: 'Backlog',
        queue_position: null,
        updated_at: new Date().toISOString(),
      }).eq('id', taskId)
      await loadAll()
    } catch { /* silent */ }
  }

  const reorderSprintTasks = async (sprintId: string, reordered: AgentTask[]) => {
    try {
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].queue_position !== i + 1) {
          await supabase.from('bl_agent_tasks').update({
            queue_position: i + 1,
            updated_at: new Date().toISOString(),
          }).eq('id', reordered[i].id)
        }
      }
      await fetchTasks()
    } catch { /* silent */ }
  }

  /* ── File Upload Handling ────────────────────────────────────── */

  const handleFileUpload = async (file: File, type: 'csv' | 'json') => {
    try {
      const text = await file.text()
      const parsed = type === 'csv' ? parseCSV(text) : parseJSON(text)
      if (parsed.length === 0) return
      setUploadPreview(parsed)
      setUploadChecked(new Array(parsed.length).fill(true))
      setShowUploadModal(true)
    } catch { alert(`Failed to parse ${type.toUpperCase()} file.`) }
  }

  const importTasks = async () => {
    const selected = uploadPreview.filter((_, i) => uploadChecked[i])
    if (selected.length === 0) return
    setUploading(true)
    try {
      for (const task of selected) {
        await supabase.from('bl_agent_tasks').insert({ ...task, created_by: 'Femi' })
      }
      setShowUploadModal(false)
      setUploadPreview([])
      await loadAll()
    } catch { alert('Failed to import some tasks.') }
    setUploading(false)
  }

  /* ── Inbox for task ──────────────────────────────────────────── */

  const loadTaskInbox = useCallback(async (task: AgentTask) => {
    try {
      const { data } = await supabase
        .from('bl_agent_inbox')
        .select('*')
        .or(`to_agent.eq.${task.assigned_to},message.ilike.%${task.title.slice(0, 40)}%`)
        .order('created_at', { ascending: true })
      setTaskInbox(data || [])
    } catch { setTaskInbox([]) }
  }, [])

  const sendMessage = async () => {
    if (!selectedTask || !newMessage.trim()) return
    try {
      await supabase.from('bl_agent_inbox').insert({
        from_role: 'board',
        to_agent: selectedTask.assigned_to,
        message: newMessage.trim(),
        priority: 'normal',
      })
      setNewMessage('')
      await loadTaskInbox(selectedTask)
    } catch { /* silent */ }
  }

  /* ── Clipboard ───────────────────────────────────────────────── */

  const copyToClipboard = async (text: string, setter: (v: boolean) => void) => {
    try { await navigator.clipboard.writeText(text); setter(true); setTimeout(() => setter(false), 2000) } catch { /* silent */ }
  }

  /* ── Open task panel ─────────────────────────────────────────── */

  const openTaskPanel = (task: AgentTask) => {
    setSelectedTask(task)
    setEditTask({
      task_ref: task.task_ref, title: task.title, description: task.description,
      prd: task.prd, acceptance_criteria: task.acceptance_criteria,
      status: task.status, assigned_to: task.assigned_to, priority: task.priority,
      complexity: task.complexity, due_date: task.due_date, notes: task.notes,
      paperclip_issue_id: task.paperclip_issue_id,
      claude_code_instructions: task.claude_code_instructions,
      repo_path: task.repo_path, branch_name: task.branch_name,
      depends_on: task.depends_on, task_type: task.task_type,
      sprint_id: task.sprint_id,
    })
    setEditLeadSelected(null); setEditLeadSearch(''); setEditLeadResults([])
    setPrdExpanded(false); setPromptCopied(false); setInstructionsCopied(false)
    loadTaskInbox(task)
  }

  /* ── Kanban Drag and Drop ────────────────────────────────────── */

  const handleDragStart = (taskId: string) => { setDragTaskId(taskId) }
  const handleDragOver = (e: React.DragEvent, stage: string) => { e.preventDefault(); setDragOverCol(stage) }
  const handleDragLeave = () => { setDragOverCol(null) }
  const handleDrop = async (stage: string) => {
    if (dragTaskId) await updateTaskStatus(dragTaskId, stage)
    setDragTaskId(null); setDragOverCol(null)
  }
  const handleDragEnd = () => { setDragTaskId(null); setDragOverCol(null) }

  /* ── Derived state ───────────────────────────────────────────── */

  // Kanban tasks filtered by sprint tab
  const kanbanTasks = tasks.filter(t => {
    if (selectedSprintTab === null) return t.sprint_id === null
    return t.sprint_id === selectedSprintTab
  }).filter(t => {
    if (filter === 'mine') return t.assigned_to === 'Femi'
    if (filter === 'agents') return t.assigned_to !== 'Femi' && t.assigned_to !== 'Unassigned'
    return true
  })

  const tasksByStage = (stage: string) => kanbanTasks.filter(t => t.status === stage)

  // Sprint task list (ordered by queue_position)
  const selectedSprintTasks = selectedSprintTab
    ? tasks.filter(t => t.sprint_id === selectedSprintTab).sort((a, b) => (a.queue_position || 999) - (b.queue_position || 999))
    : []

  // Backlog tasks
  const backlogTasks = tasks.filter(t => t.sprint_id === null)
  const backlogUnassigned = backlogTasks.filter(t => t.queue_bucket !== 'Blocked')
  const backlogBlocked = backlogTasks.filter(t => t.queue_bucket === 'Blocked')

  // Backlog search for add-to-sprint
  const searchableBacklog = sprintSearchTerm.length >= 2
    ? backlogTasks.filter(t => t.title.toLowerCase().includes(sprintSearchTerm.toLowerCase()) || (t.task_ref || '').toLowerCase().includes(sprintSearchTerm.toLowerCase()))
    : []

  // Agent stats
  const agentTaskCount = (agent: string) => tasks.filter(t => t.assigned_to === agent).length
  const agentIsActive = (agent: string) => tasks.some(t => t.assigned_to === agent && t.status === 'In Progress')
  const agentNextTask = (agent: string): AgentTask | null => {
    if (!activeSprint) return null
    return tasks
      .filter(t => t.assigned_to === agent && t.sprint_id === activeSprint.id && t.status === 'New')
      .sort((a, b) => (a.queue_position || 999) - (b.queue_position || 999))[0] || null
  }

  // Sprint progress
  const sprintProgress = (sprintId: string) => {
    const st = tasks.filter(t => t.sprint_id === sprintId)
    const done = st.filter(t => t.status === 'Done' || t.status === 'Cancelled').length
    return { total: st.length, done }
  }

  // Selected sprint object
  const selectedSprint = selectedSprintTab ? sprints.find(s => s.id === selectedSprintTab) : null

  /* ── Render ──────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{
          width: 32, height: 32, border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  const checkedCount = uploadChecked.filter(Boolean).length
  const nonCompletedSprints = sprints.filter(s => s.status !== 'completed')

  return (
    <div style={{ padding: '24px 24px 48px', maxWidth: 1400, margin: '0 auto', fontFamily: 'inherit' }}>

      {/* ═══ Section 1: Agent Control Centre ═══════════════════════ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
              Agent Control Centre
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>Beacon &amp; Ledger AI Workforce</p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: connected ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${connected ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
            borderRadius: 20, padding: '4px 12px',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#34D399' : '#F87171' }} />
            <span style={{ fontSize: 11, color: connected ? '#34D399' : '#F87171', fontWeight: 600 }}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Agent Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 20 }}>
          {AGENTS.filter(a => a !== 'Unassigned').map(agent => {
            const color = ASSIGNEE_COLORS[agent]
            const active = agentIsActive(agent)
            const count = agentTaskCount(agent)
            const isFemi = agent === 'Femi'
            const next = agentNextTask(agent)
            return (
              <div key={agent} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 16, borderTop: `3px solid ${color}`,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `${color}20`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isFemi ? <User size={16} style={{ color }} /> : <Bot size={16} style={{ color }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{agent}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{AGENT_ROLES[agent]}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                    background: active ? `${color}20` : 'var(--bg-primary)',
                    color: active ? color : 'var(--text-muted)',
                    border: `1px solid ${active ? `${color}40` : 'var(--border)'}`,
                  }}>{active ? 'Active' : 'Idle'}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                    background: 'var(--bg-primary)', color: 'var(--text-muted)', border: '1px solid var(--border)',
                  }}>{count} task{count !== 1 ? 's' : ''}</span>
                </div>
                {/* Next task indicator */}
                <div style={{
                  fontSize: 10, color: next ? color : 'var(--text-muted)',
                  background: next ? `${color}10` : 'var(--bg-primary)',
                  border: `1px solid ${next ? `${color}30` : 'var(--border)'}`,
                  borderRadius: 6, padding: '4px 8px',
                  display: 'flex', alignItems: 'center', gap: 4,
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                  <ArrowRight size={10} />
                  {next
                    ? <span>Next: #{next.queue_position} {next.task_ref ? `${next.task_ref} — ` : ''}{next.title.slice(0, 30)}{next.title.length > 30 ? '...' : ''}</span>
                    : <span>Queue empty</span>
                  }
                </div>
                <button onClick={() => { setQiAssignee(agent); setShowQuickInstruct(true) }} style={{
                  background: `${color}15`, color, border: `1px solid ${color}30`,
                  borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', display: 'flex',
                  alignItems: 'center', gap: 4, justifyContent: 'center',
                }}><Plus size={12} /> Assign task</button>
              </div>
            )
          })}
        </div>

        {/* Quick Instruct Panel */}
        {showQuickInstruct && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 20, marginTop: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Quick Instruct</h3>
              <button onClick={() => setShowQuickInstruct(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Title *</label>
                <input value={qiTitle} onChange={e => setQiTitle(e.target.value)} placeholder="What needs to be done?" style={inputStyle} />
              </div>
              {/* Task type selector */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Task type</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {TASK_TYPES.map(tt => (
                    <button key={tt} onClick={() => {
                      setQiTaskType(tt)
                      setQiAssignee(TASK_TYPE_AGENTS[tt])
                    }} style={{
                      flex: '1 1 0', minWidth: 80, padding: '6px 10px', borderRadius: 8, textTransform: 'capitalize',
                      border: qiTaskType === tt ? `2px solid ${TASK_TYPE_COLORS[tt]}` : '1px solid var(--border)',
                      background: qiTaskType === tt ? `${TASK_TYPE_COLORS[tt]}20` : 'var(--bg-primary)',
                      color: qiTaskType === tt ? TASK_TYPE_COLORS[tt] : 'var(--text-muted)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}>{tt}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Assign to</label>
                <select value={qiAssignee} onChange={e => setQiAssignee(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Sprint</label>
                <select value={qiSprintId || ''} onChange={e => setQiSprintId(e.target.value || null)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Backlog</option>
                  {nonCompletedSprints.map(s => (
                    <option key={s.id} value={s.id}>{s.name}{s.status === 'active' ? ' (Active)' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Due date</label>
                <input type="date" value={qiDueDate} onChange={e => setQiDueDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {PRIORITY_LEVELS.map(p => (
                    <button key={p} onClick={() => setQiPriority(p)} style={{
                      flex: 1, padding: '6px 8px', borderRadius: 8,
                      border: qiPriority === p ? `2px solid ${PRIORITY_COLORS[p] === 'transparent' ? 'var(--accent)' : PRIORITY_COLORS[p]}` : '1px solid var(--border)',
                      background: qiPriority === p ? (PRIORITY_COLORS[p] === 'transparent' ? 'var(--accent)' : PRIORITY_COLORS[p]) + '20' : 'var(--bg-primary)',
                      color: qiPriority === p ? (PRIORITY_COLORS[p] === 'transparent' ? 'var(--accent)' : PRIORITY_COLORS[p]) : 'var(--text-muted)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
                    }}>{p}</button>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Description</label>
                <textarea value={qiDescription} onChange={e => setQiDescription(e.target.value)}
                  placeholder="Additional details..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                <label style={labelStyle}>Related lead</label>
                {qiLeadSelected ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>
                      {qiLeadSelected.name || qiLeadSelected.company_name}
                      {qiLeadSelected.company_name && qiLeadSelected.name && <span style={{ color: 'var(--text-muted)' }}> - {qiLeadSelected.company_name}</span>}
                    </span>
                    <button onClick={() => { setQiLeadSelected(null); setQiLeadId(null); setQiLeadSearch('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
                      <input value={qiLeadSearch} onChange={e => { setQiLeadSearch(e.target.value); searchLeads(e.target.value, setQiLeadResults) }}
                        placeholder="Search leads..." style={{ ...inputStyle, paddingLeft: 30 }} />
                    </div>
                    {qiLeadResults.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                        {qiLeadResults.map(lead => (
                          <div key={lead.id} onClick={() => { setQiLeadSelected(lead); setQiLeadId(lead.id); setQiLeadSearch(''); setQiLeadResults([]) }}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                            {lead.name || 'Unnamed'}{lead.company_name && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{lead.company_name}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <button onClick={createTask} disabled={qiSubmitting || !qiTitle.trim()} style={{ ...btnPrimary, opacity: qiSubmitting || !qiTitle.trim() ? 0.5 : 1 }}>
                {qiSubmitting ? 'Creating...' : 'Create Task'}
              </button>
              {qiSuccess && <span style={{ fontSize: 12, color: '#34D399', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={14} /> {qiSuccess}</span>}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Section 2: Sprint Manager ═════════════════════════════ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} /> Sprints
          </h2>
          <button onClick={() => openSprintForm()} style={btnPrimary}><Plus size={14} /> New Sprint</button>
        </div>

        {/* Sprint tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
          <button onClick={() => setSelectedSprintTab(null)} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            border: selectedSprintTab === null ? '2px solid var(--accent)' : '1px solid var(--border)',
            background: selectedSprintTab === null ? 'var(--accent)' : 'var(--bg-card)',
            color: selectedSprintTab === null ? 'var(--bg-primary)' : 'var(--text-muted)',
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            Backlog
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 8,
              background: selectedSprintTab === null ? 'rgba(0,0,0,0.15)' : 'var(--bg-primary)',
            }}>{backlogTasks.length}</span>
          </button>
          {sprints.map(sprint => {
            const isSelected = selectedSprintTab === sprint.id
            const isActive = sprint.status === 'active'
            const prog = sprintProgress(sprint.id)
            const statusColor = sprint.status === 'active' ? '#34D399' : sprint.status === 'completed' ? '#5C6478' : '#7C8CF8'
            return (
              <button key={sprint.id} onClick={() => setSelectedSprintTab(sprint.id)} style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: isSelected ? `2px solid ${isActive ? 'var(--accent)' : '#7C8CF8'}` : '1px solid var(--border)',
                background: isSelected ? (isActive ? 'var(--accent)' : '#7C8CF820') : 'var(--bg-card)',
                color: isSelected ? (isActive ? 'var(--bg-primary)' : '#7C8CF8') : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: sprint.status === 'completed' ? 0.6 : 1,
              }}>
                {sprint.name}
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 8,
                  background: isSelected ? 'rgba(0,0,0,0.15)' : 'var(--bg-primary)',
                }}>{prog.total}</span>
                <span style={{
                  fontSize: 9, padding: '1px 6px', borderRadius: 8,
                  background: `${statusColor}20`, color: statusColor,
                  textTransform: 'capitalize', fontWeight: 700,
                }}>{sprint.status}</span>
              </button>
            )
          })}
        </div>

        {/* Sprint detail view or Backlog view */}
        {selectedSprintTab === null ? (
          /* ── Backlog view ─────────────────────────────────── */
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>Backlog</h3>

            {backlogBlocked.length > 0 && (
              <>
                <div style={{ ...sectionHeader, color: '#F87171' }}>Blocked</div>
                {backlogBlocked.map(task => (
                  <SprintTaskRow key={task.id} task={task} onEdit={() => openTaskPanel(task)} sprints={nonCompletedSprints} onAddToSprint={addTaskToSprint} />
                ))}
              </>
            )}

            <div style={sectionHeader}>Unassigned</div>
            {backlogUnassigned.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No tasks in backlog.</p>}
            {backlogUnassigned.map(task => (
              <SprintTaskRow key={task.id} task={task} onEdit={() => openTaskPanel(task)} sprints={nonCompletedSprints} onAddToSprint={addTaskToSprint} />
            ))}
          </div>
        ) : selectedSprint ? (
          /* ── Sprint detail view ───────────────────────────── */
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            {/* Sprint info bar */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{selectedSprint.name}</h3>
                {selectedSprint.goal && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>{selectedSprint.goal}</p>}
                {(selectedSprint.start_date || selectedSprint.end_date) && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={11} /> {selectedSprint.start_date ? formatDate(selectedSprint.start_date) : '?'} — {selectedSprint.end_date ? formatDate(selectedSprint.end_date) : '?'}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                {/* Progress */}
                {(() => {
                  const prog = sprintProgress(selectedSprint.id)
                  const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{prog.done}/{prog.total} done</span>
                      <div style={{ width: 100, height: 6, borderRadius: 3, background: 'var(--bg-primary)' }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: '#34D399', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#34D399', fontWeight: 600 }}>{pct}%</span>
                    </div>
                  )
                })()}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openSprintForm(selectedSprint)} style={btnSecondary}><Pencil size={10} /> Edit</button>
                  {selectedSprint.status !== 'completed' && (
                    <button onClick={() => completeSprint(selectedSprint.id)} style={{
                      ...btnSecondary, color: '#34D399', borderColor: '#34D39940',
                    }}><CheckCircle size={10} /> Complete sprint</button>
                  )}
                </div>
              </div>
            </div>

            {/* Task routing legend */}
            <div style={{
              display: 'flex', gap: 12, flexWrap: 'wrap', padding: '8px 12px',
              background: 'var(--bg-primary)', borderRadius: 8, marginBottom: 16,
              border: '1px solid var(--border)',
            }}>
              {TASK_TYPES.map(tt => (
                <span key={tt} style={{ fontSize: 10, color: TASK_TYPE_COLORS[tt], display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: TASK_TYPE_COLORS[tt] }} />
                  {tt} &rarr; {TASK_TYPE_AGENTS[tt]}
                </span>
              ))}
            </div>

            {/* Add task to sprint search */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
              <input value={sprintSearchTerm} onChange={e => setSprintSearchTerm(e.target.value)}
                placeholder="Add task to sprint..." style={{ ...inputStyle, paddingLeft: 30 }} />
              {searchableBacklog.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                  {searchableBacklog.map(task => (
                    <div key={task.id} onClick={() => { addTaskToSprint(task.id, selectedSprint.id); setSprintSearchTerm('') }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {task.task_ref && <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '1px 4px', borderRadius: 4 }}>{task.task_ref}</span>}
                      {task.title}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sprint task list (drag to reorder) */}
            {selectedSprintTasks.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No tasks in this sprint. Use the search above to add tasks.</p>}
            {selectedSprintTasks.map((task, idx) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => setSprintDragIdx(idx)}
                onDragOver={e => { e.preventDefault(); setSprintDragOverIdx(idx) }}
                onDragEnd={() => {
                  if (sprintDragIdx !== null && sprintDragOverIdx !== null && sprintDragIdx !== sprintDragOverIdx) {
                    const reordered = [...selectedSprintTasks]
                    const [moved] = reordered.splice(sprintDragIdx, 1)
                    reordered.splice(sprintDragOverIdx, 0, moved)
                    reorderSprintTasks(selectedSprint.id, reordered)
                  }
                  setSprintDragIdx(null); setSprintDragOverIdx(null)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  background: sprintDragOverIdx === idx ? 'var(--accent)10' : 'var(--bg-primary)',
                  border: `1px solid ${sprintDragOverIdx === idx ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 8, marginBottom: 4, cursor: 'grab',
                  opacity: sprintDragIdx === idx ? 0.4 : 1,
                  transition: 'opacity 0.15s, border-color 0.15s',
                }}
              >
                <GripVertical size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', width: 28, flexShrink: 0 }}>#{task.queue_position}</span>
                {task.task_ref && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6, background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)', flexShrink: 0 }}>{task.task_ref}</span>
                )}
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}
                  onClick={() => openTaskPanel(task)}>{task.title}</span>
                {task.task_type && (
                  <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: `${TASK_TYPE_COLORS[task.task_type]}20`, color: TASK_TYPE_COLORS[task.task_type], textTransform: 'capitalize', flexShrink: 0 }}>{task.task_type}</span>
                )}
                <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: `${ASSIGNEE_COLORS[task.assigned_to] || '#5C6478'}20`, color: ASSIGNEE_COLORS[task.assigned_to] || '#5C6478', flexShrink: 0 }}>{task.assigned_to}</span>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: `${STAGE_COLORS[task.status]}20`, color: STAGE_COLORS[task.status], flexShrink: 0 }}>{task.status}</span>
                {task.priority !== 'normal' && (
                  <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: `${PRIORITY_COLORS[task.priority]}20`, color: PRIORITY_COLORS[task.priority], textTransform: 'capitalize', flexShrink: 0 }}>{task.priority}</span>
                )}
                <button onClick={() => removeTaskFromSprint(task.id)} title="Remove from sprint" style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0,
                }}><X size={14} /></button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* ═══ Section 3: Task Kanban ════════════════════════════════ */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Task Board {selectedSprint ? `— ${selectedSprint.name}` : '— Backlog'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {(['all', 'mine', 'agents'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: filter === f ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: filter === f ? 'var(--accent)' : 'var(--bg-card)',
                color: filter === f ? 'var(--bg-primary)' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{f === 'mine' ? 'Mine' : f === 'agents' ? 'Agents' : 'All'}</button>
            ))}
            <input ref={csvInputRef} type="file" accept=".csv" hidden onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'csv'); e.target.value = '' }} />
            <input ref={jsonInputRef} type="file" accept=".json" hidden onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'json'); e.target.value = '' }} />
            <button onClick={() => csvInputRef.current?.click()} style={btnSecondary}><Upload size={12} /> CSV</button>
            <button onClick={() => jsonInputRef.current?.click()} style={btnSecondary}><Upload size={12} /> JSON</button>
            <button onClick={() => downloadFile(CSV_TEMPLATE, 'task-template.csv', 'text/csv')} style={{ ...btnSecondary, fontSize: 10, padding: '4px 8px' }}><Download size={10} /> CSV template</button>
            <button onClick={() => downloadFile(JSON_TEMPLATE, 'task-template.json', 'application/json')} style={{ ...btnSecondary, fontSize: 10, padding: '4px 8px' }}><Download size={10} /> JSON template</button>
            <button onClick={() => setShowQuickInstruct(true)} style={btnPrimary}><Plus size={14} /> Add Task</button>
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${TASK_STAGES.length}, minmax(170px, 1fr))`,
          gap: 10, overflowX: 'auto', paddingBottom: 8,
        }}>
          {TASK_STAGES.map(stage => {
            const stageTasks = tasksByStage(stage)
            const isOver = dragOverCol === stage
            return (
              <div key={stage}
                onDragOver={e => handleDragOver(e, stage)} onDragLeave={handleDragLeave} onDrop={() => handleDrop(stage)}
                style={{
                  background: isOver ? `${STAGE_COLORS[stage]}10` : 'var(--bg-card)',
                  border: `1px solid ${isOver ? STAGE_COLORS[stage] + '60' : 'var(--border)'}`,
                  borderRadius: 12, borderTop: `3px solid ${STAGE_COLORS[stage]}`,
                  minHeight: 300, display: 'flex', flexDirection: 'column',
                  transition: 'all 0.15s', opacity: stage === 'Cancelled' ? 0.7 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 8px' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: STAGE_COLORS[stage] }}>{stage}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 10, background: `${STAGE_COLORS[stage]}20`, color: STAGE_COLORS[stage] }}>{stageTasks.length}</span>
                </div>
                <div style={{ flex: 1, padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }} className="custom-scrollbar">
                  {stageTasks.map(task => {
                    const dueInfo = getDueDateStyle(task.due_date)
                    const isDragging = dragTaskId === task.id
                    const compColor = task.complexity ? COMPLEXITY_COLORS[task.complexity] : null
                    return (
                      <div key={task.id} draggable onDragStart={() => handleDragStart(task.id)} onDragEnd={handleDragEnd}
                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, cursor: 'grab', opacity: isDragging ? 0.4 : 1, transition: 'opacity 0.15s', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {task.task_ref && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6, background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{task.task_ref}</span>}
                            {task.claude_code_instructions && <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 4px', borderRadius: 4, background: '#7C8CF820', color: '#7C8CF8' }}>CC</span>}
                            {task.task_type && <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 4, background: `${TASK_TYPE_COLORS[task.task_type]}20`, color: TASK_TYPE_COLORS[task.task_type], textTransform: 'capitalize' }}>{task.task_type}</span>}
                          </div>
                          {compColor && <div style={{ width: 8, height: 8, borderRadius: '50%', background: compColor }} title={task.complexity || ''} />}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>{task.title}</div>
                        {task.description && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{task.description}</div>}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 10, background: `${ASSIGNEE_COLORS[task.assigned_to] || '#5C6478'}20`, color: ASSIGNEE_COLORS[task.assigned_to] || '#5C6478' }}>{task.assigned_to}</span>
                          {task.priority !== 'normal' && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 10, background: `${PRIORITY_COLORS[task.priority]}20`, color: PRIORITY_COLORS[task.priority], textTransform: 'capitalize' }}>{task.priority}</span>}
                          {dueInfo && <span style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 2, color: dueInfo.color }}><Clock size={10} /> {dueInfo.label}</span>}
                          {task.paperclip_issue_id && <Link size={10} style={{ color: 'var(--text-muted)' }} />}
                        </div>
                        <div className="task-card-actions" style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.15s' }}>
                          {getPrevStage(task.status) && (
                            <button onClick={e => { e.stopPropagation(); updateTaskStatus(task.id, getPrevStage(task.status)!) }} title={`Move to ${getPrevStage(task.status)}`}
                              style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: 0 }}><ChevronLeft size={12} /></button>
                          )}
                          {getNextStage(task.status) && (
                            <button onClick={e => { e.stopPropagation(); updateTaskStatus(task.id, getNextStage(task.status)!) }} title={`Move to ${getNextStage(task.status)}`}
                              style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: 0 }}><ChevronRight size={12} /></button>
                          )}
                          <button onClick={e => { e.stopPropagation(); openTaskPanel(task) }} title="Edit"
                            style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: 0 }}><Pencil size={10} /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ Upload Preview Modal ══════════════════════════════════ */}
      {showUploadModal && (
        <>
          <div onClick={() => setShowUploadModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 800, maxWidth: '95vw', maxHeight: '80vh', background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: 16, zIndex: 100, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Review {uploadPreview.length} tasks before importing</h3>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }} className="custom-scrollbar">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr>
                  {['', 'Ref', 'Title', 'Assignee', 'Status', 'Priority', 'Complexity'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{uploadPreview.map((task, i) => (
                  <tr key={i} style={{ opacity: uploadChecked[i] ? 1 : 0.4 }}>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}><input type="checkbox" checked={uploadChecked[i]} onChange={() => setUploadChecked(prev => { const n = [...prev]; n[i] = !n[i]; return n })} /></td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>{task.task_ref || '-'}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 600 }}>{task.title}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}><span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: `${ASSIGNEE_COLORS[task.assigned_to || 'Unassigned'] || '#5C6478'}20`, color: ASSIGNEE_COLORS[task.assigned_to || 'Unassigned'] || '#5C6478' }}>{task.assigned_to}</span></td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', color: STAGE_COLORS[task.status || 'New'] }}>{task.status}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{task.priority}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', textTransform: 'capitalize' }}>{task.complexity && <span style={{ color: COMPLEXITY_COLORS[task.complexity] }}>{task.complexity}</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 8, fontSize: 11, color: '#F59E0B' }}>
                <AlertCircle size={14} />To generate Claude Code instructions: open a task &rarr; click &quot;Copy prompt&quot; &rarr; paste into Claude.ai &rarr; copy the response back
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={importTasks} disabled={uploading || checkedCount === 0} style={{ ...btnPrimary, opacity: uploading || checkedCount === 0 ? 0.5 : 1 }}>
                  {uploading ? 'Importing...' : `Import ${checkedCount} task${checkedCount !== 1 ? 's' : ''}`}
                </button>
                <button onClick={() => setShowUploadModal(false)} style={btnSecondary}>Cancel</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ Sprint Create/Edit Panel ═════════════════════════════ */}
      {showSprintForm && (
        <>
          <div onClick={() => setShowSprintForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '100vw',
            background: 'var(--bg-mid)', borderLeft: '1px solid var(--border)', zIndex: 100,
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }} className="custom-scrollbar">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-mid)', zIndex: 2 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{editingSprint ? 'Edit Sprint' : 'New Sprint'}</h3>
              <button onClick={() => setShowSprintForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={labelStyle}>Sprint name *</label><input value={sprintForm.name} onChange={e => setSprintForm(prev => ({ ...prev, name: e.target.value }))} placeholder='Sprint 1 — Platform Foundation' style={inputStyle} /></div>
              <div><label style={labelStyle}>Goal</label><textarea value={sprintForm.goal} onChange={e => setSprintForm(prev => ({ ...prev, goal: e.target.value }))} placeholder="What this sprint achieves..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Start date</label><input type="date" value={sprintForm.start_date} onChange={e => setSprintForm(prev => ({ ...prev, start_date: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>End date</label><input type="date" value={sprintForm.end_date} onChange={e => setSprintForm(prev => ({ ...prev, end_date: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Status</label><select value={sprintForm.status} onChange={e => setSprintForm(prev => ({ ...prev, status: e.target.value as Sprint['status'] }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="planned">Planned</option><option value="active">Active</option><option value="completed">Completed</option>
              </select></div>
              <button onClick={saveSprint} disabled={sprintSaving || !sprintForm.name.trim()} style={{ ...btnPrimary, opacity: sprintSaving || !sprintForm.name.trim() ? 0.5 : 1, justifyContent: 'center' }}>
                {sprintSaving ? 'Saving...' : editingSprint ? 'Save Changes' : 'Create Sprint'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══ Task Detail Panel (Slide-out) ═════════════════════════ */}
      {selectedTask && (
        <>
          <div onClick={() => setSelectedTask(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }} />

          {prdExpanded && (
            <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-primary)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>PRD</h3>
                <button onClick={() => setPrdExpanded(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={18} /></button>
              </div>
              <textarea value={editTask.prd || ''} onChange={e => setEditTask(prev => ({ ...prev, prd: e.target.value }))} style={{ ...monoInputStyle, flex: 1, margin: 16, borderRadius: 12, resize: 'none' }} />
            </div>
          )}

          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 520, maxWidth: '100vw', background: 'var(--bg-mid)', borderLeft: '1px solid var(--border)', zIndex: 100, display: 'flex', flexDirection: 'column', overflowY: 'auto' }} className="custom-scrollbar">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-mid)', zIndex: 2 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Edit Task</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={markDone} style={{ background: '#34D39920', color: '#34D399', border: '1px solid #34D39940', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} /> Done</button>
                <button onClick={() => deleteTask(selectedTask.id)} style={{ background: '#F8717120', color: '#F87171', border: '1px solid #F8717140', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}><Trash2 size={12} /> Delete</button>
                <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={18} /></button>
              </div>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={sectionHeader}>Task Identity</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Task Ref</label><input value={editTask.task_ref || ''} onChange={e => setEditTask(prev => ({ ...prev, task_ref: e.target.value }))} placeholder="BL-001" style={inputStyle} /></div>
                <div><label style={labelStyle}>Depends on</label><input value={Array.isArray(editTask.depends_on) ? editTask.depends_on.join(', ') : (editTask.depends_on || '')} onChange={e => setEditTask(prev => ({ ...prev, depends_on: e.target.value as unknown as string[] }))} placeholder="BL-002, BL-003" style={inputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Title</label><input value={editTask.title || ''} onChange={e => setEditTask(prev => ({ ...prev, title: e.target.value }))} style={inputStyle} /></div>

              {/* Task type */}
              <div>
                <label style={labelStyle}>Task type</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {TASK_TYPES.map(tt => (
                    <button key={tt} onClick={() => { setEditTask(prev => ({ ...prev, task_type: tt, assigned_to: TASK_TYPE_AGENTS[tt] })) }} style={{
                      flex: '1 1 0', minWidth: 70, padding: '5px 8px', borderRadius: 8, textTransform: 'capitalize',
                      border: editTask.task_type === tt ? `2px solid ${TASK_TYPE_COLORS[tt]}` : '1px solid var(--border)',
                      background: editTask.task_type === tt ? `${TASK_TYPE_COLORS[tt]}20` : 'var(--bg-primary)',
                      color: editTask.task_type === tt ? TASK_TYPE_COLORS[tt] : 'var(--text-muted)',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}>{tt}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Complexity</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COMPLEXITY_LEVELS.map(c => (
                    <button key={c} onClick={() => setEditTask(prev => ({ ...prev, complexity: c }))} style={{
                      flex: 1, padding: '6px 12px', borderRadius: 8, textTransform: 'capitalize',
                      border: editTask.complexity === c ? `2px solid ${COMPLEXITY_COLORS[c]}` : '1px solid var(--border)',
                      background: editTask.complexity === c ? `${COMPLEXITY_COLORS[c]}20` : 'var(--bg-primary)',
                      color: editTask.complexity === c ? COMPLEXITY_COLORS[c] : 'var(--text-muted)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}>{c}</button>
                  ))}
                </div>
              </div>

              {/* Sprint selector in panel */}
              <div>
                <label style={labelStyle}>Sprint</label>
                <select value={editTask.sprint_id || ''} onChange={e => setEditTask(prev => ({ ...prev, sprint_id: e.target.value || null }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Backlog</option>
                  {nonCompletedSprints.map(s => <option key={s.id} value={s.id}>{s.name}{s.status === 'active' ? ' (Active)' : ''}</option>)}
                </select>
              </div>

              <div style={sectionHeader}>Description &amp; PRD</div>
              <div><label style={labelStyle}>Description</label><textarea value={editTask.description || ''} onChange={e => setEditTask(prev => ({ ...prev, description: e.target.value }))} rows={4} style={{ ...inputStyle, resize: 'vertical' }} /></div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>PRD</label>
                  <button onClick={() => setPrdExpanded(true)} style={{ ...btnSecondary, padding: '2px 8px', fontSize: 10 }}><ChevronUp size={10} /> Expand</button>
                </div>
                <textarea value={editTask.prd || ''} onChange={e => setEditTask(prev => ({ ...prev, prd: e.target.value }))} rows={8} style={{ ...monoInputStyle, resize: 'vertical' }} />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textAlign: 'right' }}>{(editTask.prd || '').length} chars</div>
              </div>

              <div style={sectionHeader}>Acceptance Criteria</div>
              <textarea value={editTask.acceptance_criteria || ''} onChange={e => setEditTask(prev => ({ ...prev, acceptance_criteria: e.target.value }))} rows={4} placeholder={'- [ ] Criterion one\n- [ ] Criterion two\n- [ ] Criterion three'} style={{ ...inputStyle, resize: 'vertical' }} />

              <div style={sectionHeader}>Execution</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Repo path</label><input value={editTask.repo_path || ''} onChange={e => setEditTask(prev => ({ ...prev, repo_path: e.target.value }))} placeholder="/Users/femi/Projects/bl-dashboard" style={inputStyle} /></div>
                <div><label style={labelStyle}>Branch name</label><input value={editTask.branch_name || ''} onChange={e => setEditTask(prev => ({ ...prev, branch_name: e.target.value }))} placeholder="feature/task-name" style={inputStyle} /></div>
              </div>

              <div style={sectionHeader}><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Code size={12} /> Claude Code Instructions</span></div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Paste these into Claude Code to execute this task</p>
              {!editTask.claude_code_instructions ? (
                <>
                  <textarea value={editTask.claude_code_instructions || ''} onChange={e => setEditTask(prev => ({ ...prev, claude_code_instructions: e.target.value }))} rows={6} placeholder="Paste Claude Code instructions here..." style={{ ...monoInputStyle, resize: 'vertical' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F59E0B10', border: '1px solid #F59E0B30', borderRadius: 8, fontSize: 11, color: '#F59E0B' }}><Zap size={12} />Click &quot;Copy prompt&quot; &rarr; paste into Claude.ai &rarr; copy the response back here</div>
                  <button onClick={() => copyToClipboard(buildClaudePrompt(editTask), setPromptCopied)} style={{ ...btnSecondary, justifyContent: 'center', background: promptCopied ? '#34D39920' : 'var(--bg-card)', color: promptCopied ? '#34D399' : 'var(--text-muted)', borderColor: promptCopied ? '#34D39940' : 'var(--border)' }}>
                    {promptCopied ? <><Check size={12} /> Prompt copied!</> : <><Copy size={12} /> Copy prompt</>}
                  </button>
                </>
              ) : (
                <>
                  <textarea value={editTask.claude_code_instructions || ''} onChange={e => setEditTask(prev => ({ ...prev, claude_code_instructions: e.target.value }))} rows={12} style={{ ...monoInputStyle, resize: 'vertical' }} />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>{(editTask.claude_code_instructions || '').length} chars</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => copyToClipboard(editTask.claude_code_instructions || '', setInstructionsCopied)} style={{ ...btnSecondary, flex: 1, justifyContent: 'center', background: instructionsCopied ? '#34D39920' : 'var(--bg-card)', color: instructionsCopied ? '#34D399' : 'var(--text-muted)', borderColor: instructionsCopied ? '#34D39940' : 'var(--border)' }}>
                      {instructionsCopied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy instructions</>}
                    </button>
                    <button onClick={() => copyToClipboard(buildClaudePrompt(editTask), setPromptCopied)} style={{ ...btnSecondary, flex: 1, justifyContent: 'center', background: promptCopied ? '#34D39920' : 'var(--bg-card)', color: promptCopied ? '#34D399' : 'var(--text-muted)', borderColor: promptCopied ? '#34D39940' : 'var(--border)' }}>
                      {promptCopied ? <><Check size={12} /> Prompt copied!</> : <><RefreshCw size={12} /> Refresh prompt</>}
                    </button>
                  </div>
                </>
              )}

              <div style={sectionHeader}>Pipeline</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Status</label><select value={editTask.status || ''} onChange={e => setEditTask(prev => ({ ...prev, status: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>{TASK_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label style={labelStyle}>Assigned to</label><select value={editTask.assigned_to || ''} onChange={e => setEditTask(prev => ({ ...prev, assigned_to: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>{AGENTS.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
              </div>
              <div>
                <label style={labelStyle}>Priority</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {PRIORITY_LEVELS.map(p => (
                    <button key={p} onClick={() => setEditTask(prev => ({ ...prev, priority: p }))} style={{
                      flex: 1, padding: '6px 12px', borderRadius: 8,
                      border: editTask.priority === p ? `2px solid ${PRIORITY_COLORS[p] === 'transparent' ? 'var(--accent)' : PRIORITY_COLORS[p]}` : '1px solid var(--border)',
                      background: editTask.priority === p ? (PRIORITY_COLORS[p] === 'transparent' ? 'var(--accent)' : PRIORITY_COLORS[p]) + '20' : 'var(--bg-primary)',
                      color: editTask.priority === p ? (PRIORITY_COLORS[p] === 'transparent' ? 'var(--accent)' : PRIORITY_COLORS[p]) : 'var(--text-muted)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
                    }}>{p}</button>
                  ))}
                </div>
              </div>
              <div><label style={labelStyle}>Due date</label><input type="date" value={editTask.due_date || ''} onChange={e => setEditTask(prev => ({ ...prev, due_date: e.target.value }))} style={inputStyle} /></div>

              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>Related lead</label>
                {editLeadSelected ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{editLeadSelected.name || editLeadSelected.company_name}</span>
                    <button onClick={() => { setEditLeadSelected(null); setEditLeadSearch('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
                      <input value={editLeadSearch} onChange={e => { setEditLeadSearch(e.target.value); searchLeads(e.target.value, setEditLeadResults) }} placeholder={selectedTask.related_lead_id ? 'Lead linked — search to change' : 'Search leads...'} style={{ ...inputStyle, paddingLeft: 30 }} />
                    </div>
                    {editLeadResults.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                        {editLeadResults.map(lead => (
                          <div key={lead.id} onClick={() => { setEditLeadSelected(lead); setEditLeadSearch(''); setEditLeadResults([]) }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                            {lead.name || 'Unnamed'}{lead.company_name && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{lead.company_name}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div><label style={labelStyle}>Notes</label><textarea value={editTask.notes || ''} onChange={e => setEditTask(prev => ({ ...prev, notes: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></div>
              <div><label style={labelStyle}>Paperclip Issue ID</label><input value={editTask.paperclip_issue_id || ''} onChange={e => setEditTask(prev => ({ ...prev, paperclip_issue_id: e.target.value }))} placeholder="e.g. PC-123" style={inputStyle} /></div>

              <button onClick={saveTaskEdits} disabled={panelSaving} style={{ ...btnPrimary, opacity: panelSaving ? 0.5 : 1, justifyContent: 'center' }}>{panelSaving ? 'Saving...' : 'Save Changes'}</button>

              {/* Inbox Thread */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>Communication Thread</h4>
                {taskInbox.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No messages yet.</p>}
                {taskInbox.map(msg => (
                  <div key={msg.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: msg.from_role === 'board' ? 'var(--accent)' : ASSIGNEE_COLORS[msg.to_agent] || 'var(--text-muted)' }}>{msg.from_role === 'board' ? 'Board' : msg.to_agent}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: msg.status === 'done' ? '#34D39920' : msg.status === 'in_progress' ? '#7C8CF820' : 'var(--bg-primary)', color: msg.status === 'done' ? '#34D399' : msg.status === 'in_progress' ? '#7C8CF8' : 'var(--text-muted)', textTransform: 'capitalize' }}>{msg.status}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatTimestamp(msg.created_at)}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>{msg.message}</p>
                    {msg.response && <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}><span style={{ fontWeight: 600, color: ASSIGNEE_COLORS[msg.to_agent] || 'var(--text-muted)' }}>{msg.to_agent}:</span>{' '}{msg.response}</div>}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendMessage() }} placeholder="Send a message..." style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={sendMessage} disabled={!newMessage.trim()} style={{ ...btnPrimary, opacity: !newMessage.trim() ? 0.5 : 1, padding: '8px 12px' }}><Send size={14} /></button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        div:has(> .task-card-actions):hover > .task-card-actions { opacity: 1 !important; }
      `}</style>
    </div>
  )
}

/* ── Sprint Task Row Component ──────────────────────────────────── */

function SprintTaskRow({ task, onEdit, sprints, onAddToSprint }: {
  task: AgentTask
  onEdit: () => void
  sprints: Sprint[]
  onAddToSprint: (taskId: string, sprintId: string) => void
}) {
  const [showSprintPicker, setShowSprintPicker] = useState(false)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
      background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 4,
    }}>
      {task.task_ref && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6, background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)', flexShrink: 0 }}>{task.task_ref}</span>}
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }} onClick={onEdit}>{task.title}</span>
      {task.task_type && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: `${TASK_TYPE_COLORS[task.task_type]}20`, color: TASK_TYPE_COLORS[task.task_type], textTransform: 'capitalize', flexShrink: 0 }}>{task.task_type}</span>}
      <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: `${ASSIGNEE_COLORS[task.assigned_to] || '#5C6478'}20`, color: ASSIGNEE_COLORS[task.assigned_to] || '#5C6478', flexShrink: 0 }}>{task.assigned_to}</span>
      <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: `${STAGE_COLORS[task.status]}20`, color: STAGE_COLORS[task.status], flexShrink: 0 }}>{task.status}</span>
      {task.priority !== 'normal' && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: `${PRIORITY_COLORS[task.priority]}20`, color: PRIORITY_COLORS[task.priority], textTransform: 'capitalize', flexShrink: 0 }}>{task.priority}</span>}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button onClick={() => setShowSprintPicker(!showSprintPicker)} title="Add to sprint" style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer',
          color: 'var(--text-muted)', padding: '2px 6px', fontSize: 10, fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 2,
        }}><Plus size={10} /> Sprint</button>
        {showSprintPicker && (
          <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, minWidth: 180, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            {sprints.map(s => (
              <div key={s.id} onClick={() => { onAddToSprint(task.id, s.id); setShowSprintPicker(false) }}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {s.name}
                {s.status === 'active' && <span style={{ fontSize: 9, color: '#34D399', fontWeight: 700 }}>Active</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
