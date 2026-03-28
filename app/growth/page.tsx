'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, ChevronUp, Users, Megaphone, FileText, Target, CheckSquare, Square, Linkedin, BarChart3 } from 'lucide-react'
import Link from 'next/link'

// ── DESIGN TOKENS ───────────────────────────────────────────────
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

// ── TYPES ───────────────────────────────────────────────────────
interface Campaign {
  id: string
  name: string
  description: string | null
  status: string
  created_at: string
  updated_at: string
  brand_id: string | null
  category: string | null
}

interface Prospect {
  id: string
  company_name: string | null
  contact_name: string | null
  contact_email: string | null
  status: string | null
  notes: string | null
  type: string | null
  next_action: string | null
  linkedin_url: string | null
  converted_to_lead_id: string | null
  converted_at: string | null
  source: string | null
}

interface WeeklyStat {
  id: string
  week_starting: string
  channel: string
  sent: number
  accepted: number
  replied: number
  calls_booked: number
  created_at: string
}

interface LeadMagnet {
  id: string
  name: string
  file_url: string | null
  created_at: string
  downloads: number
  conversions_to_call: number
  conversions_to_client: number
  magnet_type: string | null
}

interface RoadmapItem {
  id: string
  title: string
  description: string | null
  status: string | null
  category: string | null
  week: number | null
  track: string | null
  sort_order: number | null
  done: boolean
  created_at: string
  updated_at: string
}

// ── STATUS / CATEGORY MAPS ──────────────────────────────────────
const CAMPAIGN_STATUS_COLOR: Record<string, string> = {
  active: GREEN,
  paused: AMBER,
  completed: TEAL,
  archived: SLATE,
}

const CATEGORY_OPTIONS = ['Outbound', 'Inbound', 'Lead Magnet', 'Direct', 'Referral', 'Events']

const PROSPECT_STATUSES = ['Sent', 'Accepted', 'Replied', 'Call Booked', 'Proposal', 'Signed', 'Dead']

const PROSPECT_STATUS_COLOR: Record<string, string> = {
  Sent: SLATE,
  Accepted: AMBER,
  Replied: PURPLE,
  'Call Booked': TEAL,
  Proposal: GREEN,
  Signed: GREEN,
  Dead: RED,
}

const TRACK_COLOR: Record<string, string> = {
  Marketing: PURPLE,
  Platform: TEAL,
  Consulting: AMBER,
}

// ── REUSABLE COMPONENTS ─────────────────────────────────────────
function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
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
  variant?: 'ghost' | 'teal' | 'danger' | 'amber'
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
    ghost: { borderColor: BORDER, color: LIGHT },
    teal: { borderColor: TEAL, color: TEAL },
    danger: { borderColor: RED + '66', color: RED },
    amber: { borderColor: AMBER + '66', color: AMBER },
  }
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  )
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      style={{
        background: NAVY_MID,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: 20,
        borderTop: accent ? `3px solid ${accent}` : `1px solid ${BORDER}`,
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
        textTransform: 'uppercase',
        color: SLATE,
        marginBottom: 16,
      }}
    >
      {children}
    </h2>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: NAVY_CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        color: LIGHT,
        padding: '8px 12px',
        fontSize: 13,
        width: '100%',
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
      }}
    />
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: NAVY_CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        color: LIGHT,
        padding: '8px 12px',
        fontSize: 13,
        width: '100%',
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function Spinner() {
  return <div style={{ color: SLATE, fontSize: 13 }}>Loading...</div>
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        background: RED + '15',
        border: `1px solid ${RED}44`,
        borderRadius: 8,
        padding: '10px 14px',
        color: RED,
        fontSize: 13,
      }}
    >
      {message}
    </div>
  )
}

// ── HELPERS ─────────────────────────────────────────────────────
function getMonday(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date.toISOString().split('T')[0]
}

// ── SECTION A: ACQUISITION CHANNELS ─────────────────────────────
function AcquisitionChannels() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false })
      if (err) throw err
      setCampaigns(data ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Spinner />
  if (error) return <ErrorBox message={error} />

  if (campaigns.length === 0) {
    return (
      <Card>
        <div style={{ color: SLATE, fontSize: 13, textAlign: 'center', padding: 20 }}>
          No campaigns yet. Add your first campaign in Supabase.
        </div>
      </Card>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
      {campaigns.map((c) => {
        const statusColor = CAMPAIGN_STATUS_COLOR[c.status?.toLowerCase()] ?? SLATE
        const catColor = CATEGORY_OPTIONS.includes(c.category ?? '') ? TEAL : SLATE
        return (
          <Card key={c.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: LIGHT, flex: 1 }}>{c.name}</span>
              <Tag label={c.status ?? 'unknown'} color={statusColor} />
            </div>
            {c.category && (
              <div style={{ marginBottom: 8 }}>
                <Tag label={c.category} color={catColor} />
              </div>
            )}
            {c.description && (
              <div style={{ fontSize: 12, color: SLATE, lineHeight: 1.5 }}>{c.description}</div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ── SECTION B LEFT: LINKEDIN CONTACT LIST ───────────────────────
function LinkedInContactList() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    contact_name: '',
    company_name: '',
    type: 'Accountant',
    status: 'Sent',
    linkedin_url: '',
    next_action: '',
  })
  const [editingStatus, setEditingStatus] = useState<string | null>(null)
  const [editingAction, setEditingAction] = useState<string | null>(null)
  const [actionDraft, setActionDraft] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('bl_crm_prospects')
        .select('*')
        .or('source.is.null,source.neq.CompanyQuery')
        .order('created_at', { ascending: false })
      if (err) throw err
      setProspects(data ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load prospects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addProspect = async () => {
    if (!form.contact_name.trim() || !form.company_name.trim()) return
    setSaving(true)
    try {
      const { error: err } = await supabase.from('bl_crm_prospects').insert({
        contact_name: form.contact_name.trim(),
        company_name: form.company_name.trim(),
        type: form.type,
        status: form.status,
        linkedin_url: form.linkedin_url.trim() || null,
        next_action: form.next_action.trim() || null,
      })
      if (err) throw err
      setForm({ contact_name: '', company_name: '', type: 'Accountant', status: 'Sent', linkedin_url: '', next_action: '' })
      setShowForm(false)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add prospect')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error: err } = await supabase.from('bl_crm_prospects').update({ status: newStatus }).eq('id', id)
      if (err) throw err
      setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)))
      setEditingStatus(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update status')
    }
  }

  const updateNextAction = async (id: string, action: string) => {
    try {
      const { error: err } = await supabase.from('bl_crm_prospects').update({ next_action: action }).eq('id', id)
      if (err) throw err
      setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, next_action: action } : p)))
      setEditingAction(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update next action')
    }
  }

  const convertToLead = async (prospect: Prospect) => {
    try {
      const { data: leadData, error: leadErr } = await supabase
        .from('leads')
        .insert({
          company_name: prospect.company_name,
          status: 'Discovery',
          source: 'LinkedIn Outreach',
          notes: prospect.notes,
        })
        .select('id')
        .single()
      if (leadErr) throw leadErr

      const { error: updateErr } = await supabase
        .from('bl_crm_prospects')
        .update({
          converted_to_lead_id: leadData.id,
          converted_at: new Date().toISOString(),
        })
        .eq('id', prospect.id)
      if (updateErr) throw updateErr

      setProspects((prev) =>
        prev.map((p) =>
          p.id === prospect.id ? { ...p, converted_to_lead_id: leadData.id, converted_at: new Date().toISOString() } : p
        )
      )
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to convert to lead')
    }
  }

  if (loading) return <Spinner />
  if (error) return <ErrorBox message={error} />

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: LIGHT }}>
          <Linkedin size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Contacts ({prospects.length})
        </div>
        <Btn small variant="teal" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> Add
        </Btn>
      </div>

      {showForm && (
        <Card accent={TEAL}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <Input value={form.contact_name} onChange={(v) => setForm({ ...form, contact_name: v })} placeholder="Contact name" />
            <Input value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} placeholder="Company name" />
            <Select
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v })}
              options={[
                { value: 'Accountant', label: 'Accountant' },
                { value: 'SME', label: 'SME' },
              ]}
            />
            <Select
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v })}
              options={PROSPECT_STATUSES.map((s) => ({ value: s, label: s }))}
            />
            <Input value={form.linkedin_url} onChange={(v) => setForm({ ...form, linkedin_url: v })} placeholder="LinkedIn URL" />
            <Input value={form.next_action} onChange={(v) => setForm({ ...form, next_action: v })} placeholder="Next action" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="teal" onClick={addProspect} disabled={saving || !form.contact_name.trim() || !form.company_name.trim()}>
              {saving ? 'Saving...' : 'Save Prospect'}
            </Btn>
            <Btn onClick={() => setShowForm(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: showForm ? 12 : 0, maxHeight: 500, overflowY: 'auto' }}>
        {prospects.length === 0 && (
          <div style={{ color: SLATE, fontSize: 13, textAlign: 'center', padding: 20 }}>No prospects yet.</div>
        )}
        {prospects.map((p) => {
          const statusColor = PROSPECT_STATUS_COLOR[p.status ?? ''] ?? SLATE
          const typeColor = p.type === 'Accountant' ? TEAL : AMBER
          return (
            <div
              key={p.id}
              style={{
                background: NAVY_CARD,
                borderRadius: 8,
                padding: '10px 14px',
                border: `1px solid ${BORDER}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: LIGHT, flex: 1 }}>{p.contact_name ?? 'Unknown'}</span>
                {p.type && <Tag label={p.type} color={typeColor} />}
                {editingStatus === p.id ? (
                  <select
                    value={p.status ?? 'Sent'}
                    onChange={(e) => updateStatus(p.id, e.target.value)}
                    onBlur={() => setEditingStatus(null)}
                    autoFocus
                    style={{
                      background: NAVY,
                      border: `1px solid ${TEAL}`,
                      borderRadius: 6,
                      color: LIGHT,
                      padding: '2px 6px',
                      fontSize: 11,
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  >
                    {PROSPECT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span onClick={() => setEditingStatus(p.id)} style={{ cursor: 'pointer' }}>
                    <Tag label={p.status ?? 'unknown'} color={statusColor} />
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: SLATE, marginBottom: 4 }}>{p.company_name ?? ''}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: SLATE }}>Next:</span>
                {editingAction === p.id ? (
                  <input
                    value={actionDraft}
                    onChange={(e) => setActionDraft(e.target.value)}
                    onBlur={() => {
                      updateNextAction(p.id, actionDraft)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') updateNextAction(p.id, actionDraft)
                    }}
                    autoFocus
                    style={{
                      background: NAVY,
                      border: `1px solid ${TEAL}`,
                      borderRadius: 6,
                      color: LIGHT,
                      padding: '2px 8px',
                      fontSize: 11,
                      fontFamily: 'inherit',
                      outline: 'none',
                      flex: 1,
                    }}
                  />
                ) : (
                  <span
                    onClick={() => {
                      setEditingAction(p.id)
                      setActionDraft(p.next_action ?? '')
                    }}
                    style={{ fontSize: 11, color: LIGHT, cursor: 'pointer', flex: 1 }}
                  >
                    {p.next_action || '(click to set)'}
                  </span>
                )}
              </div>
              {p.status === 'Signed' && !p.converted_to_lead_id && (
                <div style={{ marginTop: 8 }}>
                  <Btn small variant="teal" onClick={() => convertToLead(p)}>
                    Convert to Lead
                  </Btn>
                </div>
              )}
              {p.converted_to_lead_id && (
                <div style={{ marginTop: 6, fontSize: 11, color: GREEN }}>Converted to lead</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── SECTION B RIGHT: WEEKLY TOTALS ──────────────────────────────
function WeeklyTotals() {
  const [currentWeek, setCurrentWeek] = useState<WeeklyStat | null>(null)
  const [pastWeeks, setPastWeeks] = useState<WeeklyStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mondayStr = getMonday(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Try to get current week
      const { data: existing, error: fetchErr } = await supabase
        .from('bl_weekly_stats')
        .select('*')
        .eq('week_starting', mondayStr)
        .eq('channel', 'LinkedIn')
        .maybeSingle()
      if (fetchErr) throw fetchErr

      if (existing) {
        setCurrentWeek(existing)
      } else {
        // Create row for current week
        const { data: created, error: createErr } = await supabase
          .from('bl_weekly_stats')
          .insert({ week_starting: mondayStr, channel: 'LinkedIn', sent: 0, accepted: 0, replied: 0, calls_booked: 0 })
          .select()
          .single()
        if (createErr) throw createErr
        setCurrentWeek(created)
      }

      // Load last 4 weeks (excluding current)
      const { data: past, error: pastErr } = await supabase
        .from('bl_weekly_stats')
        .select('*')
        .eq('channel', 'LinkedIn')
        .neq('week_starting', mondayStr)
        .order('week_starting', { ascending: false })
        .limit(4)
      if (pastErr) throw pastErr
      setPastWeeks(past ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load weekly stats')
    } finally {
      setLoading(false)
    }
  }, [mondayStr])

  useEffect(() => {
    load()
  }, [load])

  const increment = async (field: 'sent' | 'accepted' | 'replied' | 'calls_booked') => {
    if (!currentWeek) return
    const newVal = (currentWeek[field] ?? 0) + 1
    try {
      const { error: err } = await supabase
        .from('bl_weekly_stats')
        .update({ [field]: newVal })
        .eq('id', currentWeek.id)
      if (err) throw err
      setCurrentWeek({ ...currentWeek, [field]: newVal })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to increment')
    }
  }

  if (loading) return <Spinner />
  if (error) return <ErrorBox message={error} />

  const metrics: { label: string; field: 'sent' | 'accepted' | 'replied' | 'calls_booked' }[] = [
    { label: 'Sent', field: 'sent' },
    { label: 'Accepted', field: 'accepted' },
    { label: 'Replied', field: 'replied' },
    { label: 'Calls Booked', field: 'calls_booked' },
  ]

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: LIGHT, marginBottom: 12 }}>
        <BarChart3 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
        This Week ({mondayStr})
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {metrics.map((m) => (
          <div
            key={m.field}
            style={{
              background: NAVY_CARD,
              borderRadius: 8,
              padding: '12px 14px',
              border: `1px solid ${BORDER}`,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, color: TEAL }}>{currentWeek?.[m.field] ?? 0}</div>
            <div style={{ fontSize: 10, color: SLATE, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
              {m.label}
            </div>
            <button
              onClick={() => increment(m.field)}
              style={{
                marginTop: 6,
                cursor: 'pointer',
                background: TEAL + '15',
                border: `1px solid ${TEAL}44`,
                borderRadius: 6,
                color: TEAL,
                padding: '3px 12px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'inherit',
              }}
            >
              <ChevronUp size={12} style={{ verticalAlign: 'middle' }} /> +1
            </button>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: SLATE, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Previous Weeks
      </div>
      {pastWeeks.length === 0 ? (
        <div style={{ color: SLATE, fontSize: 12 }}>No previous data yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: SLATE, fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>
                Week
              </th>
              <th style={{ textAlign: 'center', padding: '6px 8px', color: SLATE, fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>
                Sent
              </th>
              <th style={{ textAlign: 'center', padding: '6px 8px', color: SLATE, fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>
                Acc
              </th>
              <th style={{ textAlign: 'center', padding: '6px 8px', color: SLATE, fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>
                Rep
              </th>
              <th style={{ textAlign: 'center', padding: '6px 8px', color: SLATE, fontWeight: 600, borderBottom: `1px solid ${BORDER}` }}>
                Calls
              </th>
            </tr>
          </thead>
          <tbody>
            {pastWeeks.map((w) => (
              <tr key={w.id}>
                <td style={{ padding: '6px 8px', color: LIGHT, borderBottom: `1px solid ${BORDER}` }}>{w.week_starting}</td>
                <td style={{ padding: '6px 8px', color: LIGHT, textAlign: 'center', borderBottom: `1px solid ${BORDER}` }}>{w.sent}</td>
                <td style={{ padding: '6px 8px', color: LIGHT, textAlign: 'center', borderBottom: `1px solid ${BORDER}` }}>{w.accepted}</td>
                <td style={{ padding: '6px 8px', color: LIGHT, textAlign: 'center', borderBottom: `1px solid ${BORDER}` }}>{w.replied}</td>
                <td style={{ padding: '6px 8px', color: LIGHT, textAlign: 'center', borderBottom: `1px solid ${BORDER}` }}>{w.calls_booked}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── SECTION C: LEAD MAGNETS ─────────────────────────────────────
function LeadMagnetsSection() {
  const [magnets, setMagnets] = useState<LeadMagnet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase.from('lead_magnets').select('*').order('created_at', { ascending: false })
      if (err) throw err
      setMagnets(data ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load lead magnets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const incrementField = async (id: string, field: 'downloads' | 'conversions_to_call' | 'conversions_to_client') => {
    const magnet = magnets.find((m) => m.id === id)
    if (!magnet) return
    const newVal = (magnet[field] ?? 0) + 1
    try {
      const { error: err } = await supabase.from('lead_magnets').update({ [field]: newVal }).eq('id', id)
      if (err) throw err
      setMagnets((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: newVal } : m)))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to increment')
    }
  }

  if (loading) return <Spinner />
  if (error) return <ErrorBox message={error} />

  if (magnets.length === 0) {
    return (
      <Card>
        <div style={{ color: SLATE, fontSize: 13, textAlign: 'center', padding: 20 }}>
          <FileText size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
          <br />
          No lead magnets yet. Add them via Supabase to start tracking downloads and conversions.
        </div>
      </Card>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
      {magnets.map((m) => {
        const convRate = m.downloads > 0 ? ((m.conversions_to_call / m.downloads) * 100).toFixed(1) : '0.0'
        return (
          <Card key={m.id} accent={PURPLE}>
            <div style={{ fontSize: 14, fontWeight: 600, color: LIGHT, marginBottom: 4 }}>{m.name}</div>
            {m.magnet_type && (
              <div style={{ marginBottom: 8 }}>
                <Tag label={m.magnet_type} color={PURPLE} />
              </div>
            )}
            <div style={{ fontSize: 11, color: TEAL, fontWeight: 600, marginBottom: 10 }}>
              Conversion to call: {convRate}%
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                { label: 'Downloads', field: 'downloads' as const, value: m.downloads },
                { label: 'To Call', field: 'conversions_to_call' as const, value: m.conversions_to_call },
                { label: 'To Client', field: 'conversions_to_client' as const, value: m.conversions_to_client },
              ].map((metric) => (
                <div
                  key={metric.field}
                  style={{
                    background: NAVY_CARD,
                    borderRadius: 6,
                    padding: 8,
                    textAlign: 'center',
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, color: LIGHT }}>{metric.value ?? 0}</div>
                  <div style={{ fontSize: 9, color: SLATE, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                    {metric.label}
                  </div>
                  <button
                    onClick={() => incrementField(m.id, metric.field)}
                    style={{
                      marginTop: 4,
                      cursor: 'pointer',
                      background: PURPLE + '15',
                      border: `1px solid ${PURPLE}44`,
                      borderRadius: 4,
                      color: PURPLE,
                      padding: '2px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                    }}
                  >
                    +1
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── SECTION D: 30-DAY PLAN ──────────────────────────────────────
function ThirtyDayPlan() {
  const [items, setItems] = useState<RoadmapItem[]>([])
  const [backlog, setBacklog] = useState<RoadmapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: weekItems, error: err1 } = await supabase
        .from('roadmap')
        .select('*')
        .not('week', 'is', null)
        .order('week')
        .order('sort_order')
      if (err1) throw err1

      const { data: backlogItems, error: err2 } = await supabase
        .from('roadmap')
        .select('*')
        .is('week', null)
        .order('sort_order')
      if (err2) throw err2

      setItems(weekItems ?? [])
      setBacklog(backlogItems ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load roadmap')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggleDone = async (item: RoadmapItem) => {
    const newDone = !item.done
    const newStatus = newDone ? 'completed' : 'pending'
    try {
      const { error: err } = await supabase
        .from('roadmap')
        .update({ done: newDone, status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id)
      if (err) throw err
      const updateList = (list: RoadmapItem[]) =>
        list.map((i) => (i.id === item.id ? { ...i, done: newDone, status: newStatus } : i))
      setItems(updateList)
      setBacklog(updateList)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update item')
    }
  }

  if (loading) return <Spinner />
  if (error) return <ErrorBox message={error} />

  // Group by week
  const weeks = new Map<number, RoadmapItem[]>()
  for (const item of items) {
    if (item.week !== null) {
      const existing = weeks.get(item.week) ?? []
      existing.push(item)
      weeks.set(item.week, existing)
    }
  }
  const sortedWeeks = Array.from(weeks.entries()).sort(([a], [b]) => a - b)

  if (sortedWeeks.length === 0 && backlog.length === 0) {
    return (
      <Card>
        <div style={{ color: SLATE, fontSize: 13, textAlign: 'center', padding: 20 }}>
          No roadmap items found. Add items to the roadmap table in Supabase.
        </div>
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {sortedWeeks.map(([weekNum, weekItems]) => {
        const doneCount = weekItems.filter((i) => i.done).length
        const total = weekItems.length
        const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0
        return (
          <Card key={weekNum}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: LIGHT }}>Week {weekNum}</div>
              <div style={{ fontSize: 11, color: SLATE }}>
                {doneCount}/{total} done ({pct}%)
              </div>
            </div>
            {/* Progress bar */}
            <div
              style={{
                background: NAVY_CARD,
                borderRadius: 4,
                height: 6,
                marginBottom: 12,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  background: pct === 100 ? GREEN : TEAL,
                  height: '100%',
                  width: `${pct}%`,
                  borderRadius: 4,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {weekItems.map((item) => {
                const trackColor = TRACK_COLOR[item.track ?? ''] ?? SLATE
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '8px 10px',
                      background: NAVY_CARD,
                      borderRadius: 6,
                      border: `1px solid ${BORDER}`,
                      opacity: item.done ? 0.6 : 1,
                    }}
                  >
                    <button
                      onClick={() => toggleDone(item)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        marginTop: 1,
                        color: item.done ? GREEN : SLATE,
                        flexShrink: 0,
                      }}
                    >
                      {item.done ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: LIGHT,
                          textDecoration: item.done ? 'line-through' : 'none',
                          marginBottom: 2,
                        }}
                      >
                        {item.title}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: 11, color: SLATE, lineHeight: 1.4 }}>{item.description}</div>
                      )}
                    </div>
                    {item.track && <Tag label={item.track} color={trackColor} />}
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}

      {backlog.length > 0 && (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: LIGHT, marginBottom: 10 }}>Backlog</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {backlog.map((item) => {
              const trackColor = TRACK_COLOR[item.track ?? ''] ?? SLATE
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '8px 10px',
                    background: NAVY_CARD,
                    borderRadius: 6,
                    border: `1px solid ${BORDER}`,
                    opacity: item.done ? 0.6 : 1,
                  }}
                >
                  <button
                    onClick={() => toggleDone(item)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      marginTop: 1,
                      color: item.done ? GREEN : SLATE,
                      flexShrink: 0,
                    }}
                  >
                    {item.done ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: LIGHT,
                        textDecoration: item.done ? 'line-through' : 'none',
                        marginBottom: 2,
                      }}
                    >
                      {item.title}
                    </div>
                    {item.description && (
                      <div style={{ fontSize: 11, color: SLATE, lineHeight: 1.4 }}>{item.description}</div>
                    )}
                  </div>
                  {item.track && <Tag label={item.track} color={trackColor} />}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

// ── MAIN PAGE ───────────────────────────────────────────────────
export default function GrowthPage() {
  return (
    <div style={{ minHeight: '100vh', background: NAVY, color: LIGHT, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div
        style={{
          background: NAVY_MID,
          borderBottom: `1px solid ${BORDER}`,
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <Link href="/" style={{ color: SLATE, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: LIGHT, letterSpacing: '-0.01em' }}>
            Beacon &amp; Ledger
          </div>
          <div style={{ fontSize: 11, color: TEAL, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Growth
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        {/* Section A: Acquisition Channels */}
        <section>
          <SectionTitle>
            <Megaphone size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Acquisition Channels
          </SectionTitle>
          <AcquisitionChannels />
        </section>

        {/* Section B: LinkedIn Outreach Tracker */}
        <section>
          <SectionTitle>
            <Users size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            LinkedIn Outreach Tracker
          </SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <Card>
              <LinkedInContactList />
            </Card>
            <Card>
              <WeeklyTotals />
            </Card>
          </div>
        </section>

        {/* Section C: Lead Magnets */}
        <section>
          <SectionTitle>
            <FileText size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Lead Magnets
          </SectionTitle>
          <LeadMagnetsSection />
        </section>

        {/* Section D: 30-Day Plan */}
        <section>
          <SectionTitle>
            <Target size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            30-Day Plan
          </SectionTitle>
          <ThirtyDayPlan />
        </section>
      </div>
    </div>
  )
}
