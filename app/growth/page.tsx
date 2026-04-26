'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { LEAD_STAGES, LEAD_STAGE_COLORS, type LeadStage } from '@/lib/tokens'
import {
  Plus, CheckCircle, AlertCircle, Users,
  ChevronDown, Clock, X, Linkedin, TrendingUp
} from 'lucide-react'
import LinkedInProspectPanel from '@/components/LinkedInProspectPanel'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

// ── DESIGN TOKENS ───────────────────────────────────────────────
const AMBER = '#F59E0B'
const GREEN = '#34D399'
const RED = '#F87171'
const PURPLE = '#7C8CF8'

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
interface Lead {
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
  trigger_type: string | null
  industry: string | null
  postcode: string | null
  region: string | null
  monthly_value: number | null
  created_at: string
  updated_at: string | null
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

// ── HELPERS ─────────────────────────────────────────────────────
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

// ── MAIN COMPONENT ──────────────────────────────────────────────
export default function GrowthPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [channelsOpen, setChannelsOpen] = useState(false)
  const [showMoreNewCount, setShowMoreNewCount] = useState(8)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendingName, setSendingName] = useState('')
  const [prospectPanelOpen, setProspectPanelOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [lRes, wRes, cRes] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase
          .from('bl_weekly_stats')
          .select('*')
          .eq('channel', 'LinkedIn')
          .order('week_starting', { ascending: false })
          .limit(5),
        supabase.from('campaigns').select('*').order('name'),
      ])
      if (lRes.error) throw lRes.error
      if (wRes.error) throw wRes.error
      if (cRes.error) throw cRes.error
      setLeads((lRes.data as Lead[]) || [])
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
  const updateLead = async (id: string, updates: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)))
    try {
      const { error } = await supabase
        .from('leads')
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

  const startEdit = (l: Lead) => {
    setEditingId(l.id)
    setEditForm({
      status: l.status || '',
      next_action: l.next_action || '',
      follow_up_date: l.follow_up_date || '',
      contact_name: l.contact_name || '',
      company_name: l.company_name || '',
      email: l.email || '',
      linkedin_url: l.linkedin_url || '',
      notes: l.notes || '',
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    await updateLead(editingId, {
      status: editForm.status || 'New',
      next_action: editForm.next_action || null,
      follow_up_date: editForm.follow_up_date || null,
      contact_name: editForm.contact_name || null,
      company_name: editForm.company_name || null,
      email: editForm.email || null,
      linkedin_url: editForm.linkedin_url || null,
      notes: editForm.notes || null,
    })
    setEditingId(null)
    setEditForm({})
  }

  // ── DERIVED DATA ────────────────────────────────────────────
  const monday = getMonday(new Date())

  const overdueLeads = leads
    .filter(
      (l) =>
        l.follow_up_date &&
        l.follow_up_date <= today &&
        (!l.snoozed_until || l.snoozed_until < today) &&
        l.status !== 'Signed' &&
        l.status !== 'Lost'
    )
    .sort((a, b) => (a.follow_up_date! > b.follow_up_date! ? 1 : -1))

  const overdueCount = overdueLeads.length

  const newLeads = leads
    .filter((l) => l.status === 'New')
    .sort((a, b) => (b.bl_score || 0) - (a.bl_score || 0))

  const newLeadsCount = newLeads.length

  const contactedThisWeek = leads.filter(
    (l) => l.status === 'Contacted' && l.updated_at && l.updated_at >= monday
  ).length

  const currentWeekStats = weeklyStats.find((w) => w.week_starting === monday)
  const pastWeeks = weeklyStats.filter((w) => w.week_starting !== monday)

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
    <div className="bl-page">
      <PageHeader
        title="Growth"
        subtitle="Outreach tracking and weekly activity"
        icon={TrendingUp}
        gradientFrom="#064E3B"
        gradientTo="#065F46"
        accentColor="#34D399"
      />

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
        <Card className="bl-card" style={{ marginBottom: 32 }}>
          <CardContent className="p-6">
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
                <span style={{ fontSize: 22, fontWeight: 700 }}>{newLeadsCount}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>new leads</span>
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
                <span style={{ fontSize: 22, fontWeight: 700 }}>{contactedThisWeek}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>contacted this week</span>
              </div>
              <Button
                onClick={() => setProspectPanelOpen(true)}
              >
                + Add LinkedIn Prospect
              </Button>
            </div>
          </CardContent>
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
            {overdueLeads.length === 0 ? (
              <Card className="bl-card">
                <CardContent className="p-6" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
                  <CheckCircle size={28} color={'var(--accent)'} />
                  <span style={{ color: 'var(--accent)', fontSize: 14 }}>
                    You&apos;re all caught up today
                  </span>
                </CardContent>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {overdueLeads.map((l) => {
                  const days = Math.floor(
                    (new Date(today).getTime() - new Date(l.follow_up_date!).getTime()) / 86400000
                  )

                  if (editingId === l.id) {
                    return (
                      <Card key={l.id} className="bl-card">
                        <CardContent className="p-6">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <select
                              value={editForm.status || ''}
                              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
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
                              {LEAD_STAGES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
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
                              <Button size="sm" onClick={saveEdit}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingId(null)
                                  setEditForm({})
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  }

                  return (
                    <Card key={l.id} className="bl-card">
                      <CardContent className="p-6">
                        <div
                          style={{ cursor: 'pointer', marginBottom: 8 }}
                          onClick={() => startEdit(l)}
                        >
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {l.contact_name || l.company_name || 'Unknown'}
                          </div>
                          {l.contact_name && l.company_name && l.contact_name !== l.company_name && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.company_name}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Tag label={l.status} color={LEAD_STAGE_COLORS[l.status as LeadStage] || 'var(--text-muted)'} />
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
                        {l.next_action && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 8 }}>
                            {l.next_action}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button
                            size="sm"
                            onClick={() =>
                              updateLead(l.id, {
                                follow_up_date: null,
                                next_action: null,
                              })
                            }
                          >
                            <CheckCircle size={12} /> Done
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            style={{ borderColor: AMBER + '66', color: AMBER }}
                            onClick={() => {
                              const snoozeDate = new Date()
                              snoozeDate.setDate(snoozeDate.getDate() + 3)
                              updateLead(l.id, {
                                snoozed_until: snoozeDate.toISOString().split('T')[0],
                              })
                            }}
                          >
                            <Clock size={12} /> Snooze 3d
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Column B: New to Contact ── */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>NEW TO CONTACT</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProspectPanelOpen(true)}
              >
                + Add Prospect
              </Button>
            </div>
            {newLeads.length === 0 ? (
              <Card className="bl-card">
                <CardContent className="p-6" style={{ textAlign: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No new leads waiting</span>
                </CardContent>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {newLeads.slice(0, showMoreNewCount).map((l) => {
                  const score = l.bl_score
                  const scoreBg = score !== null && score >= 8 ? GREEN : score !== null && score >= 6 ? AMBER : 'var(--text-muted)'

                  return (
                    <Card key={l.id} className="bl-card">
                      <CardContent className="p-6">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>
                            {l.company_name || 'Unknown'}
                          </span>
                          {score !== null && (
                            <Badge style={{ background: scoreBg + '22', color: scoreBg, border: 'none' }}>
                              {score}
                            </Badge>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                          {l.trigger_type && <Tag label={l.trigger_type} color={'var(--accent)'} />}
                          {l.industry && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.industry}</span>
                          )}
                        </div>
                        {l.bl_reason && (
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
                            {l.bl_reason}
                          </div>
                        )}
                        {l.postcode && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                            {l.postcode}
                          </div>
                        )}

                        {/* Inline contact name input for Send request */}
                        {sendingId === l.id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                            <input
                              type="text"
                              value={sendingName}
                              onChange={(e) => setSendingName(e.target.value)}
                              placeholder="Contact name"
                              autoFocus
                              style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: 6,
                                color: 'var(--text-primary)',
                                padding: '4px 8px',
                                fontSize: 12,
                                outline: 'none',
                                fontFamily: 'inherit',
                                flex: 1,
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                const threeDays = new Date()
                                threeDays.setDate(threeDays.getDate() + 3)
                                updateLead(l.id, {
                                  status: 'Contacted',
                                  contact_name: sendingName || null,
                                  follow_up_date: threeDays.toISOString().split('T')[0],
                                })
                                setSendingId(null)
                                setSendingName('')
                              }}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSendingId(null)
                                setSendingName('')
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSendingId(l.id)
                                setSendingName('')
                              }}
                            >
                              Send request
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              style={{ borderColor: PURPLE + '66', color: PURPLE }}
                              onClick={() =>
                                window.open(
                                  l.linkedin_url ||
                                    'https://www.linkedin.com/search/results/companies/?keywords=' +
                                      encodeURIComponent(l.company_name || ''),
                                  '_blank',
                                  'noopener,noreferrer'
                                )
                              }
                            >
                              <Linkedin size={12} /> LinkedIn
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                updateLead(l.id, {
                                  status: 'Lost',
                                })
                              }
                            >
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
                {newLeads.length > showMoreNewCount && (
                  <Button variant="outline" onClick={() => setShowMoreNewCount((c) => c + 8)}>Load more</Button>
                )}
              </div>
            )}
          </div>

          {/* ── Column C: This Week ── */}
          <div>
            <SectionTitle>This Week</SectionTitle>
            <Card className="bl-card" style={{ marginBottom: 16 }}>
              <CardContent className="p-6">
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
                      <Button size="sm" onClick={() => incrementStat(field)}>
                        <Plus size={12} /> 1
                      </Button>
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
              </CardContent>
            </Card>

            {/* Last 4 weeks table */}
            {pastWeeks.length > 0 && (
              <Card className="bl-card">
                <CardContent className="p-6">
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
                </CardContent>
              </Card>
            )}
          </div>
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
                <Card className="bl-card">
                  <CardContent className="p-6" style={{ textAlign: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>No campaigns yet</span>
                  </CardContent>
                </Card>
              ) : (
                campaigns.map((c) => {
                  const statusColor =
                    c.status === 'active' ? GREEN : c.status === 'paused' ? AMBER : 'var(--text-muted)'
                  return (
                    <Card key={c.id} className="bl-card">
                      <CardContent className="p-6">
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
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {prospectPanelOpen && (
        <LinkedInProspectPanel
          onSaved={() => { loadData(); setProspectPanelOpen(false) }}
          onClose={() => setProspectPanelOpen(false)}
        />
      )}
    </div>
  )
}
