'use client'
import { useState } from 'react'
import DetailPanel from '@/components/shared/DetailPanel'
import CommentThread from '@/components/shared/CommentThread'
import type { ContentCalendarItem, Comment } from '@/lib/types-requirements'
import { CAL_STATUSES, PILLAR_COLORS } from '@/lib/types-requirements'

interface CalendarDetailProps {
  item: ContentCalendarItem
  comments: Comment[]
  onUpdate: (id: string, updates: Partial<ContentCalendarItem>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
  onRefreshComments: () => void
  onOpenInStudio: (item: ContentCalendarItem) => void
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

export default function CalendarDetail({
  item,
  comments,
  onUpdate,
  onDelete,
  onClose,
  onRefreshComments,
  onOpenInStudio,
}: CalendarDetailProps) {
  const [localValues, setLocalValues] = useState<Record<string, string>>({})

  const getValue = (field: keyof ContentCalendarItem): string => {
    if (field in localValues) return localValues[field]
    const val = item[field]
    if (val === null || val === undefined) return ''
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  }

  const handleChange = (field: keyof ContentCalendarItem, value: string) => {
    setLocalValues(prev => ({ ...prev, [field]: value }))
  }

  const handleBlur = (field: keyof ContentCalendarItem, value: string) => {
    onUpdate(item.id, { [field]: value || null } as Partial<ContentCalendarItem>)
    setLocalValues(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleDropdownChange = (field: keyof ContentCalendarItem, value: string) => {
    onUpdate(item.id, { [field]: value } as Partial<ContentCalendarItem>)
  }

  const handleDateChange = (value: string) => {
    // Auto-derive day from publish_date
    if (value) {
      const date = new Date(value + 'T00:00:00')
      const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' })
      onUpdate(item.id, { publish_date: value, day: dayName })
    } else {
      onUpdate(item.id, { publish_date: value })
    }
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      onDelete(item.id)
      onClose()
    }
  }

  const entityComments = comments.filter(c => c.entity_id === item.id)

  // Derive the day display from publish_date if available
  const dayDisplay = item.publish_date
    ? new Date(item.publish_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long' })
    : item.day

  return (
    <DetailPanel title={`Week ${item.week} \u2014 ${item.day}`} onClose={onClose} width={420}>
      {/* publish_date */}
      <div style={groupStyle}>
        <div style={labelStyle}>Publish Date</div>
        <input
          type="date"
          style={inputStyle}
          value={getValue('publish_date')}
          onChange={e => handleDateChange(e.target.value)}
        />
      </div>

      {/* day (derived, read-only) */}
      <div style={groupStyle}>
        <div style={labelStyle}>Day</div>
        <div
          style={{
            ...inputStyle,
            background: 'transparent',
            border: 'none',
            padding: '6px 10px',
            opacity: 0.7,
          }}
        >
          {dayDisplay || '\u2014'}
        </div>
      </div>

      {/* channel */}
      <div style={groupStyle}>
        <div style={labelStyle}>Channel</div>
        <input
          style={inputStyle}
          value={getValue('channel')}
          onChange={e => handleChange('channel', e.target.value)}
          onBlur={e => handleBlur('channel', e.target.value)}
        />
      </div>

      {/* format */}
      <div style={groupStyle}>
        <div style={labelStyle}>Format</div>
        <input
          style={inputStyle}
          value={getValue('format')}
          onChange={e => handleChange('format', e.target.value)}
          onBlur={e => handleBlur('format', e.target.value)}
        />
      </div>

      {/* pillar */}
      <div style={groupStyle}>
        <div style={labelStyle}>Pillar</div>
        <input
          style={inputStyle}
          value={getValue('pillar')}
          onChange={e => handleChange('pillar', e.target.value)}
          onBlur={e => handleBlur('pillar', e.target.value)}
        />
        {item.pillar && PILLAR_COLORS[item.pillar] && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: PILLAR_COLORS[item.pillar],
              display: 'inline-block',
              marginTop: 4,
              marginLeft: 4,
            }}
          />
        )}
      </div>

      {/* topic */}
      <div style={groupStyle}>
        <div style={labelStyle}>Topic</div>
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
          value={getValue('topic')}
          onChange={e => handleChange('topic', e.target.value)}
          onBlur={e => handleBlur('topic', e.target.value)}
        />
      </div>

      {/* key_message */}
      <div style={groupStyle}>
        <div style={labelStyle}>Key Message</div>
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
          value={getValue('key_message')}
          onChange={e => handleChange('key_message', e.target.value)}
          onBlur={e => handleBlur('key_message', e.target.value)}
        />
      </div>

      {/* cta */}
      <div style={groupStyle}>
        <div style={labelStyle}>CTA</div>
        <textarea
          style={{ ...inputStyle, minHeight: 40, resize: 'vertical' }}
          value={getValue('cta')}
          onChange={e => handleChange('cta', e.target.value)}
          onBlur={e => handleBlur('cta', e.target.value)}
        />
      </div>

      {/* script_draft */}
      <div style={groupStyle}>
        <div style={labelStyle}>Script / Draft</div>
        <textarea
          style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
          value={getValue('script_draft')}
          onChange={e => handleChange('script_draft', e.target.value)}
          onBlur={e => handleBlur('script_draft', e.target.value)}
          placeholder="Draft your content here..."
        />
      </div>

      {/* status */}
      <div style={groupStyle}>
        <div style={labelStyle}>Status</div>
        <select
          style={inputStyle}
          value={getValue('status')}
          onChange={e => handleDropdownChange('status', e.target.value)}
        >
          {CAL_STATUSES.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* notes */}
      <div style={groupStyle}>
        <div style={labelStyle}>Notes</div>
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
          value={getValue('notes')}
          onChange={e => handleChange('notes', e.target.value)}
          onBlur={e => handleBlur('notes', e.target.value)}
        />
      </div>

      {/* Open in Studio button */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => onOpenInStudio(item)}
          style={{
            width: '100%',
            padding: '8px 16px',
            background: 'var(--accent)',
            color: 'var(--bg-primary)',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'center',
          }}
        >
          Open in Studio
        </button>
      </div>

      {/* Delete button */}
      <div style={{ marginTop: 4, marginBottom: 24 }}>
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
          Delete Post
        </button>
      </div>

      {/* Comment Thread */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>Comments</div>
        <CommentThread
          entityType="content_calendar"
          entityId={item.id}
          comments={entityComments}
          onRefresh={onRefreshComments}
        />
      </div>
    </DetailPanel>
  )
}
