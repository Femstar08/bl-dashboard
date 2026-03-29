'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { PROSPECT_STAGES, STAGE_COLORS, NEXT_STAGE, type ProspectStage } from '@/lib/tokens'
import {
  Plus, Search, CheckCircle, AlertCircle, Users,
  ChevronDown, ChevronRight, ExternalLink, Clock, X, Edit2, Linkedin
} from 'lucide-react'

// ── DESIGN TOKENS ───────────────────────────────────────────────
const AMBER = '#F59E0B'
const GREEN = '#34D399'
const RED = '#F87171'
const PURPLE = '#7C8CF8'
const ORANGE = '#F97316'

const getMonday = (date: Date): string => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

const today = new Date().toISOString().split('T')[0]

// ── TYPES ───────────────────────────────────────────────────────
interface Prospect {
  id: string
  company_name: string | null
  contact_name: string | null
  contact_email: string | null
  status: string
  notes: string | null
  type: string | null
  next_action: string | null
  follow_up_date: string | null
  snoozed_until: string | null
  linkedin_url: string | null
  source: string | null
  bl_score: number | null
  bl_priority: string | null
  bl_reason: string | null
  trigger_type: string | null
  industry: string | null
  postcode: string | null
  region: string | null
  converted_to_lead_id: string | null
  converted_at: string | null
  created_at: string
  updated_at: string
}

interface WeeklyStats {
  id: string
  week_starting: string
  channel: string
  sent: number
  accepted: number
  replied: number
  calls_booked: number
  created_at: string
}

interface Campaign {
  id: string
  name: string
  description: string | null
  status: string
  category: string | null
  created_at: string
  updated_at: string
}

// ── HELPER COMPONENTS ───────────────────────────────────────────
function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase' as const,
        padding: '2px 8px',
        borderRadius: 99,
        background: color + '22',
        color,
      }}
    >
      {label}
    </span>
  )
}

function Btn({
  onClick,
  children,
  variant = 'ghost',
  disabled,
  small,
}: {
  onClick?: () => void
  children: React.ReactNode
  variant?: 'ghost' | 'teal' | 'danger' | 'amber' | 'purple'
  disabled?: boolean
  small?: boolean
}) {
  const base: React.CSSProperties = {
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    border: '1.5px solid',
    transition: 'opacity 0.15s',
    opacity: disabled ? 0.4 : 1,
    fontSize: small ? 11 : 13,
    fontWeight: 500,
    padding: small ? '4px 10px' : '8px 16px',
    background: 'transparent',
  }
  const variants: Record<string, React.CSSProperties> = {
    ghost: { borderColor: 'var(--border)', color: 'var(--text-primary)' },
    teal: { borderColor: 'var(--accent)', color: 'var(--accent)' },
    danger: { borderColor: RED + '66', color: RED },
    amber: { borderColor: AMBER + '66', color: AMBER },
    purple: { borderColor: PURPLE + '66', color: PURPLE },
  }
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--bg-mid)',
        border: '1px solid var(--border)',
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
    <h2
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color: 'var(--text-muted)',
        marginBottom: 16,
      }}
    >
      {children}
    </h2>
  )
}

function Input(props: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  style?: React.CSSProperties
}) {
  return (
    <input
      type={props.type || 'text'}
      value={props.value}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        color: 'var(--text-primary)',
        padding: '8px 12px',
        fontSize: 13,
        width: '100%',
        outline: 'none',
        fontFamily: 'inherit',
        ...props.style,
      }}
    />
  )
}

function Select(props: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        color: 'var(--text-primary)',
        padding: '8px 12px',
        fontSize: 13,
        width: '100%',
        outline: 'none',
        fontFamily: 'inherit',
      }}
    >
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// ── HELPERS ─────────────────────────────────────────────────────
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

// ── MAIN COMPONENT ──────────────────────────────────────────────
export default function GrowthPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addFormOpen, setAddFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [channelsOpen, setChannelsOpen] = useState(false)
  const [showMoreNewCount, setShowMoreNewCount] = useState(8)
  const [stageFilter, setStageFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Add form state
  const [addContact, setAddContact] = useState('')
  const [addCompany, setAddCompany] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addLinkedin, setAddLinkedin] = useState('')
  const [addType, setAddType] = useState('SME')
  const [addSource, setAddSource] = useState('Manual')
  const [addStage, setAddStage] = useState('Identified')
  const [addFollowUp, setAddFollowUp] = useState('')
  const [addNextAction, setAddNextAction] = useState('')
  const [addNotes, setAddNotes] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pRes, wRes, cRes] = await Promise.all([
        supabase.from('bl_crm_prospects').select('*').order('created_at', { ascending: false }),
        supabase
          .from('bl_weekly_stats')
          .select('*')
          .eq('channel', 'LinkedIn')
          .order('week_starting', { ascending: false })
          .limit(5),
        supabase.from('campaigns').select('*').order('name'),
      ])
      if (pRes.error) throw pRes.error
      if (wRes.error) throw wRes.error
      if (cRes.error) throw cRes.error
      setProspects((pRes.data as Prospect[]) || [])
      setWeeklyStats((wRes.data as WeeklyStats[]) || [])
      setCampaigns((cRes.data as Campaign[]) || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── MUTATIONS ───────────────────────────────────────────────
  const updateProspect = async (id: string, updates: Partial<Prospect>) => {
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
    try {
      const { error } = await supabase
        .from('bl_crm_prospects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    } catch {
      loadData()
    }
  }

  const incrementStat = async (field: 'sent' | 'accepted' | 'replied' | 'calls_booked') => {
    const monday = getMonday(new Date())
    let current = weeklyStats.find((w) => w.week_starting === monday)

    if (!current) {
      try {
        const { data, error } = await supabase
          .from('bl_weekly_stats')
          .insert({
            week_starting: monday,
            channel: 'LinkedIn',
            sent: 0,
            accepted: 0,
            replied: 0,
            calls_booked: 0,
          })
          .select()
          .single()
        if (error) throw error
        if (data) {
          current = data as WeeklyStats
          setWeeklyStats((prev) => [data as WeeklyStats, ...prev])
        }
      } catch {
        return
      }
    }

    if (!current) return
    const newVal = (current[field] || 0) + 1
    setWeeklyStats((prev) =>
      prev.map((w) => (w.id === current!.id ? { ...w, [field]: newVal } : w))
    )
    try {
      const { error } = await supabase
        .from('bl_weekly_stats')
        .update({ [field]: newVal })
        .eq('id', current.id)
      if (error) throw error
    } catch {
      loadData()
    }
  }

  const addProspect = async () => {
    const now = new Date().toISOString()
    const newP: Partial<Prospect> = {
      contact_name: addContact || null,
      company_name: addCompany || null,
      contact_email: addEmail || null,
      linkedin_url: addLinkedin || null,
      type: addType || null,
      source: addSource || null,
      status: addStage,
      follow_up_date: addFollowUp || null,
      next_action: addNextAction || null,
      notes: addNotes || null,
      created_at: now,
      updated_at: now,
    }
    try {
      const { data, error } = await supabase
        .from('bl_crm_prospects')
        .insert(newP)
        .select()
        .single()
      if (error) throw error
      if (data) setProspects((prev) => [data as Prospect, ...prev])
      setAddFormOpen(false)
      setAddContact('')
      setAddCompany('')
      setAddEmail('')
      setAddLinkedin('')
      setAddType('SME')
      setAddSource('Manual')
      setAddStage('Identified')
      setAddFollowUp('')
      setAddNextAction('')
      setAddNotes('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add prospect')
    }
  }

  const startEdit = (p: Prospect) => {
    setEditingId(p.id)
    setEditForm({
      status: p.status || '',
      next_action: p.next_action || '',
      follow_up_date: p.follow_up_date || '',
      contact_name: p.contact_name || '',
      company_name: p.company_name || '',
      contact_email: p.contact_email || '',
      linkedin_url: p.linkedin_url || '',
      notes: p.notes || '',
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    await updateProspect(editingId, {
      status: editForm.status || 'Identified',
      next_action: editForm.next_action || null,
      follow_up_date: editForm.follow_up_date || null,
      contact_name: editForm.contact_name || null,
      company_name: editForm.company_name || null,
      contact_email: editForm.contact_email || null,
      linkedin_url: editForm.linkedin_url || null,
      notes: editForm.notes || null,
    })
    setEditingId(null)
    setEditForm({})
  }

  // ── DERIVED DATA ────────────────────────────────────────────
  const monday = getMonday(new Date())
  const excludedStatuses = ['Signed', 'Dead', 'Closed', 'Passed']

  const overdueProspects = prospects
    .filter(
      (p) =>
        p.follow_up_date &&
        p.follow_up_date <= today &&
        (!p.snoozed_until || p.snoozed_until < today) &&
        !excludedStatuses.includes(p.status)
    )
    .sort((a, b) => (a.follow_up_date! > b.follow_up_date! ? 1 : -1))

  const overdueCount = overdueProspects.length

  const newProspects = prospects
    .filter((p) => p.source === 'CompanyQuery' && p.status === 'Identified')
    .sort((a, b) => (b.bl_score || 0) - (a.bl_score || 0))

  const newProspectsCount = newProspects.length

  const acceptedThisWeek = prospects.filter(
    (p) =>
      (p.status === 'Connected' || p.status === 'Connection Sent') &&
      p.updated_at >= monday
  ).length

  const currentWeekStats = weeklyStats.find((w) => w.week_starting === monday)
  const pastWeeks = weeklyStats.filter((w) => w.week_starting !== monday)

  // Pipeline filtering
  const filteredProspects = prospects.filter((p) => {
    if (stageFilter !== 'All' && p.status !== stageFilter) return false
    if (sourceFilter !== 'All' && p.source !== sourceFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const name = (p.contact_name || '').toLowerCase()
      const company = (p.company_name || '').toLowerCase()
      if (!name.includes(q) && !company.includes(q)) return false
    }
    return true
  })

  // ── RENDER ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid var(--border)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: 'var(--text-muted)' }}>Loading growth data...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'inherit',
      }}
    >
      {error && (
        <div
          style={{
            margin: '16px 24px',
            padding: '12px 16px',
            background: RED + '22',
            borderRadius: 8,
            color: RED,
            fontSize: 13,
          }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 12,
              background: 'none',
              border: 'none',
              color: RED,
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 64px' }}>
        {/* ── ZONE 1: TODAY'S FOCUS ─────────────────────────── */}
        <Card style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 20px',
                background: 'var(--bg-card)',
                borderRadius: 10,
                flex: 1,
                minWidth: 200,
              }}
            >
              <AlertCircle size={18} color={overdueCount > 0 ? RED : 'var(--text-muted)'} />
              <span style={{ fontSize: 22, fontWeight: 700, color: overdueCount > 0 ? RED : 'var(--text-primary)' }}>
                {overdueCount}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>follow-ups overdue</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 20px',
                background: 'var(--bg-card)',
                borderRadius: 10,
                flex: 1,
                minWidth: 200,
              }}
            >
              <Users size={18} color={'var(--accent)'} />
              <span style={{ fontSize: 22, fontWeight: 700 }}>{newProspectsCount}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>new prospects</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 20px',
                background: 'var(--bg-card)',
                borderRadius: 10,
                flex: 1,
                minWidth: 200,
              }}
            >
              <CheckCircle size={18} color={GREEN} />
              <span style={{ fontSize: 22, fontWeight: 700 }}>{acceptedThisWeek}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>accepted this week</span>
            </div>
          </div>
        </Card>

        {/* ── ZONE 2: THREE-COLUMN ACTION AREA ─────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
            marginBottom: 40,
          }}
        >
          {/* ── Column A: Follow Up Today ── */}
          <div>
            <SectionTitle>Follow Up Today</SectionTitle>
            {overdueProspects.length === 0 ? (
              <Card
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 40,
                  gap: 12,
                }}
              >
                <CheckCircle size={28} color={'var(--accent)'} />
                <span style={{ color: 'var(--accent)', fontSize: 14 }}>
                  You&apos;re all caught up today
                </span>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {overdueProspects.map((p) => {
                  const days = Math.floor(
                    (new Date(today).getTime() - new Date(p.follow_up_date!).getTime()) / 86400000
                  )

                  if (editingId === p.id) {
                    return (
                      <Card key={p.id}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <Select
                            value={editForm.status || ''}
                            onChange={(v) => setEditForm((f) => ({ ...f, status: v }))}
                            options={PROSPECT_STAGES.map((s) => ({
                              value: s,
                              label: s,
                            }))}
                          />
                          <Input
                            value={editForm.next_action || ''}
                            onChange={(v) => setEditForm((f) => ({ ...f, next_action: v }))}
                            placeholder="Next action"
                          />
                          <Input
                            value={editForm.follow_up_date || ''}
                            onChange={(v) => setEditForm((f) => ({ ...f, follow_up_date: v }))}
                            type="date"
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Btn variant="teal" small onClick={saveEdit}>
                              Save
                            </Btn>
                            <Btn
                              small
                              onClick={() => {
                                setEditingId(null)
                                setEditForm({})
                              }}
                            >
                              Cancel
                            </Btn>
                          </div>
                        </div>
                      </Card>
                    )
                  }

                  return (
                    <Card key={p.id}>
                      <div
                        style={{ cursor: 'pointer', marginBottom: 8 }}
                        onClick={() => startEdit(p)}
                      >
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {p.contact_name || p.company_name || 'Unknown'}
                        </div>
                        {p.contact_name && p.company_name && p.contact_name !== p.company_name && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.company_name}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Tag label={p.status} color={STAGE_COLORS[p.status as ProspectStage] || 'var(--text-muted)'} />
                        <span
                          style={{
                            fontSize: 12,
                            color: days === 0 ? AMBER : RED,
                            fontWeight: 500,
                          }}
                        >
                          {days === 0 ? 'Due today' : `${days} days overdue`}
                        </span>
                      </div>
                      {p.next_action && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 8 }}>
                          {p.next_action}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Btn
                          variant="teal"
                          small
                          onClick={() =>
                            updateProspect(p.id, {
                              follow_up_date: null,
                              next_action: null,
                              updated_at: new Date().toISOString(),
                            })
                          }
                        >
                          <CheckCircle size={12} /> Done
                        </Btn>
                        <Btn
                          variant="amber"
                          small
                          onClick={() => {
                            const snoozeDate = new Date()
                            snoozeDate.setDate(snoozeDate.getDate() + 3)
                            updateProspect(p.id, {
                              snoozed_until: snoozeDate.toISOString().split('T')[0],
                            })
                          }}
                        >
                          <Clock size={12} /> Snooze 3d
                        </Btn>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Column B: New to Contact ── */}
          <div>
            <SectionTitle>New to Contact</SectionTitle>
            {newProspects.length === 0 ? (
              <Card style={{ padding: 40, textAlign: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No new prospects waiting</span>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {newProspects.slice(0, showMoreNewCount).map((p) => {
                  const score = p.bl_score
                  const scoreBg = score !== null && score >= 8 ? GREEN : score !== null && score >= 6 ? AMBER : 'var(--text-muted)'

                  return (
                    <Card key={p.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>
                          {p.company_name || 'Unknown'}
                        </span>
                        {score !== null && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 99,
                              background: scoreBg + '22',
                              color: scoreBg,
                            }}
                          >
                            {score}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        {p.trigger_type && <Tag label={p.trigger_type} color={'var(--accent)'} />}
                        {p.industry && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.industry}</span>
                        )}
                      </div>
                      {p.bl_reason && (
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            fontStyle: 'italic',
                            marginBottom: 4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.bl_reason}
                        </div>
                      )}
                      {p.postcode && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                          {p.postcode}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Btn
                          variant="teal"
                          small
                          onClick={() => {
                            const name = window.prompt(
                              'Contact name for ' + (p.company_name || 'this company')
                            )
                            if (name === null) return
                            const threeDays = new Date()
                            threeDays.setDate(threeDays.getDate() + 3)
                            updateProspect(p.id, {
                              status: 'Connection Sent',
                              contact_name: name || null,
                              follow_up_date: threeDays.toISOString().split('T')[0],
                              updated_at: new Date().toISOString(),
                            })
                          }}
                        >
                          Send request
                        </Btn>
                        <Btn
                          variant="purple"
                          small
                          onClick={() =>
                            window.open(
                              'https://www.linkedin.com/search/results/companies/?keywords=' +
                                encodeURIComponent(p.company_name || ''),
                              '_blank'
                            )
                          }
                        >
                          <Linkedin size={12} /> LinkedIn
                        </Btn>
                        <Btn
                          variant="danger"
                          small
                          onClick={() =>
                            updateProspect(p.id, {
                              status: 'Dead',
                              updated_at: new Date().toISOString(),
                            })
                          }
                        >
                          Dismiss
                        </Btn>
                      </div>
                    </Card>
                  )
                })}
                {newProspects.length > showMoreNewCount && (
                  <Btn onClick={() => setShowMoreNewCount((c) => c + 8)}>Load more</Btn>
                )}
              </div>
            )}
          </div>

          {/* ── Column C: This Week ── */}
          <div>
            <SectionTitle>This Week</SectionTitle>
            <Card style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {(
                  [
                    { field: 'sent' as const, label: 'Sent' },
                    { field: 'accepted' as const, label: 'Accepted' },
                    { field: 'replied' as const, label: 'Replied' },
                    { field: 'calls_booked' as const, label: 'Calls' },
                  ] as const
                ).map(({ field, label }) => (
                  <div
                    key={field}
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: 10,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700 }}>
                        {currentWeekStats ? currentWeekStats[field] : 0}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' as const }}>
                        {label}
                      </div>
                    </div>
                    <Btn variant="teal" small onClick={() => incrementStat(field)}>
                      <Plus size={12} /> 1
                    </Btn>
                  </div>
                ))}
              </div>

              {/* Conversion rates */}
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>
                  Accept rate:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {currentWeekStats && currentWeekStats.sent > 0
                      ? ((currentWeekStats.accepted / currentWeekStats.sent) * 100).toFixed(0) + '%'
                      : '-'}
                  </strong>
                </span>
                <span>
                  Reply rate:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {currentWeekStats && currentWeekStats.accepted > 0
                      ? ((currentWeekStats.replied / currentWeekStats.accepted) * 100).toFixed(0) +
                        '%'
                      : '-'}
                  </strong>
                </span>
              </div>
            </Card>

            {/* Last 4 weeks table */}
            {pastWeeks.length > 0 && (
              <Card>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '4px 8px', fontWeight: 500 }}>Week</th>
                      <th style={{ padding: '4px 8px', fontWeight: 500 }}>Sent</th>
                      <th style={{ padding: '4px 8px', fontWeight: 500 }}>Acc</th>
                      <th style={{ padding: '4px 8px', fontWeight: 500 }}>Rep</th>
                      <th style={{ padding: '4px 8px', fontWeight: 500 }}>Calls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastWeeks.map((w) => (
                      <tr key={w.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 8px' }}>{formatDate(w.week_starting)}</td>
                        <td style={{ padding: '6px 8px' }}>{w.sent}</td>
                        <td style={{ padding: '6px 8px' }}>{w.accepted}</td>
                        <td style={{ padding: '6px 8px' }}>{w.replied}</td>
                        <td style={{ padding: '6px 8px' }}>{w.calls_booked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        </div>

        {/* ── ZONE 3: PIPELINE ──────────────────────────────── */}
        <SectionTitle>Pipeline</SectionTitle>

        {/* Filter bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          {/* Stage filters */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['All', ...PROSPECT_STAGES].map((s) => (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase' as const,
                  padding: '4px 10px',
                  borderRadius: 99,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background:
                    stageFilter === s
                      ? (STAGE_COLORS[s as ProspectStage] || 'var(--accent)')
                      : (STAGE_COLORS[s as ProspectStage] || 'var(--accent)') + '22',
                  color: stageFilter === s ? 'var(--bg-primary)' : (STAGE_COLORS[s as ProspectStage] || 'var(--accent)'),
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Source filters */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['All', 'CompanyQuery', 'LinkedIn', 'Manual'].map((s) => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase' as const,
                  padding: '4px 10px',
                  borderRadius: 99,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: sourceFilter === s ? PURPLE : PURPLE + '22',
                  color: sourceFilter === s ? 'var(--bg-primary)' : PURPLE,
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 10px',
              flex: 1,
              minWidth: 180,
              maxWidth: 300,
            }}
          >
            <Search size={14} color={'var(--text-muted)'} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prospects..."
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
                width: '100%',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Add button */}
          <Btn variant="teal" onClick={() => setAddFormOpen(!addFormOpen)}>
            <Plus size={14} /> Add Prospect
          </Btn>
        </div>

        {/* Add form */}
        {addFormOpen && (
          <Card style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <Input
                value={addContact}
                onChange={setAddContact}
                placeholder="Contact name"
              />
              <Input
                value={addCompany}
                onChange={setAddCompany}
                placeholder="Company name"
              />
              <Input
                value={addEmail}
                onChange={setAddEmail}
                placeholder="Email"
              />
              <Input
                value={addLinkedin}
                onChange={setAddLinkedin}
                placeholder="LinkedIn URL"
              />
              <Select
                value={addType}
                onChange={setAddType}
                options={[
                  { value: 'Accountant', label: 'Accountant' },
                  { value: 'SME', label: 'SME' },
                ]}
              />
              <Select
                value={addSource}
                onChange={setAddSource}
                options={[
                  { value: 'Manual', label: 'Manual' },
                  { value: 'LinkedIn', label: 'LinkedIn' },
                  { value: 'CompanyQuery', label: 'CompanyQuery' },
                  { value: 'Referral', label: 'Referral' },
                  { value: 'Event', label: 'Event' },
                ]}
              />
              <Select
                value={addStage}
                onChange={setAddStage}
                options={PROSPECT_STAGES.map((s) => ({
                  value: s,
                  label: s,
                }))}
              />
              <Input
                value={addFollowUp}
                onChange={setAddFollowUp}
                placeholder="Follow up date"
                type="date"
              />
              <Input
                value={addNextAction}
                onChange={setAddNextAction}
                placeholder="Next action"
              />
              <Input
                value={addNotes}
                onChange={setAddNotes}
                placeholder="Notes"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="teal" onClick={addProspect}>
                Save
              </Btn>
              <Btn onClick={() => setAddFormOpen(false)}>Cancel</Btn>
            </div>
          </Card>
        )}

        {/* Prospect list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredProspects.length === 0 && (
            <Card style={{ textAlign: 'center', padding: 40 }}>
              <span style={{ color: 'var(--text-muted)' }}>No prospects match your filters</span>
            </Card>
          )}
          {filteredProspects.map((p) => {
            const stageColor = STAGE_COLORS[p.status as ProspectStage] || 'var(--text-muted)'
            const isOverdue = p.follow_up_date && p.follow_up_date < today
            const isUpcoming =
              p.follow_up_date &&
              !isOverdue &&
              new Date(p.follow_up_date).getTime() - new Date(today).getTime() <= 3 * 86400000
            const nextStage = NEXT_STAGE[p.status as ProspectStage]
            const canAdvance = !!nextStage

            if (editingId === p.id) {
              return (
                <Card key={p.id} style={{ borderLeft: `3px solid ${stageColor}` }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <Input
                      value={editForm.contact_name || ''}
                      onChange={(v) => setEditForm((f) => ({ ...f, contact_name: v }))}
                      placeholder="Contact name"
                    />
                    <Input
                      value={editForm.company_name || ''}
                      onChange={(v) => setEditForm((f) => ({ ...f, company_name: v }))}
                      placeholder="Company name"
                    />
                    <Input
                      value={editForm.contact_email || ''}
                      onChange={(v) => setEditForm((f) => ({ ...f, contact_email: v }))}
                      placeholder="Email"
                    />
                    <Input
                      value={editForm.linkedin_url || ''}
                      onChange={(v) => setEditForm((f) => ({ ...f, linkedin_url: v }))}
                      placeholder="LinkedIn URL"
                    />
                    <Select
                      value={editForm.status || ''}
                      onChange={(v) => setEditForm((f) => ({ ...f, status: v }))}
                      options={PROSPECT_STAGES.map((s) => ({
                        value: s,
                        label: s,
                      }))}
                    />
                    <Input
                      value={editForm.follow_up_date || ''}
                      onChange={(v) => setEditForm((f) => ({ ...f, follow_up_date: v }))}
                      type="date"
                    />
                    <Input
                      value={editForm.next_action || ''}
                      onChange={(v) => setEditForm((f) => ({ ...f, next_action: v }))}
                      placeholder="Next action"
                    />
                    <Input
                      value={editForm.notes || ''}
                      onChange={(v) => setEditForm((f) => ({ ...f, notes: v }))}
                      placeholder="Notes"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn variant="teal" small onClick={saveEdit}>
                      Save
                    </Btn>
                    <Btn
                      small
                      onClick={() => {
                        setEditingId(null)
                        setEditForm({})
                      }}
                    >
                      Cancel
                    </Btn>
                  </div>
                </Card>
              )
            }

            return (
              <Card key={p.id} style={{ borderLeft: `3px solid ${stageColor}` }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                      {p.contact_name || p.company_name || 'Unknown'}
                    </div>
                    {p.contact_name &&
                      p.company_name &&
                      p.contact_name !== p.company_name && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                          {p.company_name}
                        </div>
                      )}
                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        marginBottom: 6,
                      }}
                    >
                      <Tag label={p.status} color={stageColor} />
                      {p.source && <Tag label={p.source} color={PURPLE} />}
                      {p.bl_score !== null && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 99,
                            background:
                              (p.bl_score >= 8 ? GREEN : p.bl_score >= 6 ? AMBER : 'var(--text-muted)') + '22',
                            color: p.bl_score >= 8 ? GREEN : p.bl_score >= 6 ? AMBER : 'var(--text-muted)',
                          }}
                        >
                          {p.bl_score}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        fontSize: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      {p.follow_up_date && (
                        <span
                          style={{
                            color: isOverdue ? RED : isUpcoming ? AMBER : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Clock size={11} />
                          {formatDate(p.follow_up_date)}
                        </span>
                      )}
                      {p.next_action && (
                        <span style={{ color: 'var(--text-muted)' }}>{p.next_action}</span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <select
                      value={p.status}
                      onChange={(e) => updateProspect(p.id, { status: e.target.value })}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        color: stageColor,
                        padding: '4px 8px',
                        fontSize: 11,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      {PROSPECT_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

                    {canAdvance && (
                      <Btn
                        variant="teal"
                        small
                        onClick={() =>
                          updateProspect(p.id, {
                            status: nextStage,
                          })
                        }
                      >
                        Next stage <ChevronRight size={12} />
                      </Btn>
                    )}

                    <Btn
                      variant="purple"
                      small
                      onClick={() =>
                        window.open(
                          p.linkedin_url ||
                            'https://www.linkedin.com/search/results/people/?keywords=' +
                              encodeURIComponent(
                                p.contact_name || p.company_name || ''
                              ),
                          '_blank'
                        )
                      }
                    >
                      <Linkedin size={12} />
                    </Btn>

                    <Btn small onClick={() => startEdit(p)}>
                      <Edit2 size={12} />
                    </Btn>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* ── ZONE 4: ACQUISITION CHANNELS ─────────────────── */}
        <div style={{ marginTop: 40 }}>
          <div
            onClick={() => setChannelsOpen(!channelsOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              marginBottom: channelsOpen ? 16 : 0,
            }}
          >
            <SectionTitle>Acquisition Channels</SectionTitle>
            <ChevronDown
              size={16}
              color={'var(--text-muted)'}
              style={{
                transform: channelsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                marginBottom: 16,
              }}
            />
          </div>

          {channelsOpen && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 12,
              }}
            >
              {campaigns.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: 32 }}>
                  <span style={{ color: 'var(--text-muted)' }}>No campaigns yet</span>
                </Card>
              ) : (
                campaigns.map((c) => {
                  const statusColor =
                    c.status === 'active' ? GREEN : c.status === 'paused' ? AMBER : 'var(--text-muted)'
                  return (
                    <Card key={c.id}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                        {c.name}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        {c.category && <Tag label={c.category} color={PURPLE} />}
                        <Tag label={c.status} color={statusColor} />
                      </div>
                      {c.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.description}</div>
                      )}
                    </Card>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
