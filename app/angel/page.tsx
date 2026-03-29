'use client'

import { useState, useEffect, useCallback, CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Trash2,
  Edit3,
  ArrowRightCircle,
  XCircle,
  FileText,
  Users,
  CalendarClock,
  CheckCircle2,
} from 'lucide-react'

/* ─── Design Tokens ─── */
const NAVY = '#0F1B35'
const NAVY_MID = '#162240'
const NAVY_CARD = '#1E2F52'
const TEAL = '#53E9C5'
const SLATE = '#5C6478'
const LIGHT = '#E8EDF5'
const BORDER = 'rgba(83,233,197,0.15)'
const AMBER = '#F59E0B'
const GREEN = '#34D399'
const RED = '#F87171'
const PURPLE = '#7C8CF8'

const STAGE_COLORS: Record<string, string> = {
  Identified: SLATE,
  Contacted: PURPLE,
  Meeting: AMBER,
  DD: '#F97316',
  Committed: GREEN,
  Closed: TEAL,
  Passed: RED,
}

/* ─── Types ─── */
interface AngelInvestor {
  id: string
  name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  company: string | null
  source: string | null
  stage: string
  amount_potential: number | null
  amount_committed: number | null
  next_action: string | null
  follow_up_date: string | null
  notes: string | null
  deck_sent: boolean
  financials_sent: boolean
  term_sheet_sent: boolean
  created_at: string
  updated_at: string
}

interface InvestorFormData {
  name: string
  company: string
  email: string
  phone: string
  linkedin_url: string
  source: string
  stage: string
  amount_potential: string
  amount_committed: string
  next_action: string
  follow_up_date: string
  notes: string
  deck_sent: boolean
  financials_sent: boolean
  term_sheet_sent: boolean
}

/* ─── Constants ─── */
const STAGES = ['Identified', 'Contacted', 'Meeting', 'DD', 'Committed', 'Closed', 'Passed'] as const
const ACTIVE_STAGES = ['Identified', 'Contacted', 'Meeting', 'DD', 'Committed', 'Closed'] as const
const SOURCES = ['Warm Intro', 'Cold', 'Event', 'LinkedIn', 'Referral'] as const
const TARGET = 120000

const emptyForm: InvestorFormData = {
  name: '',
  company: '',
  email: '',
  phone: '',
  linkedin_url: '',
  source: '',
  stage: 'Identified',
  amount_potential: '',
  amount_committed: '',
  next_action: '',
  follow_up_date: '',
  notes: '',
  deck_sent: false,
  financials_sent: false,
  term_sheet_sent: false,
}

/* ─── Helper: format currency ─── */
function fmtCurrency(n: number): string {
  return '£' + n.toLocaleString()
}

/* ─── Helper: format date ─── */
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB')
}

/* ─── Helper: date status ─── */
function dateStatus(followUp: string | null): 'overdue' | 'soon' | 'normal' | null {
  if (!followUp) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(followUp)
  target.setHours(0, 0, 0, 0)
  const diff = target.getTime() - today.getTime()
  const days = diff / (1000 * 60 * 60 * 24)
  if (days < 0) return 'overdue'
  if (days <= 3) return 'soon'
  return 'normal'
}

/* ─── Reusable Style Components ─── */
function Card({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: NAVY_MID,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        textTransform: 'uppercase',
        fontSize: 11,
        letterSpacing: 1.5,
        color: SLATE,
        margin: '0 0 12px 0',
        fontWeight: 600,
      }}
    >
      {children}
    </h3>
  )
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 10px',
        borderRadius: 999,
        background: color + '22',
        color: color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

function Btn({
  children,
  variant = 'ghost',
  onClick,
  disabled,
  type,
  style: extraStyle,
}: {
  children: React.ReactNode
  variant?: 'ghost' | 'teal' | 'danger' | 'amber'
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  style?: CSSProperties
}) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all .15s',
    border: 'none',
    background: 'transparent',
    color: LIGHT,
  }
  const variants: Record<string, CSSProperties> = {
    ghost: { border: `1px solid ${BORDER}`, color: LIGHT },
    teal: { border: `1px solid ${TEAL}`, color: TEAL },
    danger: { border: `1px solid ${RED}`, color: RED },
    amber: { border: `1px solid ${AMBER}`, color: AMBER },
  }
  return (
    <button
      type={type || 'button'}
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...variants[variant], ...extraStyle }}
    >
      {children}
    </button>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type,
  required,
  style: extraStyle,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  style?: CSSProperties
}) {
  return (
    <input
      type={type || 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      style={{
        width: '100%',
        padding: '9px 12px',
        borderRadius: 8,
        border: `1px solid ${BORDER}`,
        background: NAVY_CARD,
        color: LIGHT,
        fontSize: 14,
        outline: 'none',
        boxSizing: 'border-box',
        ...extraStyle,
      }}
    />
  )
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '9px 12px',
        borderRadius: 8,
        border: `1px solid ${BORDER}`,
        background: NAVY_CARD,
        color: LIGHT,
        fontSize: 14,
        outline: 'none',
        boxSizing: 'border-box',
        appearance: 'none',
      }}
    >
      {placeholder && (
        <option value="" style={{ color: SLATE }}>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows || 3}
      style={{
        width: '100%',
        padding: '9px 12px',
        borderRadius: 8,
        border: `1px solid ${BORDER}`,
        background: NAVY_CARD,
        color: LIGHT,
        fontSize: 14,
        outline: 'none',
        boxSizing: 'border-box',
        resize: 'vertical',
        fontFamily: 'inherit',
      }}
    />
  )
}

/* ─── Field Label ─── */
function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, color: SLATE, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}

/* ─── Main Page ─── */
export default function AngelPage() {
  const [investors, setInvestors] = useState<AngelInvestor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addFormOpen, setAddFormOpen] = useState(false)
  const [addForm, setAddForm] = useState<InvestorFormData>({ ...emptyForm })
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<InvestorFormData>({ ...emptyForm })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    STAGES.forEach((s) => {
      init[s] = s !== 'Passed'
    })
    return init
  })
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
  const [mutationError, setMutationError] = useState<string | null>(null)

  /* ─── Load ─── */
  const loadInvestors = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('bl_angel_investors')
        .select('*')
        .order('created_at', { ascending: false })
      if (err) throw err
      setInvestors((data as AngelInvestor[]) || [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load investors'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInvestors()
  }, [loadInvestors])

  /* ─── Calculations ─── */
  const committed = investors
    .filter((i) => i.stage === 'Committed' || i.stage === 'Closed')
    .reduce((s, i) => s + (i.amount_committed || 0), 0)
  const potential = investors
    .filter((i) => i.stage !== 'Passed')
    .reduce((s, i) => s + (i.amount_potential || 0), 0)
  const remaining = Math.max(0, TARGET - committed)
  const pctCommitted = Math.min(100, (committed / TARGET) * 100)
  const pctPotential = Math.min(100, (potential / TARGET) * 100)

  const pipelineCount = investors.filter((i) => i.stage !== 'Passed').length
  const meetingPlusStages = ['Meeting', 'DD', 'Committed', 'Closed']
  const meetingsBooked = investors.filter((i) => meetingPlusStages.includes(i.stage)).length
  const committedCount = investors.filter((i) => i.stage === 'Committed' || i.stage === 'Closed').length

  /* ─── Add Investor ─── */
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.name.trim()) return
    setAddSubmitting(true)
    setMutationError(null)
    const now = new Date().toISOString()
    const payload = {
      name: addForm.name.trim(),
      company: addForm.company.trim() || null,
      email: addForm.email.trim() || null,
      phone: addForm.phone.trim() || null,
      linkedin_url: addForm.linkedin_url.trim() || null,
      source: addForm.source || null,
      stage: addForm.stage || 'Identified',
      amount_potential: addForm.amount_potential ? Number(addForm.amount_potential) : null,
      amount_committed: null,
      next_action: addForm.next_action.trim() || null,
      follow_up_date: addForm.follow_up_date || null,
      notes: addForm.notes.trim() || null,
      deck_sent: addForm.deck_sent,
      financials_sent: addForm.financials_sent,
      term_sheet_sent: addForm.term_sheet_sent,
      created_at: now,
      updated_at: now,
    }

    // Optimistic: add a temp item
    const tempId = 'temp-' + Date.now()
    const optimistic: AngelInvestor = { ...payload, id: tempId }
    setInvestors((prev) => [optimistic, ...prev])
    setAddForm({ ...emptyForm })
    setAddFormOpen(false)

    try {
      const { data, error: err } = await supabase
        .from('bl_angel_investors')
        .insert(payload)
        .select()
        .single()
      if (err) throw err
      setInvestors((prev) => prev.map((i) => (i.id === tempId ? (data as AngelInvestor) : i)))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to add investor'
      setMutationError(msg)
      setInvestors((prev) => prev.filter((i) => i.id !== tempId))
    } finally {
      setAddSubmitting(false)
    }
  }

  /* ─── Edit Investor ─── */
  const startEdit = (inv: AngelInvestor) => {
    setEditingId(inv.id)
    setEditForm({
      name: inv.name,
      company: inv.company || '',
      email: inv.email || '',
      phone: inv.phone || '',
      linkedin_url: inv.linkedin_url || '',
      source: inv.source || '',
      stage: inv.stage,
      amount_potential: inv.amount_potential?.toString() || '',
      amount_committed: inv.amount_committed?.toString() || '',
      next_action: inv.next_action || '',
      follow_up_date: inv.follow_up_date || '',
      notes: inv.notes || '',
      deck_sent: inv.deck_sent,
      financials_sent: inv.financials_sent,
      term_sheet_sent: inv.term_sheet_sent,
    })
  }

  const handleEditSave = async () => {
    if (!editingId || !editForm.name.trim()) return
    setEditSubmitting(true)
    setMutationError(null)
    const now = new Date().toISOString()
    const payload = {
      name: editForm.name.trim(),
      company: editForm.company.trim() || null,
      email: editForm.email.trim() || null,
      phone: editForm.phone.trim() || null,
      linkedin_url: editForm.linkedin_url.trim() || null,
      source: editForm.source || null,
      stage: editForm.stage,
      amount_potential: editForm.amount_potential ? Number(editForm.amount_potential) : null,
      amount_committed: editForm.amount_committed ? Number(editForm.amount_committed) : null,
      next_action: editForm.next_action.trim() || null,
      follow_up_date: editForm.follow_up_date || null,
      notes: editForm.notes.trim() || null,
      deck_sent: editForm.deck_sent,
      financials_sent: editForm.financials_sent,
      term_sheet_sent: editForm.term_sheet_sent,
      updated_at: now,
    }

    const prev = investors.find((i) => i.id === editingId)
    setInvestors((list) =>
      list.map((i) => (i.id === editingId ? { ...i, ...payload } : i))
    )
    setEditingId(null)

    try {
      const { error: err } = await supabase
        .from('bl_angel_investors')
        .update(payload)
        .eq('id', editingId)
      if (err) throw err
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update investor'
      setMutationError(msg)
      if (prev) setInvestors((list) => list.map((i) => (i.id === prev.id ? prev : i)))
    } finally {
      setEditSubmitting(false)
    }
  }

  /* ─── Delete ─── */
  const handleDelete = async (inv: AngelInvestor) => {
    if (!window.confirm(`Delete ${inv.name}?`)) return
    setMutationError(null)
    setInvestors((list) => list.filter((i) => i.id !== inv.id))
    setEditingId(null)

    try {
      const { error: err } = await supabase
        .from('bl_angel_investors')
        .delete()
        .eq('id', inv.id)
      if (err) throw err
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to delete investor'
      setMutationError(msg)
      setInvestors((list) => [...list, inv])
    }
  }

  /* ─── Next Stage ─── */
  const handleNextStage = async (inv: AngelInvestor) => {
    const idx = ACTIVE_STAGES.indexOf(inv.stage as typeof ACTIVE_STAGES[number])
    if (idx < 0 || idx >= ACTIVE_STAGES.length - 1) return
    const nextStage = ACTIVE_STAGES[idx + 1]
    const now = new Date().toISOString()

    const prev = { ...inv }
    setInvestors((list) =>
      list.map((i) => (i.id === inv.id ? { ...i, stage: nextStage, updated_at: now } : i))
    )

    try {
      const { error: err } = await supabase
        .from('bl_angel_investors')
        .update({ stage: nextStage, updated_at: now })
        .eq('id', inv.id)
      if (err) throw err
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to advance stage'
      setMutationError(msg)
      setInvestors((list) => list.map((i) => (i.id === inv.id ? prev : i)))
    }
  }

  /* ─── Pass ─── */
  const handlePass = async (inv: AngelInvestor) => {
    const now = new Date().toISOString()
    const prev = { ...inv }
    setInvestors((list) =>
      list.map((i) => (i.id === inv.id ? { ...i, stage: 'Passed', updated_at: now } : i))
    )

    try {
      const { error: err } = await supabase
        .from('bl_angel_investors')
        .update({ stage: 'Passed', updated_at: now })
        .eq('id', inv.id)
      if (err) throw err
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to mark as passed'
      setMutationError(msg)
      setInvestors((list) => list.map((i) => (i.id === inv.id ? prev : i)))
    }
  }

  /* ─── Toggle helpers ─── */
  const toggleStage = (stage: string) =>
    setExpandedStages((prev) => ({ ...prev, [stage]: !prev[stage] }))
  const toggleNotes = (id: string) =>
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }))

  /* ─── Grouped investors ─── */
  const grouped: Record<string, AngelInvestor[]> = {}
  STAGES.forEach((s) => {
    grouped[s] = investors.filter((i) => i.stage === s)
  })

  /* ─── Render Form Fields ─── */
  const renderFormFields = (
    form: InvestorFormData,
    setForm: (fn: (prev: InvestorFormData) => InvestorFormData) => void,
    showAmountCommitted: boolean
  ) => (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        <FieldLabel label="Name *">
          <Input
            value={form.name}
            onChange={(v) => setForm((p) => ({ ...p, name: v }))}
            placeholder="Investor name"
            required
          />
        </FieldLabel>
        <FieldLabel label="Company">
          <Input
            value={form.company}
            onChange={(v) => setForm((p) => ({ ...p, company: v }))}
            placeholder="Company"
          />
        </FieldLabel>
        <FieldLabel label="Email">
          <Input
            value={form.email}
            onChange={(v) => setForm((p) => ({ ...p, email: v }))}
            placeholder="email@example.com"
            type="email"
          />
        </FieldLabel>
        <FieldLabel label="Phone">
          <Input
            value={form.phone}
            onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
            placeholder="+44..."
          />
        </FieldLabel>
        <FieldLabel label="LinkedIn URL">
          <Input
            value={form.linkedin_url}
            onChange={(v) => setForm((p) => ({ ...p, linkedin_url: v }))}
            placeholder="https://linkedin.com/in/..."
          />
        </FieldLabel>
        <FieldLabel label="Source">
          <Select
            value={form.source}
            onChange={(v) => setForm((p) => ({ ...p, source: v }))}
            options={SOURCES}
            placeholder="Select source..."
          />
        </FieldLabel>
        <FieldLabel label="Stage">
          <Select
            value={form.stage}
            onChange={(v) => setForm((p) => ({ ...p, stage: v }))}
            options={STAGES}
          />
        </FieldLabel>
        <FieldLabel label="Amount Potential (£)">
          <Input
            value={form.amount_potential}
            onChange={(v) => setForm((p) => ({ ...p, amount_potential: v }))}
            placeholder="10000"
            type="number"
          />
        </FieldLabel>
        {showAmountCommitted && (
          <FieldLabel label="Amount Committed (£)">
            <Input
              value={form.amount_committed}
              onChange={(v) => setForm((p) => ({ ...p, amount_committed: v }))}
              placeholder="10000"
              type="number"
            />
          </FieldLabel>
        )}
        <FieldLabel label="Next Action">
          <Input
            value={form.next_action}
            onChange={(v) => setForm((p) => ({ ...p, next_action: v }))}
            placeholder="Send deck, schedule call..."
          />
        </FieldLabel>
        <FieldLabel label="Follow-up Date">
          <Input
            value={form.follow_up_date}
            onChange={(v) => setForm((p) => ({ ...p, follow_up_date: v }))}
            type="date"
          />
        </FieldLabel>
      </div>
      <div style={{ marginTop: 14 }}>
        <FieldLabel label="Notes">
          <Textarea
            value={form.notes}
            onChange={(v) => setForm((p) => ({ ...p, notes: v }))}
            placeholder="Any notes..."
          />
        </FieldLabel>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 20,
          marginTop: 14,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: LIGHT, fontSize: 13, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.deck_sent}
            onChange={(e) => setForm((p) => ({ ...p, deck_sent: e.target.checked }))}
            style={{ accentColor: TEAL }}
          />
          Deck sent
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: LIGHT, fontSize: 13, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.financials_sent}
            onChange={(e) => setForm((p) => ({ ...p, financials_sent: e.target.checked }))}
            style={{ accentColor: TEAL }}
          />
          Financials sent
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: LIGHT, fontSize: 13, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.term_sheet_sent}
            onChange={(e) => setForm((p) => ({ ...p, term_sheet_sent: e.target.checked }))}
            style={{ accentColor: TEAL }}
          />
          Term sheet sent
        </label>
      </div>
    </>
  )

  /* ─── Investor Card (display mode) ─── */
  const renderInvestorCard = (inv: AngelInvestor) => {
    const stageColor = STAGE_COLORS[inv.stage] || SLATE
    const ds = dateStatus(inv.follow_up_date)
    const canAdvance =
      inv.stage !== 'Closed' &&
      inv.stage !== 'Passed' &&
      ACTIVE_STAGES.indexOf(inv.stage as typeof ACTIVE_STAGES[number]) >= 0
    const canPass = inv.stage !== 'Passed' && inv.stage !== 'Closed'

    return (
      <div
        key={inv.id}
        style={{
          background: NAVY_CARD,
          borderRadius: 10,
          borderLeft: `4px solid ${stageColor}`,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Row 1 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: LIGHT }}>{inv.name}</span>
            {inv.company && <span style={{ fontSize: 14, color: SLATE }}>{inv.company}</span>}
          </div>
          {inv.source && <Tag label={inv.source} color={PURPLE} />}
        </div>

        {/* Row 2 — amounts */}
        {(inv.amount_potential || inv.amount_committed) && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14 }}>
            {inv.amount_potential != null && inv.amount_potential > 0 && (
              <span style={{ color: AMBER, fontWeight: 600 }}>{fmtCurrency(inv.amount_potential)}</span>
            )}
            {inv.amount_committed != null && inv.amount_committed > 0 && (
              <span style={{ color: TEAL, fontWeight: 600 }}>{fmtCurrency(inv.amount_committed)} committed</span>
            )}
          </div>
        )}

        {/* Row 3 — next action + follow-up */}
        {(inv.next_action || inv.follow_up_date) && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, alignItems: 'center' }}>
            {inv.next_action && <span style={{ color: LIGHT }}>{inv.next_action}</span>}
            {inv.follow_up_date && (
              <span
                style={{
                  color: ds === 'overdue' ? RED : ds === 'soon' ? AMBER : SLATE,
                  background: ds === 'overdue' ? RED + '22' : 'transparent',
                  padding: ds === 'overdue' ? '2px 8px' : 0,
                  borderRadius: 6,
                  fontWeight: ds === 'overdue' || ds === 'soon' ? 600 : 400,
                }}
              >
                {ds === 'overdue' ? 'Overdue ' : ds === 'soon' ? 'Due soon ' : ''}
                {fmtDate(inv.follow_up_date)}
              </span>
            )}
          </div>
        )}

        {/* Row 4 — document checklist */}
        <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
          <span style={{ color: inv.deck_sent ? TEAL : SLATE }}>
            Deck {inv.deck_sent ? '\u2713' : '\u2717'}
          </span>
          <span style={{ color: inv.financials_sent ? TEAL : SLATE }}>
            Financials {inv.financials_sent ? '\u2713' : '\u2717'}
          </span>
          <span style={{ color: inv.term_sheet_sent ? TEAL : SLATE }}>
            Term sheet {inv.term_sheet_sent ? '\u2713' : '\u2717'}
          </span>
        </div>

        {/* Row 5 — action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Btn variant="ghost" onClick={() => startEdit(inv)}>
            <Edit3 size={14} /> Edit
          </Btn>
          {canAdvance && (
            <Btn variant="teal" onClick={() => handleNextStage(inv)}>
              <ArrowRightCircle size={14} /> Next Stage
            </Btn>
          )}
          {canPass && (
            <Btn variant="danger" onClick={() => handlePass(inv)} style={{ fontSize: 12, padding: '5px 10px' }}>
              <XCircle size={13} /> Pass
            </Btn>
          )}
        </div>

        {/* Notes toggle */}
        {inv.notes && (
          <div>
            <button
              onClick={() => toggleNotes(inv.id)}
              style={{
                background: 'none',
                border: 'none',
                color: TEAL,
                fontSize: 12,
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              {expandedNotes[inv.id] ? 'Hide notes' : 'Show notes'}
            </button>
            {expandedNotes[inv.id] && (
              <p style={{ color: SLATE, fontSize: 13, margin: '6px 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {inv.notes}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  /* ─── Investor Card (edit mode) ─── */
  const renderEditCard = (inv: AngelInvestor) => {
    return (
      <div
        key={inv.id}
        style={{
          background: NAVY_CARD,
          borderRadius: 10,
          borderLeft: `4px solid ${AMBER}`,
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ color: AMBER, fontWeight: 700, fontSize: 14 }}>Editing: {inv.name}</span>
        </div>
        {renderFormFields(editForm, setEditForm, true)}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <Btn
            variant="teal"
            onClick={handleEditSave}
            disabled={editSubmitting || !editForm.name.trim()}
            style={{ background: TEAL + '18' }}
          >
            {editSubmitting ? 'Saving...' : 'Save'}
          </Btn>
          <Btn variant="ghost" onClick={() => setEditingId(null)}>
            Cancel
          </Btn>
          <Btn variant="danger" onClick={() => handleDelete(inv)}>
            <Trash2 size={14} /> Delete
          </Btn>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: NAVY, color: LIGHT, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: NAVY,
          borderBottom: `1px solid ${BORDER}`,
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Link href="/" style={{ color: TEAL, display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: LIGHT }}>Angel Round</h1>
          <p style={{ margin: 0, fontSize: 13, color: SLATE }}>£120,000 target raise</p>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 60px' }}>
        {/* Mutation error banner */}
        {mutationError && (
          <div
            style={{
              background: RED + '22',
              border: `1px solid ${RED}`,
              borderRadius: 8,
              padding: '10px 16px',
              marginBottom: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ color: RED, fontSize: 13 }}>{mutationError}</span>
            <button
              onClick={() => setMutationError(null)}
              style={{ background: 'none', border: 'none', color: RED, cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Loading / Error */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: SLATE }}>Loading investors...</div>
        )}
        {error && !loading && (
          <div
            style={{
              textAlign: 'center',
              padding: 40,
              color: RED,
            }}
          >
            <p>{error}</p>
            <Btn variant="teal" onClick={loadInvestors}>
              Retry
            </Btn>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Section A: Raise Progress ── */}
            <section style={{ marginBottom: 32 }}>
              <SectionTitle>Raise Progress</SectionTitle>
              {/* Progress bar */}
              <div
                style={{
                  width: '100%',
                  height: 24,
                  background: NAVY_CARD,
                  borderRadius: 12,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* Potential layer */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${Math.min(100, pctPotential)}%`,
                    background: AMBER,
                    borderRadius: 12,
                    transition: 'width .4s ease',
                  }}
                />
                {/* Committed layer */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${Math.min(100, pctCommitted)}%`,
                    background: TEAL,
                    borderRadius: 12,
                    transition: 'width .4s ease',
                  }}
                />
                {/* Label */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: pctCommitted > 15 ? NAVY : LIGHT,
                    pointerEvents: 'none',
                  }}
                >
                  {Math.round(pctCommitted)}% committed
                </div>
              </div>

              {/* Stats row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <Card style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Users size={16} color={TEAL} />
                    <span style={{ fontSize: 22, fontWeight: 700, color: LIGHT }}>{pipelineCount}</span>
                  </div>
                  <p style={{ fontSize: 12, color: SLATE, margin: '4px 0 0' }}>investors in pipeline</p>
                </Card>
                <Card style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <CalendarClock size={16} color={AMBER} />
                    <span style={{ fontSize: 22, fontWeight: 700, color: LIGHT }}>{meetingsBooked}</span>
                  </div>
                  <p style={{ fontSize: 12, color: SLATE, margin: '4px 0 0' }}>meetings booked</p>
                </Card>
                <Card style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <CheckCircle2 size={16} color={GREEN} />
                    <span style={{ fontSize: 22, fontWeight: 700, color: LIGHT }}>{committedCount}</span>
                  </div>
                  <p style={{ fontSize: 12, color: SLATE, margin: '4px 0 0' }}>committed</p>
                </Card>
              </div>

              {/* Amounts summary */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 24,
                  marginTop: 14,
                  flexWrap: 'wrap',
                  fontSize: 14,
                }}
              >
                <span style={{ color: TEAL, fontWeight: 600 }}>{fmtCurrency(committed)} committed</span>
                <span style={{ color: AMBER, fontWeight: 600 }}>{fmtCurrency(potential)} potential</span>
                <span style={{ color: SLATE, fontWeight: 600 }}>{fmtCurrency(remaining)} remaining</span>
              </div>
            </section>

            {/* ── Section B: Add Investor ── */}
            <section style={{ marginBottom: 32 }}>
              <Btn
                variant={addFormOpen ? 'ghost' : 'teal'}
                onClick={() => setAddFormOpen(!addFormOpen)}
                style={{ marginBottom: addFormOpen ? 14 : 0 }}
              >
                {addFormOpen ? <X size={14} /> : <Plus size={14} />}
                {addFormOpen ? 'Close' : '+ Add Investor'}
              </Btn>

              {addFormOpen && (
                <Card>
                  <form onSubmit={handleAdd}>
                    {renderFormFields(addForm, setAddForm, false)}
                    <div style={{ marginTop: 16 }}>
                      <Btn
                        variant="teal"
                        type="submit"
                        disabled={addSubmitting || !addForm.name.trim()}
                        style={{ background: TEAL + '18' }}
                      >
                        {addSubmitting ? 'Adding...' : 'Add Investor'}
                      </Btn>
                    </div>
                  </form>
                </Card>
              )}
            </section>

            {/* ── Section C: Stage Pipeline ── */}
            <section>
              <SectionTitle>Investor Pipeline</SectionTitle>

              {investors.length === 0 && (
                <Card style={{ textAlign: 'center', padding: 40 }}>
                  <FileText size={32} color={SLATE} style={{ margin: '0 auto 12px' }} />
                  <p style={{ color: SLATE, fontSize: 15, margin: 0 }}>
                    No investors added yet. Click &lsquo;+ Add Investor&rsquo; to start tracking your angel round.
                  </p>
                </Card>
              )}

              {STAGES.map((stage) => {
                const stageInvestors = grouped[stage]
                if (stageInvestors.length === 0) return null
                const stageColor = STAGE_COLORS[stage] || SLATE
                const expanded = expandedStages[stage] ?? true

                return (
                  <div key={stage} style={{ marginBottom: 18 }}>
                    {/* Stage header */}
                    <button
                      onClick={() => toggleStage(stage)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px 0',
                        width: '100%',
                      }}
                    >
                      {expanded ? (
                        <ChevronDown size={16} color={LIGHT} />
                      ) : (
                        <ChevronRight size={16} color={LIGHT} />
                      )}
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: stageColor,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 15, fontWeight: 700, color: LIGHT }}>{stage}</span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: stageColor,
                          background: stageColor + '22',
                          padding: '2px 10px',
                          borderRadius: 999,
                        }}
                      >
                        {stageInvestors.length}
                      </span>
                    </button>

                    {/* Cards */}
                    {expanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 20 }}>
                        {stageInvestors.map((inv) =>
                          editingId === inv.id ? renderEditCard(inv) : renderInvestorCard(inv)
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
