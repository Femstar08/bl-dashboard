'use client'
import { useState } from 'react'
import DetailPanel from '@/components/shared/DetailPanel'
import CommentThread from '@/components/shared/CommentThread'
import type { Requirement, Comment } from '@/lib/types-requirements'
import { REQ_PRIORITIES, REQ_STATUSES, REQ_COMPLEXITIES } from '@/lib/types-requirements'

interface RequirementDetailProps {
  item: Requirement
  comments: Comment[]
  onUpdate: (id: string, updates: Partial<Requirement>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
  onRefreshComments: () => void
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 4,
  fontWeight: 600,
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  background: 'var(--bg-mid)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text-primary)',
  width: '100%',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const groupStyle: React.CSSProperties = {
  marginBottom: 12,
}

export default function RequirementDetail({
  item,
  comments,
  onUpdate,
  onDelete,
  onClose,
  onRefreshComments,
}: RequirementDetailProps) {
  const [localValues, setLocalValues] = useState<Record<string, string | boolean>>({})

  const getValue = (field: keyof Requirement): string => {
    if (field in localValues) return String(localValues[field])
    const val = item[field]
    if (val === null || val === undefined) return ''
    if (Array.isArray(val)) return val.join(', ')
    return String(val)
  }

  const getBoolValue = (field: keyof Requirement): boolean => {
    if (field in localValues) return localValues[field] as boolean
    return item[field] as boolean
  }

  const handleBlur = (field: keyof Requirement, value: string) => {
    let updates: Partial<Requirement>
    if (field === 'dependencies') {
      updates = { [field]: value.split(',').map(s => s.trim()).filter(Boolean) } as Partial<Requirement>
    } else {
      updates = { [field]: value } as Partial<Requirement>
    }
    onUpdate(item.id, updates)
    setLocalValues(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleDropdownChange = (field: keyof Requirement, value: string) => {
    onUpdate(item.id, { [field]: value } as Partial<Requirement>)
  }

  const handleCheckboxChange = (field: keyof Requirement, checked: boolean) => {
    onUpdate(item.id, { [field]: checked } as Partial<Requirement>)
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this requirement?')) {
      onDelete(item.id)
      onClose()
    }
  }

  const entityComments = comments.filter(c => c.entity_id === item.id)

  return (
    <DetailPanel title={item.ref_id} onClose={onClose} width={420}>
      {/* ref_id (read-only) */}
      <div style={groupStyle}>
        <div style={labelStyle}>Ref ID</div>
        <div style={{ ...inputStyle, background: 'transparent', border: 'none', padding: '6px 10px', opacity: 0.7 }}>
          {item.ref_id}
        </div>
      </div>

      {/* phase */}
      <div style={groupStyle}>
        <div style={labelStyle}>Phase</div>
        <input
          style={inputStyle}
          value={getValue('phase')}
          onChange={e => setLocalValues(prev => ({ ...prev, phase: e.target.value }))}
          onBlur={e => handleBlur('phase', e.target.value)}
        />
      </div>

      {/* domain */}
      <div style={groupStyle}>
        <div style={labelStyle}>Domain</div>
        <input
          style={inputStyle}
          value={getValue('domain')}
          onChange={e => setLocalValues(prev => ({ ...prev, domain: e.target.value }))}
          onBlur={e => handleBlur('domain', e.target.value)}
        />
      </div>

      {/* requirement */}
      <div style={groupStyle}>
        <div style={labelStyle}>Requirement</div>
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
          value={getValue('requirement')}
          onChange={e => setLocalValues(prev => ({ ...prev, requirement: e.target.value }))}
          onBlur={e => handleBlur('requirement', e.target.value)}
        />
      </div>

      {/* type */}
      <div style={groupStyle}>
        <div style={labelStyle}>Type</div>
        <input
          style={inputStyle}
          value={getValue('type')}
          onChange={e => setLocalValues(prev => ({ ...prev, type: e.target.value }))}
          onBlur={e => handleBlur('type', e.target.value)}
        />
      </div>

      {/* priority */}
      <div style={groupStyle}>
        <div style={labelStyle}>Priority</div>
        <select
          style={inputStyle}
          value={getValue('priority')}
          onChange={e => handleDropdownChange('priority', e.target.value)}
        >
          {REQ_PRIORITIES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* status */}
      <div style={groupStyle}>
        <div style={labelStyle}>Status</div>
        <select
          style={inputStyle}
          value={getValue('status')}
          onChange={e => handleDropdownChange('status', e.target.value)}
        >
          {REQ_STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* assigned_to */}
      <div style={groupStyle}>
        <div style={labelStyle}>Assigned To</div>
        <input
          style={inputStyle}
          value={getValue('assigned_to')}
          onChange={e => setLocalValues(prev => ({ ...prev, assigned_to: e.target.value }))}
          onBlur={e => handleBlur('assigned_to', e.target.value)}
        />
      </div>

      {/* complexity */}
      <div style={groupStyle}>
        <div style={labelStyle}>Complexity</div>
        <select
          style={inputStyle}
          value={getValue('complexity')}
          onChange={e => handleDropdownChange('complexity', e.target.value)}
        >
          {REQ_COMPLEXITIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* dependencies */}
      <div style={groupStyle}>
        <div style={labelStyle}>Dependencies</div>
        <input
          style={inputStyle}
          value={getValue('dependencies')}
          onChange={e => setLocalValues(prev => ({ ...prev, dependencies: e.target.value }))}
          onBlur={e => handleBlur('dependencies', e.target.value)}
          placeholder="Comma-separated, e.g. R001, R002"
        />
      </div>

      {/* acceptance_criteria */}
      <div style={groupStyle}>
        <div style={labelStyle}>Acceptance Criteria</div>
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
          value={getValue('acceptance_criteria')}
          onChange={e => setLocalValues(prev => ({ ...prev, acceptance_criteria: e.target.value }))}
          onBlur={e => handleBlur('acceptance_criteria', e.target.value)}
        />
      </div>

      {/* saas_tier_gate */}
      <div style={groupStyle}>
        <div style={labelStyle}>SaaS Tier Gate</div>
        <input
          style={inputStyle}
          value={getValue('saas_tier_gate')}
          onChange={e => setLocalValues(prev => ({ ...prev, saas_tier_gate: e.target.value }))}
          onBlur={e => handleBlur('saas_tier_gate', e.target.value)}
        />
      </div>

      {/* upgrade_feature */}
      <div style={groupStyle}>
        <div style={labelStyle}>Upgrade Feature</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={getBoolValue('upgrade_feature')}
            onChange={e => handleCheckboxChange('upgrade_feature', e.target.checked)}
          />
          <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Yes</span>
        </label>
      </div>

      {/* notes */}
      <div style={groupStyle}>
        <div style={labelStyle}>Notes</div>
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
          value={getValue('notes')}
          onChange={e => setLocalValues(prev => ({ ...prev, notes: e.target.value }))}
          onBlur={e => handleBlur('notes', e.target.value)}
        />
      </div>

      {/* Delete button */}
      <div style={{ marginTop: 16, marginBottom: 24 }}>
        <button
          onClick={handleDelete}
          style={{
            width: '100%',
            padding: '8px 16px',
            background: '#F87171',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Delete Requirement
        </button>
      </div>

      {/* Comment Thread */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>Comments</div>
        <CommentThread
          entityType="requirement"
          entityId={item.id}
          comments={entityComments}
          onRefresh={onRefreshComments}
        />
      </div>
    </DetailPanel>
  )
}
