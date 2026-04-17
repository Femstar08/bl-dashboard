'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, type NewsSource, type IncomingArticle } from '@/lib/supabase'
import type { ContentCalendarItem, Comment } from '@/lib/types-requirements'
import { CAL_STATUSES, CAL_STATUS_COLORS } from '@/lib/types-requirements'
import { SEED_CONTENT_CALENDAR } from '@/lib/seed-data'
import CalendarTable from '@/components/content-calendar/CalendarTable'
import CalendarGrid from '@/components/content-calendar/CalendarGrid'
import CalendarKanban from '@/components/content-calendar/CalendarKanban'
import CalendarDetail from '@/components/content-calendar/CalendarDetail'
import ViewToggle from '@/components/shared/ViewToggle'
import KpiBar from '@/components/shared/KpiBar'
import FilterBar from '@/components/shared/FilterBar'
import UploadButton from '@/components/shared/UploadButton'
import ExportButton from '@/components/shared/ExportButton'
import SyncSettings from '@/components/shared/SyncSettings'
import { Plus, Trash2, RefreshCw, CheckCircle, XCircle, X, Zap, Calendar, ExternalLink, ToggleLeft, ToggleRight, Clock, Send, ChevronDown, Copy, ImageIcon } from 'lucide-react'

const AMBER = '#F59E0B'
const GREEN = '#34D399'
const RED = '#F87171'
const PURPLE = '#7C8CF8'

const TEAL_BG = 'rgba(83,233,197,0.13)'
const AMBER_BG = 'rgba(245,158,11,0.13)'
const GREEN_BG = 'rgba(52,211,153,0.13)'
const RED_BG = 'rgba(248,113,113,0.13)'
const PURPLE_BG = 'rgba(124,140,248,0.13)'

const PROFILE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  femi:         { label: 'Femi (personal)', color: PURPLE, desc: 'AI thought leadership, no B&L mention' },
  bl_accountant:{ label: 'B&L — Accountants', color: 'var(--accent)',   desc: 'UK practice owners, MTD/compliance focus' },
  bl_sme:       { label: 'B&L — SMEs',        color: AMBER,  desc: 'Business owners, operational clarity focus' },
}

const STATUS_COLOR: Record<string, string> = {
  Fetched: 'var(--text-muted)', AI_Drafted: PURPLE, Ready_for_Review: AMBER,
  Approved: GREEN, Published: 'var(--accent)', Rejected: RED,
}

const TOPIC_TAG_COLORS: Record<string, string> = {
  AI: PURPLE, Accounting: 'var(--accent)', MTD: AMBER, HMRC: RED,
  Tax: '#F97316', Finance: GREEN, Compliance: '#60A5FA', SME: AMBER,
  Technology: '#818CF8', Payroll: 'var(--text-muted)',
}

const TAG_KEYWORDS: Record<string, string[]> = {
  AI:         ['ai', 'artificial intelligence', 'machine learning', 'automation', 'llm', 'gpt', 'claude', 'chatgpt', 'copilot'],
  Accounting: ['accounting', 'accountant', 'bookkeeping', 'audit', 'financial statement'],
  MTD:        ['mtd', 'making tax digital'],
  HMRC:       ['hmrc', 'self assessment', 'vat return', 'paye'],
  Tax:        ['tax', 'taxation', 'capital gains', 'corporation tax', 'income tax'],
  Finance:    ['finance', 'financial', 'investment', 'funding', 'cash flow', 'revenue', 'profit'],
  Compliance: ['compliance', 'regulation', 'regulatory', 'gdpr', 'legal'],
  SME:        ['sme', 'small business', 'startup', 'entrepreneur'],
  Technology: ['technology', 'software', 'digital', 'saas', 'platform', 'tech'],
  Payroll:    ['payroll', 'salary', 'wages'],
}

function extractTags(title: string, summary?: string | null): string[] {
  const text = `${title} ${summary || ''}`.toLowerCase()
  return Object.entries(TAG_KEYWORDS)
    .filter(([, kws]) => kws.some(kw => text.includes(kw)))
    .map(([tag]) => tag)
    .slice(0, 4)
}

function s(obj: React.CSSProperties): React.CSSProperties { return obj }

function Tag({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 99, background: color + '22', color }}>{label}</span>
}

function Btn({ onClick, children, variant = 'ghost', disabled, small }: { onClick?: () => void; children: React.ReactNode; variant?: 'ghost'|'teal'|'danger'|'amber'; disabled?: boolean; small?: boolean }) {
  const base: React.CSSProperties = { cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, border: '1.5px solid', transition: 'opacity 0.15s', opacity: disabled ? 0.4 : 1, fontSize: small ? 11 : 13, fontWeight: 500, padding: small ? '4px 10px' : '8px 16px', background: 'transparent' }
  const variants = {
    ghost: { borderColor: 'var(--border)', color: 'var(--text-primary)' },
    teal:  { borderColor: 'var(--accent)', color: 'var(--accent)' },
    danger:{ borderColor: RED + '66', color: RED },
    amber: { borderColor: AMBER + '66', color: AMBER },
  }
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant] }}>{children}</button>
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return <div style={{ background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, borderTop: accent ? `3px solid ${accent}` : '1px solid var(--border)' }}>{children}</div>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>{children}</h2>
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '8px 12px', fontSize: 13, width: '100%', outline: 'none', fontFamily: 'inherit' }} />
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: {value: string; label: string}[] }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '8px 12px', fontSize: 13, width: '100%', outline: 'none', fontFamily: 'inherit' }}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
}

// ── SOURCES TAB ───────────────────────────────────────────────
function SourcesTab() {
  const [sources, setSources] = useState<NewsSource[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', feed_type: 'RSS', fetch_frequency: 'daily', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('bb_news_sources').select('*').order('name')
    if (data) setSources(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function toggle(source: NewsSource) {
    await supabase.from('bb_news_sources').update({ is_active: !source.is_active, updated_at: new Date().toISOString() }).eq('id', source.id)
    setSources(s => s.map(x => x.id === source.id ? { ...x, is_active: !x.is_active } : x))
  }

  async function remove(id: string) {
    if (!confirm('Remove this source?')) return
    await supabase.from('bb_news_sources').delete().eq('id', id)
    setSources(s => s.filter(x => x.id !== id))
  }

  async function add() {
    if (!form.name.trim() || !form.url.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('bb_news_sources').insert({
      name: form.name, url: form.url, feed_type: form.feed_type,
      fetch_frequency: form.fetch_frequency, is_active: true,
      notes: form.notes || null, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }).select().single()
    if (data && !error) { setSources(s => [...s, data].sort((a,b) => a.name.localeCompare(b.name))); setForm({ name: '', url: '', feed_type: 'RSS', fetch_frequency: 'daily', notes: '' }); setAdding(false) }
    setSaving(false)
  }

  const active = sources.filter(s => s.is_active).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <SectionTitle>News sources</SectionTitle>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -10 }}>{active} active · {sources.length} total · n8n fetches active sources daily</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={load} small><RefreshCw size={12} /> Refresh</Btn>
          <Btn variant="teal" onClick={() => setAdding(a => !a)} small><Plus size={12} /> Add source</Btn>
        </div>
      </div>

      {adding && (
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <Input placeholder="Source name" value={form.name} onChange={v => setForm(f => ({...f, name: v}))} />
            <Input placeholder="RSS feed URL" value={form.url} onChange={v => setForm(f => ({...f, url: v}))} />
            <Select value={form.feed_type} onChange={v => setForm(f => ({...f, feed_type: v}))} options={[{value:'RSS',label:'RSS'},{value:'Atom',label:'Atom'},{value:'API',label:'API'}]} />
            <Select value={form.fetch_frequency} onChange={v => setForm(f => ({...f, fetch_frequency: v}))} options={[{value:'daily',label:'Daily'},{value:'twice_daily',label:'Twice daily'},{value:'hourly',label:'Hourly'}]} />
            <div style={{ gridColumn: '1/-1' }}><Input placeholder="Notes (optional)" value={form.notes} onChange={v => setForm(f => ({...f, notes: v}))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="teal" onClick={add} disabled={saving}>{saving ? 'Saving...' : 'Add source'}</Btn>
            <Btn onClick={() => setAdding(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>Loading sources...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: adding ? 12 : 0 }}>
          {sources.map(source => (
            <div key={source.id} style={{ background: 'var(--bg-mid)', border: `1px solid ${source.is_active ? 'var(--border)' : 'rgba(255,255,255,0.04)'}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: source.is_active ? 1 : 0.5 }}>
              <button onClick={() => toggle(source)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: source.is_active ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', padding: 0 }}>
                {source.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{source.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{source.url}</div>
              </div>
              <Tag label={source.feed_type} color={'var(--accent)'} />
              <Tag label={source.fetch_frequency} color={'var(--text-muted)'} />
              <a href={source.url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', display: 'flex' }}><ExternalLink size={14} /></a>
              <button onClick={() => remove(source.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const KANBAN_COLS = [
  { status: 'Fetched',   label: 'Queue',     color: 'var(--text-muted)' },
  { status: 'AI_Drafted', label: 'Drafted',  color: PURPLE },
  { status: 'Approved',  label: 'Scheduled', color: GREEN },
  { status: 'Published', label: 'Posted',    color: 'var(--accent)' },
] as const

// ── QUEUE TAB ─────────────────────────────────────────────────
function QueueTab({ onApprove, onSaveAndGenerate }: { onApprove: (article: IncomingArticle) => void; onSaveAndGenerate: (article: IncomingArticle) => void }) {
  const [articlesByStatus, setArticlesByStatus] = useState<Record<string, IncomingArticle[]>>({})
  const [loading, setLoading] = useState(true)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; fromStatus: string } | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [inlineDraft, setInlineDraft] = useState('')
  const [inlineDate, setInlineDate] = useState('')
  const [inlineTime, setInlineTime] = useState('09:00')
  const [inlineScheduling, setInlineScheduling] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const [manualTitle, setManualTitle] = useState('')
  const [manualSummary, setManualSummary] = useState('')
  const [manualPost, setManualPost] = useState('')
  const [manualProfile, setManualProfile] = useState<'femi' | 'bl_accountant' | 'bl_sme'>('femi')
  const [saving, setSaving] = useState(false)
  const [savingAndGenerating, setSavingAndGenerating] = useState(false)
  const [manualError, setManualError] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('bb_incoming_articles').select('*')
      .not('status', 'eq', 'Rejected').order('fetched_at', { ascending: false }).limit(200)
    if (data) {
      const grouped: Record<string, IncomingArticle[]> = { Fetched: [], AI_Drafted: [], Approved: [], Published: [] }
      data.forEach(a => {
        const key = a.status === 'Ready_for_Review' ? 'AI_Drafted' : a.status
        if (grouped[key]) grouped[key].push(a)
      })
      setArticlesByStatus(grouped)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  function handleDragStart(article: IncomingArticle, e: React.DragEvent) {
    e.dataTransfer.effectAllowed = 'move'
    const col = article.status === 'Ready_for_Review' ? 'AI_Drafted' : article.status
    setDragging({ id: article.id, fromStatus: col })
  }

  function handleDragOver(e: React.DragEvent, status: string) {
    e.preventDefault()
    setDragOver(status)
  }

  async function handleDrop(e: React.DragEvent, toStatus: string) {
    e.preventDefault()
    setDragOver(null)
    if (!dragging || dragging.fromStatus === toStatus) { setDragging(null); return }
    const article = (articlesByStatus[dragging.fromStatus] || []).find(a => a.id === dragging.id)
    if (!article) { setDragging(null); return }
    setArticlesByStatus(prev => ({
      ...prev,
      [dragging.fromStatus]: (prev[dragging.fromStatus] || []).filter(a => a.id !== dragging.id),
      [toStatus]: [{ ...article, status: toStatus }, ...(prev[toStatus] || [])],
    }))
    await supabase.from('bb_incoming_articles').update({ status: toStatus }).eq('id', dragging.id)
    if (toStatus === 'Approved') {
      setExpandedId(dragging.id)
      setInlineDraft(article.ai_rewrite || '')
      setInlineDate('')
      setInlineTime('09:00')
    }
    setDragging(null)
  }

  function handleDragEnd() { setDragging(null); setDragOver(null) }

  function openExpand(article: IncomingArticle) {
    setExpandedId(article.id)
    setInlineDraft(article.ai_rewrite || '')
    setInlineDate(article.scheduled_at ? article.scheduled_at.split('T')[0] : '')
    setInlineTime(article.scheduled_at ? (article.scheduled_at.split('T')[1] ?? '').slice(0, 5) || '09:00' : '09:00')
  }

  async function approveInline(article: IncomingArticle) {
    if (!inlineDate) return
    setInlineScheduling(true)
    const scheduledAt = new Date(`${inlineDate}T${inlineTime}:00`).toISOString()
    const postContent = inlineDraft.trim()
    const { error: err } = await supabase.from('bb_incoming_articles').update({
      ...(postContent ? { ai_rewrite: postContent } : {}),
      scheduled_at: scheduledAt,
      status: 'Approved',
    }).eq('id', article.id)
    if (!err) {
      setExpandedId(null)
      setArticlesByStatus(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(k => { next[k] = next[k].filter(a => a.id !== article.id) })
        next['Approved'] = [{ ...article, status: 'Approved', scheduled_at: scheduledAt, ai_rewrite: postContent || article.ai_rewrite }, ...next['Approved']]
        return next
      })
    }
    setInlineScheduling(false)
  }

  async function skipArticle(article: IncomingArticle) {
    const fromStatus = Object.keys(articlesByStatus).find(k => articlesByStatus[k].some(a => a.id === article.id)) || 'Fetched'
    setArticlesByStatus(prev => ({ ...prev, [fromStatus]: (prev[fromStatus] || []).filter(a => a.id !== article.id) }))
    await supabase.from('bb_incoming_articles').update({ status: 'Rejected' }).eq('id', article.id)
  }

  function resetManualForm() {
    setManualUrl(''); setManualTitle(''); setManualSummary(''); setManualPost(''); setManualProfile('femi'); setManualError('')
  }

  function extractDomain(url: string): string | null {
    try { return new URL(url).hostname.replace('www.', '') } catch { return null }
  }

  async function insertManualArticle(): Promise<IncomingArticle | null> {
    if (!manualTitle.trim()) { setManualError('Article title is required'); return null }
    setManualError('')
    const now = new Date().toISOString()
    const url = manualUrl.trim() || `manual://${Date.now()}`
    const { data, error } = await supabase.from('bb_incoming_articles').insert({
      original_title: manualTitle.trim(),
      original_url: url,
      original_excerpt: manualSummary.trim() || null,
      ai_summary: manualSummary.trim() || null,
      ai_rewrite: manualPost.trim() || null,
      fetched_at: now,
      status: manualPost.trim() ? 'AI_Drafted' : 'Fetched',
      profile_target: manualProfile,
      source_id: null,
      created_at: now,
    }).select().single()
    if (error || !data) { setManualError(error?.message || 'Failed to save article'); return null }
    return data as IncomingArticle
  }

  async function handleSaveToQueue() {
    setSaving(true)
    const article = await insertManualArticle()
    if (article) {
      const col = article.status === 'AI_Drafted' ? 'AI_Drafted' : 'Fetched'
      setArticlesByStatus(prev => ({ ...prev, [col]: [article, ...(prev[col] || [])] }))
      resetManualForm(); setShowManualForm(false)
    }
    setSaving(false)
  }

  async function handleSaveAndGenerate() {
    setSavingAndGenerating(true)
    const article = await insertManualArticle()
    if (article) { resetManualForm(); setShowManualForm(false); onSaveAndGenerate(article) }
    setSavingAndGenerating(false)
  }

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    Object.values(articlesByStatus).flat().forEach(a => extractTags(a.original_title, a.ai_summary).forEach(t => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [articlesByStatus])

  const totalCount = Object.values(articlesByStatus).flat().length
  const domainHint = manualUrl.trim() ? extractDomain(manualUrl.trim()) : null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <SectionTitle>Story pipeline</SectionTitle>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -10 }}>{totalCount} stories · drag cards between stages</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={loadAll} small><RefreshCw size={12} /> Refresh</Btn>
          <Btn variant="teal" onClick={() => setShowManualForm(v => !v)} small><Plus size={12} /> Add story</Btn>
        </div>
      </div>

      {/* Manual form */}
      {showManualForm && (
        <div style={{ marginBottom: 20 }}>
          <Card accent="var(--accent)">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)' }}>Add story</label>
              <button onClick={() => { setShowManualForm(false); resetManualForm() }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}><Input value={manualUrl} onChange={setManualUrl} placeholder="Article URL (optional)" /></div>
                {manualUrl.trim() && extractDomain(manualUrl.trim()) && (
                  <a href={manualUrl.trim()} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', flexShrink: 0 }}><ExternalLink size={14} /></a>
                )}
              </div>
              <div>
                <Input value={manualTitle} onChange={setManualTitle} placeholder="Headline or topic *" />
                {domainHint && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Source: {domainHint}</p>}
              </div>
              <textarea value={manualSummary} onChange={e => setManualSummary(e.target.value)} placeholder="Context — helps AI write a better draft" rows={2} style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6 }} />
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>Write your own post (optional)</label>
                <textarea value={manualPost} onChange={e => setManualPost(e.target.value)} placeholder="Write your LinkedIn post here — saves straight to Drafted column, ready to approve." rows={5} style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6 }} />
                {manualPost.trim() && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{manualPost.length} chars</p>}
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Profile</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(Object.entries(PROFILE_LABELS) as [string, { label: string; color: string; desc: string }][]).map(([key, p]) => (
                    <button key={key} onClick={() => setManualProfile(key as typeof manualProfile)} style={{
                      background: manualProfile === key ? p.color + '15' : 'var(--bg-card)',
                      border: `1.5px solid ${manualProfile === key ? p.color : 'var(--border)'}`,
                      borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 12, fontWeight: 600, color: manualProfile === key ? p.color : 'var(--text-muted)',
                    }}>{p.label}</button>
                  ))}
                </div>
              </div>
              {manualError && <div style={{ padding: '8px 12px', background: RED_BG, border: `1px solid ${RED}33`, borderRadius: 8, fontSize: 12, color: RED }}>{manualError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="ghost" onClick={handleSaveToQueue} disabled={saving || savingAndGenerating}>{saving ? 'Saving...' : 'Save to queue'}</Btn>
                <Btn variant="teal" onClick={handleSaveAndGenerate} disabled={saving || savingAndGenerating}><Zap size={12} />{savingAndGenerating ? 'Saving...' : 'Save & AI draft'}</Btn>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tag filter */}
      {!loading && allTags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Topic:</span>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)} style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit',
              background: tagFilter === tag ? (TOPIC_TAG_COLORS[tag] || 'var(--accent)') + '33' : 'var(--bg-mid)',
              border: `1.5px solid ${tagFilter === tag ? (TOPIC_TAG_COLORS[tag] || 'var(--accent)') : 'var(--border)'}`,
              color: tagFilter === tag ? (TOPIC_TAG_COLORS[tag] || 'var(--accent)') : 'var(--text-muted)',
            }}>{tag}</button>
          ))}
          {tagFilter && <button onClick={() => setTagFilter(null)} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>× Clear</button>}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, alignItems: 'start' }}>
          {KANBAN_COLS.map(col => {
            const colArticles = (articlesByStatus[col.status] || [])
              .filter(a => !tagFilter || extractTags(a.original_title, a.ai_summary).includes(tagFilter))
            const isOver = dragOver === col.status
            return (
              <div
                key={col.status}
                onDragOver={e => handleDragOver(e, col.status)}
                onDrop={e => handleDrop(e, col.status)}
                onDragLeave={() => setDragOver(null)}
                style={{
                  background: isOver ? col.color + '11' : 'var(--bg-mid)',
                  border: `1.5px solid ${isOver ? col.color + '88' : 'var(--border)'}`,
                  borderTop: `3px solid ${col.color}`,
                  borderRadius: 10,
                  minHeight: 300,
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ padding: '12px 14px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: col.color }}>{col.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 99 }}>{colArticles.length}</span>
                </div>

                <div style={{ padding: '0 8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {colArticles.length === 0 && (
                    <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, opacity: 0.5 }}>
                      {isOver ? '↓ Drop here' : 'Empty'}
                    </div>
                  )}
                  {colArticles.map(article => {
                    const tags = extractTags(article.original_title, article.ai_summary)
                    const isExpanded = expandedId === article.id
                    const isDraggingThis = dragging?.id === article.id
                    return (
                      <div
                        key={article.id}
                        draggable
                        onDragStart={e => handleDragStart(article, e)}
                        onDragEnd={handleDragEnd}
                        style={{
                          background: 'var(--bg-card)',
                          border: `1px solid ${isExpanded ? col.color + '66' : 'var(--border)'}`,
                          borderRadius: 8, padding: 12,
                          cursor: isExpanded ? 'default' : (isDraggingThis ? 'grabbing' : 'grab'),
                          opacity: isDraggingThis ? 0.35 : 1,
                          transition: 'opacity 0.12s',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 8 }}>
                          {article.original_title}
                        </div>

                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                          {article.profile_target && (
                            <Tag label={PROFILE_LABELS[article.profile_target]?.label || article.profile_target} color={PROFILE_LABELS[article.profile_target]?.color || 'var(--text-muted)'} />
                          )}
                          {tags.map(tag => (
                            <span key={tag} style={{
                              fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                              padding: '2px 6px', borderRadius: 99,
                              background: (TOPIC_TAG_COLORS[tag] || 'var(--text-muted)') + '22',
                              color: TOPIC_TAG_COLORS[tag] || 'var(--text-muted)',
                            }}>{tag}</span>
                          ))}
                        </div>

                        {article.ai_rewrite && !isExpanded && (
                          <p style={{ fontSize: 11, color: 'var(--text-primary)', opacity: 0.55, lineHeight: 1.5, marginBottom: 8, whiteSpace: 'pre-wrap' }}>
                            {article.ai_rewrite.substring(0, 110)}{article.ai_rewrite.length > 110 ? '…' : ''}
                          </p>
                        )}

                        {col.status === 'Approved' && article.scheduled_at && !isExpanded && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: GREEN, marginBottom: 8 }}>
                            <Clock size={10} />
                            {new Date(article.scheduled_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}

                        {isExpanded && (
                          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                            <textarea
                              value={inlineDraft}
                              onChange={e => setInlineDraft(e.target.value)}
                              rows={6}
                              placeholder="Write your LinkedIn post here…"
                              style={{ width: '100%', background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', padding: '8px 10px', fontSize: 12, outline: 'none', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6, marginBottom: 8 }}
                            />
                            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                              <input type="date" value={inlineDate} onChange={e => setInlineDate(e.target.value)} style={{ flex: 1, background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', padding: '6px 8px', fontSize: 11, outline: 'none', fontFamily: 'inherit' }} />
                              <input type="time" value={inlineTime} onChange={e => setInlineTime(e.target.value)} style={{ width: 78, background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', padding: '6px 8px', fontSize: 11, outline: 'none', fontFamily: 'inherit' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <Btn variant="teal" onClick={() => approveInline(article)} disabled={!inlineDate || inlineScheduling} small>
                                <CheckCircle size={11} />{inlineScheduling ? 'Saving…' : 'Approve'}
                              </Btn>
                              <Btn variant="ghost" onClick={() => setExpandedId(null)} small disabled={inlineScheduling}>Cancel</Btn>
                            </div>
                          </div>
                        )}

                        {!isExpanded && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                            {col.status === 'Fetched' && (
                              <Btn variant="teal" onClick={() => onApprove(article)} small><Zap size={11} /> AI draft</Btn>
                            )}
                            <Btn variant="ghost" onClick={() => openExpand(article)} small>
                              <Send size={11} /> {article.ai_rewrite ? 'Edit & approve' : 'Write & approve'}
                            </Btn>
                            <button onClick={() => skipArticle(article)} title="Remove" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 6px', display: 'flex', alignItems: 'center', borderRadius: 4 }}>
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── STUDIO TAB ────────────────────────────────────────────────
function StudioTab({ article, onScheduled }: { article: IncomingArticle | null; onScheduled: () => void }) {
  const [profile, setProfile] = useState<'femi'|'bl_accountant'|'bl_sme'>('femi')
  const [framework, setFramework] = useState<'auto'|'slay'|'pas'>('auto')
  const [previousPost, setPreviousPost] = useState('')
  const [draft, setDraft] = useState(article?.ai_rewrite || '')
  const [generating, setGenerating] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [scheduling, setScheduling] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const [error, setError] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageLoading, setImageLoading] = useState(false)
  const [imageCopied, setImageCopied] = useState(false)
  const [draftCopied, setDraftCopied] = useState(false)

  useEffect(() => {
    if (article?.ai_rewrite) setDraft(article.ai_rewrite)
  }, [article])

  useEffect(() => { setCharCount(draft.length) }, [draft])

  async function generateImage(regenerate = false) {
    if (!article) return
    setImageLoading(true)
    setError('')
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: article.id,
          title: article.original_title,
          summary: article.ai_summary || '',
          profile_target: profile,
          regenerate,
        })
      })
      if (!res.ok) throw new Error(`Image generation returned ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.image_url) {
        setImageUrl(data.image_url)
        setImagePrompt(data.image_prompt || '')
      } else {
        setError('Image generation failed')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Image generation failed')
    }
    setImageLoading(false)
  }

  function copyPrompt() {
    navigator.clipboard.writeText(imagePrompt)
    setImageCopied(true)
    setTimeout(() => setImageCopied(false), 2000)
  }

  async function generate(differentAngle = false) {
    if (!article) return
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: article.id,
          profile_target: profile,
          previous_post: previousPost || null,
          framework,
          different_angle: differentAngle,
        })
      })
      if (!res.ok) throw new Error(`Draft generation returned ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.draft) setDraft(data.draft)
      else setError('Draft generation failed')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    }
    setGenerating(false)
  }

  async function schedule() {
    if (!article || !draft.trim() || !scheduleDate) return
    setScheduling(true)
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString()
    const { error: err } = await supabase.from('bb_incoming_articles').update({
      ai_rewrite: draft,
      profile_target: profile,
      scheduled_at: scheduledAt,
      previous_post_context: previousPost || null,
      status: 'Approved',
      ...(imageUrl ? { generated_image_url: imageUrl } : {}),
    }).eq('id', article.id)
    if (!err) { onScheduled(); setDraft(''); setPreviousPost(''); setScheduleDate('') }
    else setError('Failed to schedule post')
    setScheduling(false)
  }

  if (!article) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
      <Zap size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
      <p style={{ fontSize: 14 }}>Select a story from the queue to draft a post</p>
      <p style={{ fontSize: 12, marginTop: 6 }}>Click &quot;Generate draft&quot; on any Fetched story</p>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
      <div>
        <SectionTitle>Rewrite studio</SectionTitle>
        <Card>
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
            <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Story</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{article.original_title}</div>
            {article.ai_summary && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{article.ai_summary}</div>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Post profile</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(PROFILE_LABELS).map(([key, p]) => (
                <button key={key} onClick={() => setProfile(key as typeof profile)} style={{ background: profile === key ? p.color + '15' : 'var(--bg-card)', border: `1.5px solid ${profile === key ? p.color : 'var(--border)'}`, borderRadius: 8, padding: '10px 14px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: profile === key ? p.color : 'var(--text-muted)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Post framework</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {([
                { value: 'auto' as const, label: 'Auto-detect' },
                { value: 'slay' as const, label: 'SLAY' },
                { value: 'pas' as const, label: 'PAS' },
              ]).map(fw => (
                <button key={fw.value} onClick={() => setFramework(fw.value)} style={{
                  flex: 1, padding: '8px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1.5px solid ${framework === fw.value ? 'var(--accent)' : 'var(--border)'}`,
                  background: framework === fw.value ? 'var(--accent)' + '15' : 'var(--bg-card)',
                  color: framework === fw.value ? 'var(--accent)' : 'var(--text-muted)',
                }}>{fw.label}</button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              {framework === 'slay' ? 'Story \u2192 Lesson \u2192 Actionable \u2192 You' : framework === 'pas' ? 'Problem \u2192 Agitate \u2192 Solution' : 'Claude picks the best framework for the content'}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Previous post context (optional)</label>
            <textarea value={previousPost} onChange={e => setPreviousPost(e.target.value)} placeholder="Paste your most recent post here. Claude will write this as a natural follow-up..." rows={4} style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '10px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6 }} />
          </div>

          <Btn variant="teal" onClick={() => generate()} disabled={generating}>
            <Zap size={14} />{generating ? 'Generating...' : 'Generate draft'}
          </Btn>
        </Card>

        {(draft || generating) && (
          <div style={{ marginTop: 16 }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Draft post</label>
                <span style={{ fontSize: 11, color: charCount > 3000 ? RED : charCount > 2500 ? AMBER : 'var(--text-muted)' }}>{charCount} chars {charCount > 3000 ? '(too long)' : ''}</span>
              </div>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={16} placeholder={generating ? 'Generating...' : 'Draft will appear here...'} style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', padding: '12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.7 }} />
              {draft && !generating && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Btn variant="ghost" onClick={() => { navigator.clipboard.writeText(draft); setDraftCopied(true); setTimeout(() => setDraftCopied(false), 2000) }} small>
                    <Copy size={12} /> {draftCopied ? 'Copied!' : 'Copy to clipboard'}
                  </Btn>
                  <Btn variant="ghost" onClick={() => generate(true)} small>
                    <RefreshCw size={12} /> Regenerate — different angle
                  </Btn>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Image Panel */}
        <div style={{ marginTop: 16 }}>
          <Card>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 12 }}>Article image</label>
            {imageLoading ? (
              <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>Generating image... ~20 seconds</div>
              </div>
            ) : imageUrl ? (
              <div>
                <img src={imageUrl} alt="Generated article image" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, display: 'block', marginBottom: 12 }} />
                {imagePrompt && <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>{imagePrompt}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant="ghost" onClick={() => generateImage(true)} small><RefreshCw size={12} /> Regenerate</Btn>
                  <Btn variant="ghost" onClick={copyPrompt} small><Copy size={12} /> {imageCopied ? 'Copied!' : 'Copy prompt'}</Btn>
                  <Btn variant="danger" onClick={() => { setImageUrl(''); setImagePrompt('') }} small><XCircle size={12} /> Remove</Btn>
                </div>
              </div>
            ) : (
              <div style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: '32px 20px', textAlign: 'center' }}>
                <ImageIcon size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>No image — post will be text-only</p>
                <Btn variant="teal" onClick={() => generateImage(false)} small><Zap size={12} /> Generate image</Btn>
              </div>
            )}
          </Card>
        </div>

        {error && <div style={{ marginTop: 12, padding: '10px 14px', background: RED_BG, border: `1px solid ${RED}33`, borderRadius: 8, fontSize: 12, color: RED }}>{error}</div>}
      </div>

      <div>
        <SectionTitle>Schedule</SectionTitle>
        <Card>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Date</label>
            <Input type="date" value={scheduleDate} onChange={setScheduleDate} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Time</label>
            <Input type="time" value={scheduleTime} onChange={setScheduleTime} />
          </div>
          <div style={{ marginBottom: 20, padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Posting as</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: PROFILE_LABELS[profile]?.color || 'var(--accent)' }}>{PROFILE_LABELS[profile]?.label}</div>
          </div>
          <Btn variant="teal" onClick={schedule} disabled={!draft.trim() || !scheduleDate || scheduling}>
            <Calendar size={14} />{scheduling ? 'Scheduling...' : 'Approve & schedule'}
          </Btn>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>n8n checks hourly and posts at the scheduled time via LinkedIn API</p>
        </Card>

        <div style={{ marginTop: 16 }}>
          <Card>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Best posting times</div>
            {[['Tuesday', '8–9am'], ['Wednesday', '12–1pm'], ['Thursday', '5–6pm']].map(([day, time]) => (
              <div key={day} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{day}</span>
                <span style={{ fontSize: 12, color: 'var(--accent)' }}>{time}</span>
              </div>
            ))}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Based on UK LinkedIn engagement data</p>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── SCHEDULED TAB ─────────────────────────────────────────────
function ScheduledTab() {
  const [posts, setPosts] = useState<IncomingArticle[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('bb_incoming_articles')
      .select('*').eq('status', 'Approved').is('posted_at', null)
      .order('scheduled_at', { ascending: true })
    if (data) setPosts(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function unschedule(id: string) {
    if (!confirm('Remove this post from the schedule?')) return
    await supabase.from('bb_incoming_articles').update({ status: 'AI_Drafted', scheduled_at: null, profile_target: null }).eq('id', id)
    setPosts(p => p.filter(x => x.id !== id))
  }

  const now = new Date()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <SectionTitle>Scheduled posts</SectionTitle>
        <Btn variant="ghost" onClick={load} small><RefreshCw size={12} /> Refresh</Btn>
      </div>
      {loading ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</p> :
        posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <Calendar size={28} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>No posts scheduled</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>Generate and approve a draft to schedule it</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {posts.map(post => {
              const scheduledAt = post.scheduled_at ? new Date(post.scheduled_at) : null
              const isDue = scheduledAt && scheduledAt <= now
              return (
                <div key={post.id} style={{ background: 'var(--bg-mid)', border: `1px solid ${isDue ? GREEN + '44' : 'var(--border)'}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{post.original_title}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {post.profile_target && <Tag label={PROFILE_LABELS[post.profile_target]?.label || post.profile_target} color={PROFILE_LABELS[post.profile_target]?.color || 'var(--text-muted)'} />}
                        {scheduledAt && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: isDue ? GREEN : AMBER }}>
                            <Clock size={11} />
                            {isDue ? 'Due now — n8n will post next run' : scheduledAt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </div>
                    <Btn variant="danger" onClick={() => unschedule(post.id)} small><XCircle size={11} /> Unschedule</Btn>
                  </div>
                  {post.ai_rewrite && (
                    <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--text-primary)', opacity: 0.7, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {post.ai_rewrite.substring(0, 250)}{post.ai_rewrite.length > 250 ? '...' : ''}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}

// ── ROOT PAGE ─────────────────────────────────────────────────
export default function ContentPage() {
  const [tab, setTab] = useState<'queue'|'studio'|'scheduled'|'sources'|'calendar'>('queue')
  const [studioArticle, setStudioArticle] = useState<IncomingArticle | null>(null)

  // Calendar tab state
  const [calendarItems, setCalendarItems] = useState<ContentCalendarItem[]>([])
  const [calendarComments, setCalendarComments] = useState<Comment[]>([])
  const [calFilters, setCalFilters] = useState<Record<string, string[]>>({})
  const [calSelectedItem, setCalSelectedItem] = useState<ContentCalendarItem | null>(null)
  const [calView, setCalView] = useState('table')
  const [calLoading, setCalLoading] = useState(false)

  // Calendar data fetching
  const loadCalendarItems = useCallback(async () => {
    setCalLoading(true)
    const { data } = await supabase
      .from('bl_content_calendar')
      .select('*')
      .order('publish_date')
    if (data) setCalendarItems(data)
    setCalLoading(false)
  }, [])

  const loadCalendarComments = useCallback(async () => {
    const { data } = await supabase
      .from('bl_comments')
      .select('*')
      .eq('entity_type', 'content_calendar')
    if (data) setCalendarComments(data)
  }, [])

  useEffect(() => {
    if (tab === 'calendar') {
      loadCalendarItems()
      loadCalendarComments()
    }
  }, [tab, loadCalendarItems, loadCalendarComments])

  // Calendar CRUD
  const calUpdate = useCallback(async (id: string, updates: Partial<ContentCalendarItem>) => {
    await supabase.from('bl_content_calendar').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
    setCalendarItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
    if (calSelectedItem?.id === id) {
      setCalSelectedItem(prev => prev ? { ...prev, ...updates } : prev)
    }
  }, [calSelectedItem])

  const calDelete = useCallback(async (id: string) => {
    await supabase.from('bl_content_calendar').delete().eq('id', id)
    setCalendarItems(prev => prev.filter(item => item.id !== id))
    if (calSelectedItem?.id === id) setCalSelectedItem(null)
  }, [calSelectedItem])

  const calCreate = useCallback(async () => {
    const now = new Date().toISOString()
    const { data } = await supabase.from('bl_content_calendar').insert({
      week: 1,
      publish_date: new Date().toISOString().split('T')[0],
      day: new Date().toLocaleDateString('en-GB', { weekday: 'long' }),
      channel: 'LinkedIn Post',
      format: 'Text Post',
      pillar: '',
      topic: 'New post',
      key_message: null,
      cta: null,
      script_draft: null,
      status: 'To Draft',
      performance: null,
      notes: null,
      source: 'manual',
      created_at: now,
      updated_at: now,
    }).select().single()
    if (data) {
      setCalendarItems(prev => [...prev, data])
      setCalSelectedItem(data)
    }
  }, [])

  const calSeed = useCallback(async () => {
    const now = new Date().toISOString()
    const rows = SEED_CONTENT_CALENDAR.map(item => ({
      ...item,
      created_at: now,
      updated_at: now,
    }))
    const { data } = await supabase.from('bl_content_calendar').insert(rows).select()
    if (data) setCalendarItems(data)
  }, [])

  // Calendar filter logic
  const calFilterDefs = useMemo(() => {
    const weeks = Array.from(new Set(calendarItems.map(i => String(i.week)))).sort()
    const pillars = Array.from(new Set(calendarItems.map(i => i.pillar))).filter(Boolean).sort()
    const channels = Array.from(new Set(calendarItems.map(i => i.channel))).filter(Boolean).sort()
    const formats = Array.from(new Set(calendarItems.map(i => i.format))).filter(Boolean).sort()
    const statuses = Array.from(new Set(calendarItems.map(i => i.status))).sort()
    return [
      { key: 'week', label: 'Week', options: weeks },
      { key: 'pillar', label: 'Pillar', options: pillars },
      { key: 'channel', label: 'Channel', options: channels },
      { key: 'format', label: 'Format', options: formats },
      { key: 'status', label: 'Status', options: statuses },
    ]
  }, [calendarItems])

  const filteredCalendarItems = useMemo(() => {
    return calendarItems.filter(item => {
      for (const [key, values] of Object.entries(calFilters)) {
        if (values.length === 0) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itemVal = key === 'week' ? String(item.week) : String((item as any)[key] ?? '')
        if (!values.includes(itemVal)) return false
      }
      return true
    })
  }, [calendarItems, calFilters])

  // Calendar KPIs
  const calKpis = useMemo(() => {
    const total = calendarItems.length
    const counts: Record<string, number> = {}
    CAL_STATUSES.forEach(s => { counts[s] = 0 })
    calendarItems.forEach(item => { counts[item.status] = (counts[item.status] || 0) + 1 })
    return [
      { label: 'Total Posts', value: total, color: 'var(--accent)' },
      ...CAL_STATUSES.map(s => ({
        label: s,
        value: counts[s],
        color: CAL_STATUS_COLORS[s],
      })),
    ]
  }, [calendarItems])

  // Open in Studio handler
  const handleOpenInStudio = useCallback((calItem: ContentCalendarItem) => {
    // Create a synthetic article from the calendar item to pre-fill the studio
    const syntheticArticle: IncomingArticle = {
      id: calItem.id,
      source_id: null,
      original_title: calItem.topic,
      original_url: `calendar://${calItem.id}`,
      original_excerpt: calItem.key_message || null,
      ai_summary: calItem.key_message || null,
      ai_key_points: null,
      ai_rewrite: calItem.script_draft || null,
      profile_target: null,
      status: 'Fetched',
      fetched_at: calItem.created_at,
      created_at: calItem.created_at,
      scheduled_at: null,
      posted_at: null,
      linkedin_post_id: null,
      previous_post_context: null,
    }
    setStudioArticle(syntheticArticle)
    setCalSelectedItem(null)
    setTab('studio')
  }, [])

  function handleApprove(article: IncomingArticle) {
    setStudioArticle(article)
    setTab('studio')
  }

  function handleSaveAndGenerate(article: IncomingArticle) {
    setStudioArticle(article)
    setTab('studio')
  }

  function handleScheduled() {
    setTab('scheduled')
    setStudioArticle(null)
  }

  const tabs: { key: typeof tab; label: string; icon: React.ReactNode }[] = [
    { key: 'queue',     label: 'Story queue',    icon: <RefreshCw size={14} /> },
    { key: 'studio',    label: 'Draft studio',   icon: <Zap size={14} /> },
    { key: 'scheduled', label: 'Scheduled',      icon: <Calendar size={14} /> },
    { key: 'sources',   label: 'Sources',        icon: <ExternalLink size={14} /> },
    { key: 'calendar',  label: 'Calendar',       icon: <Calendar size={14} /> },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-mid)', padding: 4, borderRadius: 10, width: 'fit-content', border: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: tab === t.key ? 'var(--bg-card)' : 'transparent',
            border: tab === t.key ? '1px solid var(--border)' : '1px solid transparent',
            borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
          }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'queue'     && <QueueTab onApprove={handleApprove} onSaveAndGenerate={handleSaveAndGenerate} />}
        {tab === 'studio'    && <StudioTab article={studioArticle} onScheduled={handleScheduled} />}
        {tab === 'scheduled' && <ScheduledTab />}
        {tab === 'sources'   && <SourcesTab />}
        {tab === 'calendar'  && (
          <div>
            {/* KPI Bar */}
            <div style={{ marginBottom: 16 }}>
              <KpiBar items={calKpis} />
            </div>

            {/* Controls: ViewToggle + FilterBar + Add Post */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
                <ViewToggle
                  storageKey="cal-view"
                  defaultView="table"
                  onViewChange={setCalView}
                  views={[
                    {
                      key: 'table',
                      label: 'Table',
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <rect x="1" y="1" width="12" height="3" rx="0.5" fill="currentColor" opacity="0.7" />
                          <rect x="1" y="5.5" width="12" height="3" rx="0.5" fill="currentColor" opacity="0.5" />
                          <rect x="1" y="10" width="12" height="3" rx="0.5" fill="currentColor" opacity="0.3" />
                        </svg>
                      ),
                    },
                    {
                      key: 'calendar',
                      label: 'Calendar',
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
                          <line x1="1" y1="5" x2="13" y2="5" stroke="currentColor" strokeWidth="1" />
                          <line x1="4.5" y1="2" x2="4.5" y2="0.5" stroke="currentColor" strokeWidth="1" />
                          <line x1="9.5" y1="2" x2="9.5" y2="0.5" stroke="currentColor" strokeWidth="1" />
                        </svg>
                      ),
                    },
                    {
                      key: 'kanban',
                      label: 'Kanban',
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <rect x="0.5" y="1" width="3.5" height="12" rx="0.5" fill="currentColor" opacity="0.7" />
                          <rect x="5.25" y="1" width="3.5" height="8" rx="0.5" fill="currentColor" opacity="0.5" />
                          <rect x="10" y="1" width="3.5" height="10" rx="0.5" fill="currentColor" opacity="0.3" />
                        </svg>
                      ),
                    },
                  ]}
                />
                <FilterBar
                  filters={calFilterDefs}
                  activeFilters={calFilters}
                  onFilterChange={(key, values) => setCalFilters(prev => ({ ...prev, [key]: values }))}
                  onClearAll={() => setCalFilters({})}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ExportButton
                  data={filteredCalendarItems}
                  columns={[
                    { key: 'week', label: 'Week' },
                    { key: 'publish_date', label: 'Date' },
                    { key: 'day', label: 'Day' },
                    { key: 'channel', label: 'Channel' },
                    { key: 'pillar', label: 'Pillar' },
                    { key: 'topic', label: 'Topic' },
                    { key: 'status', label: 'Status' },
                  ]}
                  filename="content-calendar-export"
                  title="Content Calendar Report"
                  comments={calendarComments}
                  entityType="content_calendar"
                />
                <UploadButton entityType="content_calendar" onImportComplete={loadCalendarItems} />
                <SyncSettings entityType="content_calendar" onSyncComplete={loadCalendarItems} />
                <button
                  onClick={calCreate}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    background: 'var(--accent)',
                    color: 'var(--bg-primary)',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <Plus size={14} /> Add Post
                </button>
              </div>
            </div>

            {/* Main view */}
            {calLoading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>Loading calendar...</p>
            ) : calView === 'table' ? (
              <CalendarTable
                items={filteredCalendarItems}
                onSelect={setCalSelectedItem}
                onUpdate={calUpdate}
              />
            ) : calView === 'calendar' ? (
              <CalendarGrid
                items={filteredCalendarItems}
                onSelect={setCalSelectedItem}
                onUpdate={calUpdate}
              />
            ) : calView === 'kanban' ? (
              <CalendarKanban
                items={filteredCalendarItems}
                onSelect={setCalSelectedItem}
                onUpdate={calUpdate}
              />
            ) : null}

            {/* Seed button if no items */}
            {!calLoading && calendarItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <button
                  onClick={calSeed}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--bg-mid)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Seed sample calendar data
                </button>
              </div>
            )}

            {/* Detail panel overlay */}
            {calSelectedItem && (
              <CalendarDetail
                item={calSelectedItem}
                comments={calendarComments}
                onUpdate={calUpdate}
                onDelete={calDelete}
                onClose={() => setCalSelectedItem(null)}
                onRefreshComments={loadCalendarComments}
                onOpenInStudio={handleOpenInStudio}
              />
            )}
          </div>
        )}
      </div>

    </div>
  )
}
