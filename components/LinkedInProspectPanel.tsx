'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  X,
  Search,
  Plus,
  Linkedin,
  Building2,
  Link,
  Check,
  Loader2,
} from 'lucide-react'

interface LinkedInProspectPanelProps {
  onSaved: () => void
  onClose: () => void
}

interface CompanyResult {
  company_name: string
  company_number: string
  postcode: string | null
  region: string | null
  incorporation_date: string | null
  sic_codes: string[] | null
  company_status: string | null
}

interface Tag {
  id: string
  name: string
  category: string | null
}

const ACTION_TYPES = [
  'Connection Request',
  'Message Sent',
  'Follow-up Message',
  'Call Scheduled',
  'Call Completed',
  'Proposal Sent',
  'No Response',
  'Not Interested',
  'Note',
] as const

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  padding: '8px 12px',
  fontSize: 13,
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 80,
  resize: 'vertical',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--text-muted)',
  marginBottom: 12,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  marginBottom: 4,
  display: 'block',
}

export default function LinkedInProspectPanel({
  onSaved,
  onClose,
}: LinkedInProspectPanelProps) {
  const [tab, setTab] = useState<'manual' | 'companies-house' | 'linkedin-url'>('manual')
  const [form, setForm] = useState({
    name: '',
    company_name: '',
    job_title: '',
    linkedin_url: '',
    email: '',
    phone: '',
    type: 'SME',
    industry: '',
    postcode: '',
    company_number: '',
    region: '',
    incorporation_date: '',
    notes: '',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CompanyResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [firstAction, setFirstAction] = useState({ type: 'Connection Request', notes: '' })
  const [nextStep, setNextStep] = useState({ action: '', follow_up_date: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedCompanyNumber, setSelectedCompanyNumber] = useState<string | null>(null)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)

    supabase
      .from('prospect_tags')
      .select('*')
      .order('category, name')
      .then(({ data }) => {
        if (data) setAllTags(data as Tag[])
      })
  }, [])

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCompanySearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchError(null)
    setSearchResults([])
    try {
      const res = await fetch(
        `https://companyquery-production.up.railway.app/api/companies/search?q=${encodeURIComponent(searchQuery)}&limit=10`,
        {
          headers: { 'x-internal-key': 'REPLACE_WITH_INTERNAL_API_KEY' },
        }
      )
      if (!res.ok) throw new Error(`Search failed: ${res.status}`)
      const data: CompanyResult[] = await res.json()
      setSearchResults(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Search failed'
      setSearchError(message)
    } finally {
      setSearching(false)
    }
  }

  function selectCompany(result: CompanyResult) {
    setSelectedCompanyNumber(result.company_number)
    setForm((prev) => ({
      ...prev,
      company_name: result.company_name,
      company_number: result.company_number,
      postcode: result.postcode || '',
      region: result.region || '',
      incorporation_date: result.incorporation_date || '',
      industry: result.sic_codes ? result.sic_codes.join(', ') : '',
    }))
  }

  function handleLinkedInUrlChange(url: string) {
    updateForm('linkedin_url', url)
    if (url.includes('/in/')) {
      const match = url.match(/\/in\/([^/?]+)/)
      if (match) {
        const slug = match[1]
        const name = slug
          .split('-')
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
        updateForm('name', name)
      }
    } else if (url.includes('/company/')) {
      const match = url.match(/\/company\/([^/?]+)/)
      if (match) {
        const slug = match[1]
        const companyName = slug
          .split('-')
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
        updateForm('company_name', companyName)
      }
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }

  function getActionPlaceholder(): string {
    switch (firstAction.type) {
      case 'Connection Request':
        return 'Connection request note...'
      case 'Message Sent':
      case 'Follow-up Message':
        return 'Message summary...'
      default:
        return 'Note...'
    }
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          name: form.name || null,
          company_name: form.company_name || null,
          contact_name: form.job_title || null,
          email: form.email || null,
          phone_number: form.phone || null,
          linkedin_url: form.linkedin_url || null,
          business_type: form.type || null,
          industry: form.industry || null,
          postcode: form.postcode || null,
          region: form.region || null,
          company_number: form.company_number || null,
          incorporation_date: form.incorporation_date || null,
          notes: form.notes || null,
          status: 'Contacted',
          source: 'LinkedIn',
          next_action: nextStep.action || null,
          follow_up_date: nextStep.follow_up_date || null,
        })
        .select()
        .single()

      if (leadError) throw leadError
      if (!lead) throw new Error('No lead returned')

      if (firstAction.type) {
        await supabase.from('bl_lead_actions').insert({
          lead_id: lead.id,
          action_type: firstAction.type,
          notes: firstAction.notes || null,
          completed_at: new Date().toISOString(),
        })
      }

      const tagInserts = Array.from(selectedTagIds).map((tagId) => ({
        lead_id: lead.id,
        tag_id: tagId,
        added_at: new Date().toISOString(),
      }))
      if (tagInserts.length > 0) {
        await supabase.from('bl_crm_prospects_tags').insert(tagInserts)
      }

      onSaved()
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save prospect'
      setSaveError(message)
    } finally {
      setSaving(false)
    }
  }

  function renderFormFields(options: {
    showAll?: boolean
    showContactOnly?: boolean
  }) {
    const { showAll = false, showContactOnly = false } = options

    if (showContactOnly) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input
              style={inputStyle}
              placeholder="Contact name"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Job Title</label>
              <input
                style={inputStyle}
                placeholder="Job title"
                value={form.job_title}
                onChange={(e) => updateForm('job_title', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                style={inputStyle}
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>LinkedIn URL</label>
            <input
              style={inputStyle}
              placeholder="https://linkedin.com/in/..."
              value={form.linkedin_url}
              onChange={(e) => updateForm('linkedin_url', e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                style={inputStyle}
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select
                style={inputStyle}
                value={form.type}
                onChange={(e) => updateForm('type', e.target.value)}
              >
                <option value="SME">SME</option>
                <option value="Accountant">Accountant</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={textareaStyle}
              placeholder="Notes..."
              value={form.notes}
              onChange={(e) => updateForm('notes', e.target.value)}
            />
          </div>
        </div>
      )
    }

    if (showAll) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input
              style={inputStyle}
              placeholder="Contact name"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Company Name</label>
              <input
                style={inputStyle}
                placeholder="Company name"
                value={form.company_name}
                onChange={(e) => updateForm('company_name', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Job Title</label>
              <input
                style={inputStyle}
                placeholder="Job title"
                value={form.job_title}
                onChange={(e) => updateForm('job_title', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>LinkedIn URL</label>
            <input
              style={inputStyle}
              placeholder="https://linkedin.com/in/..."
              value={form.linkedin_url}
              onChange={(e) => updateForm('linkedin_url', e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                style={inputStyle}
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                style={inputStyle}
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Type</label>
              <select
                style={inputStyle}
                value={form.type}
                onChange={(e) => updateForm('type', e.target.value)}
              >
                <option value="SME">SME</option>
                <option value="Accountant">Accountant</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Industry</label>
              <input
                style={inputStyle}
                placeholder="Industry"
                value={form.industry}
                onChange={(e) => updateForm('industry', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Postcode</label>
            <input
              style={inputStyle}
              placeholder="Postcode"
              value={form.postcode}
              onChange={(e) => updateForm('postcode', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={textareaStyle}
              placeholder="Notes..."
              value={form.notes}
              onChange={(e) => updateForm('notes', e.target.value)}
            />
          </div>
        </div>
      )
    }

    return null
  }

  const tabButtons: { key: typeof tab; label: string; icon: React.ReactNode }[] = [
    { key: 'manual', label: 'Manual', icon: <Plus size={14} /> },
    { key: 'companies-house', label: 'Companies House', icon: <Building2 size={14} /> },
    { key: 'linkedin-url', label: 'LinkedIn URL', icon: <Link size={14} /> },
  ]

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
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
          width: isMobile ? '100%' : 480,
          zIndex: 40,
          background: 'var(--bg-mid)',
          borderLeft: '1px solid var(--border)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Linkedin size={18} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                Add LinkedIn Prospect
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: 4,
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {tabButtons.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  background: tab === t.key ? 'var(--accent)' : 'var(--bg-card)',
                  color: tab === t.key ? 'var(--bg-primary)' : 'var(--text-muted)',
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>
          {/* Manual Tab */}
          {tab === 'manual' && renderFormFields({ showAll: true })}

          {/* Companies House Tab */}
          {tab === 'companies-house' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Search */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="Search Companies House..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCompanySearch()
                  }}
                />
                <button
                  onClick={handleCompanySearch}
                  disabled={searching}
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--bg-primary)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {searching ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
                  Search
                </button>
              </div>

              {searchError && (
                <div style={{ color: '#ef4444', fontSize: 12 }}>{searchError}</div>
              )}

              {/* Results */}
              {searchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {searchResults.map((result) => {
                    const isSelected = selectedCompanyNumber === result.company_number
                    return (
                      <button
                        key={result.company_number}
                        onClick={() => selectCompany(result)}
                        style={{
                          background: isSelected ? 'var(--accent)' : 'var(--bg-card)',
                          color: isSelected ? 'var(--bg-primary)' : 'var(--text-primary)',
                          border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 8,
                          padding: '10px 12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                          width: '100%',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>
                            {result.company_name}
                          </span>
                          {isSelected && <Check size={14} />}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            marginTop: 4,
                            opacity: 0.8,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '4px 12px',
                          }}
                        >
                          <span>#{result.company_number}</span>
                          {result.postcode && <span>{result.postcode}</span>}
                          {result.incorporation_date && <span>Inc: {result.incorporation_date}</span>}
                          {result.sic_codes && result.sic_codes.length > 0 && (
                            <span>SIC: {result.sic_codes.join(', ')}</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Contact info fields */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={sectionTitleStyle}>Contact Details</div>
                {renderFormFields({ showContactOnly: true })}
              </div>
            </div>
          )}

          {/* LinkedIn URL Tab */}
          {tab === 'linkedin-url' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Paste LinkedIn URL</label>
                <input
                  style={inputStyle}
                  placeholder="https://linkedin.com/in/john-smith or /company/acme-corp"
                  value={form.linkedin_url}
                  onChange={(e) => handleLinkedInUrlChange(e.target.value)}
                />
              </div>

              {/* Remaining fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Name *</label>
                  <input
                    style={inputStyle}
                    placeholder="Contact name"
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Company Name</label>
                    <input
                      style={inputStyle}
                      placeholder="Company name"
                      value={form.company_name}
                      onChange={(e) => updateForm('company_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Job Title</label>
                    <input
                      style={inputStyle}
                      placeholder="Job title"
                      value={form.job_title}
                      onChange={(e) => updateForm('job_title', e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      style={inputStyle}
                      type="email"
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input
                      style={inputStyle}
                      placeholder="Phone"
                      value={form.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select
                      style={inputStyle}
                      value={form.type}
                      onChange={(e) => updateForm('type', e.target.value)}
                    >
                      <option value="SME">SME</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Industry</label>
                    <input
                      style={inputStyle}
                      placeholder="Industry"
                      value={form.industry}
                      onChange={(e) => updateForm('industry', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Postcode</label>
                  <input
                    style={inputStyle}
                    placeholder="Postcode"
                    value={form.postcode}
                    onChange={(e) => updateForm('postcode', e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Notes</label>
                  <textarea
                    style={textareaStyle}
                    placeholder="Notes..."
                    value={form.notes}
                    onChange={(e) => updateForm('notes', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tags Section */}
          <div>
            <div style={sectionTitleStyle}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allTags.map((tag) => {
                const isSelected = selectedTagIds.has(tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    style={{
                      background: isSelected ? 'var(--accent)' : 'var(--bg-card)',
                      color: isSelected ? 'var(--bg-primary)' : 'var(--text-muted)',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '4px 10px',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: 500,
                    }}
                  >
                    {tag.name}
                  </button>
                )
              })}
              {allTags.length === 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No tags available</span>
              )}
            </div>
          </div>

          {/* First Action Section */}
          <div>
            <div style={sectionTitleStyle}>First Action</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>Action Type</label>
                <select
                  style={inputStyle}
                  value={firstAction.type}
                  onChange={(e) =>
                    setFirstAction((prev) => ({ ...prev, type: e.target.value }))
                  }
                >
                  {ACTION_TYPES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Notes / Message</label>
                <textarea
                  style={textareaStyle}
                  placeholder={getActionPlaceholder()}
                  value={firstAction.notes}
                  onChange={(e) =>
                    setFirstAction((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Next Step Section */}
          <div>
            <div style={sectionTitleStyle}>Next Step</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>Next Action</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Follow up if no response"
                  value={nextStep.action}
                  onChange={(e) =>
                    setNextStep((prev) => ({ ...prev, action: e.target.value }))
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>Follow-up Date</label>
                <input
                  style={inputStyle}
                  type="date"
                  value={nextStep.follow_up_date}
                  onChange={(e) =>
                    setNextStep((prev) => ({ ...prev, follow_up_date: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Spacer to push save button content above sticky footer */}
          <div style={{ height: 60 }} />
        </div>

        {/* Save Button - Sticky Bottom */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-mid)',
          }}
        >
          {saveError && (
            <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{saveError}</div>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            style={{
              width: '100%',
              padding: '10px 0',
              background: !form.name.trim() ? 'var(--bg-card)' : 'var(--accent)',
              color: !form.name.trim() ? 'var(--text-muted)' : 'var(--bg-primary)',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: !form.name.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'inherit',
            }}
          >
            {saving && <Loader2 size={14} className="spin" />}
            Save Prospect
          </button>
        </div>
      </div>
    </>
  )
}
