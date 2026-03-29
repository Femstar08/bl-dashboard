'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { DEFAULT_CONTENT } from '@/lib/defaults'
import { ContentItem, ContentStatus } from '@/lib/types'
import { supabase } from '@/lib/supabase'

// ── Types for Supabase data ──────────────────────────────────────
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

// ── Shared inline style helpers (CSS variable based) ─────────────
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

function Input({ value, onChange, placeholder, type = 'text', small }: { value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; small?: boolean }) {
  return <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={inputStyle(small)} />
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle}>{options.map(o => <option key={o}>{o}</option>)}</select>
}

function Btn({ onClick, children, variant = 'ghost' }: { onClick?: () => void; children: React.ReactNode; variant?: 'ghost' | 'primary' | 'danger' }) {
  const styles: Record<string, React.CSSProperties> = {
    ghost: { background: 'var(--bg-primary)', color: 'var(--text-muted)', border: '1px solid var(--border)' },
    primary: { background: 'var(--accent)', color: 'var(--bg-primary)', border: '1px solid var(--accent)' },
    danger: { background: 'transparent', color: '#F87171', border: '1px solid rgba(248,113,113,0.4)' },
  }
  return (
    <button onClick={onClick} style={{ ...styles[variant], padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', transition: 'opacity 0.15s' }}>
      {children}
    </button>
  )
}

// ── KPI BAR ───────────────────────────────────────────────────────
function KpiBar({ leads, milestones, content, consultingTarget }: { leads: DbLead[]; milestones: DbRoadmap[]; content: ContentItem[]; consultingTarget: number }) {
  const signedMrr = leads.filter(l => l.status === 'Signed').reduce((s, l) => s + (l.revenue || 0), 0)
  const pct = consultingTarget > 0 ? Math.min(100, Math.round((signedMrr / consultingTarget) * 100)) : 0
  const done = milestones.filter(m => m.done).length
  const published = content.filter(c => c.status === 'Published').length
  const active = leads.filter(l => !['Dead', 'Lost', 'Passed'].includes(l.status)).length

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

// ── PIPELINE ──────────────────────────────────────────────────────
function Pipeline({ leads, stages, onUpdate, onAdd, onDelete }: {
  leads: DbLead[]
  stages: string[]
  onUpdate: (id: string, status: string) => void
  onAdd: (lead: { company_name: string; business_type: string; status: string; notes: string; source: string }) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'Accountant', stage: stages[0] || 'New', note: '' })

  function add() {
    if (!form.name.trim()) return
    onAdd({ company_name: form.name, business_type: form.type, status: form.stage, notes: form.note, source: 'Dashboard' })
    setForm({ name: '', type: 'Accountant', stage: stages[0] || 'New', note: '' })
    setOpen(false)
  }

  const stageAccentOpacity = (idx: number, total: number) => {
    const base = 0.2
    const step = (1 - base) / Math.max(total - 1, 1)
    return base + step * idx
  }

  return (
    <section style={{ gridColumn: 'span 2' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Sales Pipeline</h2>
        <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Add Lead
        </button>
      </div>

      {open && (
        <div style={{ ...cardStyle, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Input placeholder="Company name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <Select value={form.type} onChange={v => setForm({ ...form, type: v })} options={['Accountant', 'SME']} />
          <Select value={form.stage} onChange={v => setForm({ ...form, stage: v })} options={stages} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input placeholder="Note (optional)" value={form.note} onChange={v => setForm({ ...form, note: v })} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="primary" onClick={add}>Save</Btn>
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }} className="custom-scrollbar">
        {stages.map((stage, stageIdx) => (
          <div key={stage} style={{ flexShrink: 0, width: 256 }}>
            <div style={{ background: 'var(--bg-mid)', padding: 12, borderRadius: '8px 8px 0 0', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{stage}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{leads.filter(l => l.status === stage).length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {leads.filter(l => l.status === stage).map(lead => (
                <div key={lead.id} style={{ ...cardStyle, padding: 16, borderLeft: `4px solid var(--accent)`, borderLeftColor: `rgba(83,233,197,${stageAccentOpacity(stageIdx, stages.length)})`, position: 'relative' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{lead.company_name || lead.name || 'Unnamed'}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                      {(lead.revenue || 0) > 0 ? `£${(lead.revenue || 0).toLocaleString()}/mo` : lead.source || '-'}
                    </span>
                    {lead.business_type && (
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase', background: lead.business_type === 'SME' ? 'var(--accent)' : 'var(--bg-mid)', color: lead.business_type === 'SME' ? 'var(--bg-primary)' : 'var(--text-primary)' }}>{lead.business_type}</span>
                    )}
                  </div>
                  {lead.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{lead.notes}</div>}
                  {/* Stage move + delete actions */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    {stages.filter(s => s !== stage).slice(0, 2).map(s => (
                      <button key={s} onClick={() => onUpdate(lead.id, s)} title={`Move to ${s}`} style={{ fontSize: 10, padding: '2px 6px', background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>→ {s}</button>
                    ))}
                    <button onClick={() => onDelete(lead.id)} style={{ fontSize: 10, padding: '2px 6px', background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 4, color: '#F87171', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
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
                    <div style={{ width: 24, height: 24, borderRadius: 99, background: item.channel === 'Femi' ? 'var(--text-primary)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: item.channel === 'Femi' ? 'var(--bg-primary)' : 'var(--bg-primary)' }}>
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
  const [stages, setStages] = useState<string[]>([])
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

      const distinctStatuses = Array.from(new Set((leadsRes.data || []).map(l => l.status))).filter(Boolean)
      setStages(distinctStatuses.length > 0 ? distinctStatuses : ['New', 'Enriched', 'Outreach', 'Discovery', 'Proposal', 'Signed'])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const updateLeadStatus = async (id: string, status: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    try {
      const { error } = await supabase.from('leads').update({ status }).eq('id', id)
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 32 }}>
        <Pipeline leads={leads} stages={stages} onUpdate={updateLeadStatus} onAdd={addLead} onDelete={deleteLead} />
        <RevenueTracker leads={leads} revenue={revenue} onUpdateTarget={updateRevenueTarget} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        <Milestones milestones={milestones} onToggle={toggleMilestone} />
        <ContentQueue content={content} setContent={setContent} />
      </div>
    </div>
  )
}
