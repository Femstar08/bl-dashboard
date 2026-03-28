'use client'
import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from '@/lib/useLocalStorage'
import { DEFAULT_CONTENT, DEFAULT_REVENUE } from '@/lib/defaults'
import { ContentItem, ContentStatus } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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

// Reusable Components matching the new Design System
function Input({ value, onChange, placeholder, type = 'text', small }: { value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; small?: boolean }) {
  return (
    <input
      type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={`bg-surface-container-lowest border border-outline-variant/30 focus:border-secondary outline-none rounded-md text-on-surface w-full ${small ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}
    />
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="bg-surface-container-lowest border border-outline-variant/30 focus:border-secondary outline-none rounded-md text-on-surface px-3 py-2 text-sm w-full">
      {options.map((o: string) => <option key={o}>{o}</option>)}
    </select>
  )
}

function Btn({ onClick, children, variant = 'ghost' }: { onClick?: () => void; children: React.ReactNode; variant?: 'ghost' | 'primary' | 'danger' }) {
  const styles: Record<string, string> = {
    ghost: "text-xs font-bold text-[#15213C] bg-surface-container-low hover:bg-surface-variant",
    primary: "bg-secondary-container text-on-secondary-container font-bold hover:opacity-90",
    danger: "text-error hover:bg-error-container"
  }
  return (
    <button onClick={onClick} className={`${styles[variant]} px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2`}>
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
  const active = leads.filter(l => l.status !== 'Lost').length

  const mkCard = (icon: string, badgeText: string, badgeColor: string, title: string, value: string | number) => (
    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_12px_40px_rgba(21,33,60,0.06)] group hover:-translate-y-1 transition-transform duration-300">
      <div className="flex justify-between items-start mb-4">
        <span className="material-symbols-outlined text-secondary">{icon}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{badgeText}</span>
      </div>
      <h3 className="text-[#5C6478] text-xs font-semibold uppercase tracking-wider mb-1">{title}</h3>
      <p className="text-2xl font-extrabold text-[#15213C]">{value}</p>
    </div>
  )

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      {mkCard('payments', `${pct}%`, 'text-secondary bg-secondary-container/30', 'MRR (signed)', `£${signedMrr.toLocaleString()}`)}
      {mkCard('group', 'Active', 'text-secondary bg-secondary-container/30', 'Active leads', active)}
      {mkCard('task_alt', `${Math.round(done/(milestones.length || 1)*100)}%`, 'text-[#5C6478] bg-surface-container-low', 'Milestones done', `${done}/${milestones.length}`)}
      {mkCard('article', 'New', 'text-secondary bg-secondary-container/30', 'Posts published', published)}
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

  const getStageBorder = (stage: string, idx: number) => {
    const borders = ['border-secondary/20', 'border-secondary/40', 'border-secondary/60', 'border-secondary']
    return borders[Math.min(idx, borders.length - 1)] || 'border-outline/20'
  }

  return (
    <section className="lg:col-span-2 space-y-6">
      <div className="flex justify-between items-end">
        <h2 className="text-2xl font-bold text-[#15213C] tracking-tight">Sales Pipeline</h2>
        <span onClick={() => setOpen(!open)} className="text-sm font-medium text-secondary cursor-pointer hover:underline flex items-center"><span className="material-symbols-outlined text-[18px] mr-1">add</span> Add Lead</span>
      </div>

      {open && (
        <div className="bg-surface-container-lowest shadow-[0_12px_40px_rgba(21,33,60,0.06)] rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input placeholder="Company name" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} />
          <Select value={form.type} onChange={(v: string) => setForm({ ...form, type: v })} options={['Accountant', 'SME']} />
          <Select value={form.stage} onChange={(v: string) => setForm({ ...form, stage: v })} options={stages} />
          <div className="md:col-span-3">
            <Input placeholder="Note (optional)" value={form.note} onChange={(v: string) => setForm({ ...form, note: v })} />
          </div>
          <div className="flex gap-2 items-center">
            <Btn variant="primary" onClick={add}>Save</Btn>
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {stages.map((stage, stageIdx) => (
          <div key={stage} className="flex-shrink-0 w-64">
            <div className="bg-surface-container-low p-3 rounded-t-lg mb-3 flex justify-between items-center">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#5C6478]">{stage}</span>
              <span className="bg-white/50 text-[10px] px-2 py-0.5 rounded text-[#15213C] font-bold">{leads.filter(l => l.status === stage).length}</span>
            </div>
            <div className="space-y-3">
              {leads.filter(l => l.status === stage).map((lead) => (
                <div key={lead.id} className={`bg-surface-container-lowest p-4 rounded-lg shadow-sm border-l-4 ${getStageBorder(stage, stageIdx)} group relative`}>
                  <p className="text-sm font-bold text-[#15213C] mb-1">{lead.company_name || lead.name || 'Unnamed'}</p>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-[#5C6478]">{lead.source || '-'}</span>
                    {lead.business_type && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${lead.business_type === 'SME' ? 'bg-primary-container text-white' : 'bg-secondary-container text-on-secondary-container'}`}>{lead.business_type}</span>
                    )}
                  </div>
                  {lead.notes && <div className="text-[10px] text-[#5C6478] line-clamp-2">{lead.notes}</div>}

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 flex gap-1 bg-surface-container-lowest shadow-sm rounded">
                    {stages.filter(s => s !== stage).slice(0, 2).map((s: string) => (
                       <button key={s} onClick={() => onUpdate(lead.id, s)} className="text-[10px] px-1 hover:text-secondary" title={`Move to ${s}`}>→{s.charAt(0)}</button>
                    ))}
                    <button onClick={() => onDelete(lead.id)} className="text-[10px] px-1 text-error hover:text-error-container">✕</button>
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

  return (
    <section className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_12px_40px_rgba(21,33,60,0.06)] border border-white">
      <h2 className="text-xl font-bold text-[#15213C] mb-8">Revenue Targets</h2>
      <div className="space-y-8">
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-[#15213C]">Consulting MRR</span>
            <span className="text-sm font-bold text-secondary">£{signedMrr.toLocaleString()} / £{revenue.consulting_target.toLocaleString()}</span>
          </div>
          <div className="w-full bg-surface-container-low h-3 rounded-full overflow-hidden">
            <div className="bg-secondary h-full transition-all duration-1000" style={{ width: `${pctConsulting}%` }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-[#15213C]">SaaS ARR (pilot)</span>
            <span className="text-sm font-bold text-secondary">£0 / £{revenue.saas_target.toLocaleString()}</span>
          </div>
          <div className="w-full bg-surface-container-low h-3 rounded-full overflow-hidden">
            <div className="bg-secondary h-full opacity-60 transition-all duration-1000" style={{ width: `${pctSaas}%` }}></div>
          </div>
        </div>

        <div className="pt-6 border-t border-[#F3F4F5]">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[10px] text-[#5C6478] font-bold uppercase tracking-wider mb-1 block">Consulting Target</label>
              <Input small value={revenue.consulting_target} onChange={(v: string) => onUpdateTarget('consulting_target', Number(v) || 0)} type="number" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-[#5C6478] font-bold uppercase tracking-wider mb-1 block">SaaS Target</label>
              <Input small value={revenue.saas_target} onChange={(v: string) => onUpdateTarget('saas_target', Number(v) || 0)} type="number" />
            </div>
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
    <section className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_12px_40px_rgba(21,33,60,0.06)]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#15213C]">30-Day Milestones</h2>
        <span className="text-xs font-bold bg-surface-container-low px-2 py-1 rounded text-[#5C6478]">
          {milestones.filter(m => m.done).length} done
        </span>
      </div>
      <div className="space-y-8">
        {tracks.map((track) => {
          const trackMilestones = milestones.filter(m => m.track === track)
          if (trackMilestones.length === 0) return null
          return (
            <div key={track}>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">{track}</h4>
              <div className="space-y-3">
                {trackMilestones.map(m => (
                  <label key={m.id} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={m.done}
                      onChange={() => onToggle(m.id, !m.done)}
                      className="w-4 h-4 mt-0.5 rounded text-secondary focus:ring-secondary border-outline-variant/50 cursor-pointer"
                    />
                    <div>
                      <span className={`text-sm transition-colors ${m.done ? 'text-[#5C6478] line-through' : 'text-[#15213C] group-hover:text-secondary'}`}>
                        {m.title}
                      </span>
                      {m.description && (
                        <p className="text-[10px] text-[#5C6478] mt-0.5">{m.description}</p>
                      )}
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

  return (
    <section className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_12px_40px_rgba(21,33,60,0.06)]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#15213C]">Content Queue</h2>
        <button onClick={() => setOpen(!open)} className="text-xs font-bold text-[#15213C] bg-surface-container-low px-3 py-1.5 rounded-lg hover:bg-surface-variant transition-colors">
          Add Post
        </button>
      </div>

      {open && (
         <div className="bg-surface-container-low rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
           <Select value={form.channel} onChange={(v: string) => setForm({ ...form, channel: v })} options={['Femi', 'B&L']} />
           <Select value={form.status} onChange={(v: string) => setForm({ ...form, status: v })} options={['Draft', 'Queued', 'Published']} />
           <Input placeholder="Scheduled Date" type="date" value={form.scheduledDate} onChange={(v: string) => setForm({ ...form, scheduledDate: v })} />
           <div className="md:col-span-3">
              <Input placeholder="Topic / post idea" value={form.topic} onChange={(v: string) => setForm({ ...form, topic: v })} />
           </div>
           <div className="flex gap-2">
             <Btn variant="primary" onClick={add}>Save</Btn>
             <Btn onClick={() => setOpen(false)}>Cancel</Btn>
           </div>
         </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-high/30">
              <th className="text-[10px] font-bold uppercase tracking-widest p-4 text-[#5C6478]">Channel</th>
              <th className="text-[10px] font-bold uppercase tracking-widest p-4 text-[#5C6478]">Topic</th>
              <th className="text-[10px] font-bold uppercase tracking-widest p-4 text-[#5C6478]">Status</th>
              <th className="text-[10px] font-bold uppercase tracking-widest p-4 text-[#5C6478]">Date</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F5]">
            {content.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-xs text-[#5C6478]">No content found. Add a post idea.</td></tr>
            )}
            {content.map((item: ContentItem) => (
              <tr key={item.id} className="hover:bg-surface-container-low transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {item.channel === 'Femi' ? (
                      <div className="w-6 h-6 rounded-full bg-[#15213C] flex items-center justify-center text-[8px] text-white font-bold">F</div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center text-[8px] text-on-secondary-container font-bold">BL</div>
                    )}
                    <span className="text-xs font-semibold text-[#15213C] hidden md:inline">{item.channel}</span>
                  </div>
                </td>
                <td className="p-4 text-xs font-medium text-[#15213C]">{item.topic}</td>
                <td className="p-4">
                  <select
                    value={item.status}
                    onChange={e => setContent(content.map((c: ContentItem) => c.id === item.id ? { ...c, status: e.target.value as ContentStatus } : c))}
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded outline-none border-none cursor-pointer ${
                      item.status === 'Published' ? 'bg-secondary text-white' :
                      item.status === 'Queued' ? 'bg-secondary-container/30 text-secondary' :
                      'bg-surface-container-high text-[#5C6478]'
                    }`}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Queued">Queued</option>
                    <option value="Published">Published</option>
                  </select>
                </td>
                <td className="p-4 text-[11px] text-[#5C6478] font-medium tabular-nums">{item.scheduledDate || '-'}</td>
                <td className="p-4 text-right">
                  <button onClick={() => setContent(content.filter((c: ContentItem) => c.id !== item.id))} className="text-[#5C6478] hover:text-error opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
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
  // Supabase state
  const [leads, setLeads] = useState<DbLead[]>([])
  const [milestones, setMilestones] = useState<DbRoadmap[]>([])
  const [revenue, setRevenue] = useState<DbRevenue>({ id: '', consulting_target: 10500, saas_target: 10000, updated_at: '' })
  const [stages, setStages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Content still in localStorage
  const [content, setContentRaw, contentLoaded] = useLocalStorage('bl_content', DEFAULT_CONTENT)
  const setContent = (c: ContentItem[]) => setContentRaw(c)

  // ── Load from Supabase ──
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

      // Read distinct statuses from data
      const distinctStatuses = Array.from(new Set((leadsRes.data || []).map(l => l.status))).filter(Boolean)
      if (distinctStatuses.length > 0) {
        setStages(distinctStatuses)
      } else {
        setStages(['New', 'Enriched', 'Outreach', 'Discovery', 'Proposal', 'Signed'])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Supabase mutations ──
  const updateLeadStatus = async (id: string, status: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    try {
      const { error } = await supabase.from('leads').update({ status }).eq('id', id)
      if (error) throw error
    } catch {
      loadData()
    }
  }

  const addLead = async (lead: { company_name: string; business_type: string; status: string; notes: string; source: string }) => {
    try {
      const { data, error } = await supabase.from('leads').insert(lead).select().single()
      if (error) throw error
      if (data) setLeads(prev => [data, ...prev])
    } catch {
      loadData()
    }
  }

  const deleteLead = async (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id))
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) throw error
    } catch {
      loadData()
    }
  }

  const updateRevenueTarget = async (field: 'consulting_target' | 'saas_target', value: number) => {
    setRevenue(prev => ({ ...prev, [field]: value }))
    try {
      const { error } = await supabase.from('bl_revenue_targets').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', revenue.id)
      if (error) throw error
    } catch {
      loadData()
    }
  }

  const toggleMilestone = async (id: string, done: boolean) => {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, done, status: done ? 'completed' : 'pending' } : m))
    try {
      const { error } = await supabase.from('roadmap').update({ done, status: done ? 'completed' : 'pending', updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    } catch {
      loadData()
    }
  }

  if (loading || !contentLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-secondary font-headline text-xl animate-pulse">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <p className="text-error font-headline text-lg mb-4">Error loading dashboard</p>
          <p className="text-[#5C6478] text-sm mb-4">{error}</p>
          <button onClick={loadData} className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-lg font-bold text-sm">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* TopAppBar */}
      <header className="bg-white/80 backdrop-blur-xl docked full-width top-0 sticky z-50 shadow-[0_12px_40px_rgba(21,33,60,0.06)]">
        <div className="flex items-center justify-between px-8 py-6 max-w-[1440px] mx-auto w-full">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-[#15213C] lg:hidden cursor-pointer">menu</span>
            <div className="flex flex-col">
              <span className="text-[#15213C] font-extrabold tracking-tighter font-headline text-2xl leading-tight">Beacon & Ledger</span>
              <span className="text-[11px] font-label font-semibold uppercase tracking-wider text-[#5C6478]">Growth dashboard</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <nav className="flex gap-3">
              <span className="text-secondary font-semibold text-sm px-3 py-1.5 bg-secondary-container/20 rounded-lg">Dashboard</span>
              <Link href="/growth" className="text-[#5C6478] hover:text-[#15213C] transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-surface-container-low">Growth</Link>
              <Link href="/analytics" className="text-[#5C6478] hover:text-[#15213C] transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-surface-container-low">Analytics</Link>
              <Link href="/prospects" className="text-[#5C6478] hover:text-[#15213C] transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-surface-container-low font-medium" style={{ color: '#53E9C5' }}>Prospects</Link>
            </nav>
            <Link href="/content">
              <button className="bg-secondary-container text-on-secondary-container px-6 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm">
                Content Intelligence
              </button>
            </Link>
          </div>
        </div>
        <div className="bg-[#F3F4F5] h-[1px] w-full"></div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 md:px-8 py-10 pb-32">
        {/* KPI bar */}
        <KpiBar leads={leads} milestones={milestones} content={content} consultingTarget={revenue.consulting_target} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <Pipeline leads={leads} stages={stages} onUpdate={updateLeadStatus} onAdd={addLead} onDelete={deleteLead} />
          <RevenueTracker leads={leads} revenue={revenue} onUpdateTarget={updateRevenueTarget} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Milestones milestones={milestones} onToggle={toggleMilestone} />
          <ContentQueue content={content} setContent={setContent} />
        </div>
      </main>
    </>
  )
}
