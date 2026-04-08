'use client'
import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { Upload } from 'lucide-react'

interface UploadButtonProps {
  entityType: 'requirement' | 'content_calendar'
  onImportComplete: () => void
}

interface PreviewRow {
  identifier: string
  name: string
  action: 'New' | 'Update'
  status: string
}

interface ParsedResult {
  newItems: Record<string, unknown>[]
  updateItems: Record<string, unknown>[]
  skippedCount: number
  warningCount: number
  previewRows: PreviewRow[]
  filename: string
}

function excelDateToISO(val: unknown): string {
  if (typeof val === 'number') {
    // Excel date serial number
    const epoch = new Date(Date.UTC(1899, 11, 30))
    const d = new Date(epoch.getTime() + val * 86400000)
    return d.toISOString().slice(0, 10)
  }
  if (typeof val === 'string') {
    const d = new Date(val)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    return val
  }
  return ''
}

function str(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

function mapRequirementRow(row: Record<string, unknown>): Record<string, unknown> {
  const deps = str(row['Dependencies'])
  return {
    ref_id: str(row['ID']),
    phase: str(row['Phase']),
    domain: str(row['Domain']),
    requirement: str(row['Requirement']),
    type: str(row['Type']),
    priority: str(row['Priority']) || 'Medium',
    status: 'Backlog',
    assigned_to: str(row['Assigned To']) || null,
    complexity: str(row['Complexity']) || 'M',
    dependencies: deps ? deps.split(',').map(s => s.trim()).filter(Boolean) : [],
    acceptance_criteria: str(row['Acceptance Criteria']) || null,
    saas_tier_gate: str(row['SaaS Tier Gate']) || 'All Tiers',
    upgrade_feature: str(row['Upgrade Feature']).toLowerCase() === 'yes',
    notes: str(row['Notes']) || null,
    source: 'upload' as const,
  }
}

function mapContentRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    week: Number(row['Week']) || 1,
    publish_date: excelDateToISO(row['Date']),
    day: str(row['Day']),
    channel: str(row['Channel']),
    format: str(row['Format']),
    pillar: str(row['Pillar']),
    topic: str(row['Topic / Hook']),
    key_message: str(row['Key Message']) || null,
    cta: str(row['CTA']) || null,
    script_draft: str(row['Script / Draft']) || null,
    status: 'To Draft',
    performance: null,
    notes: str(row['Notes']) || null,
    source: 'upload' as const,
  }
}

export default function UploadButton({ entityType, onImportComplete }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ParsedResult | null>(null)
  const [importing, setImporting] = useState(false)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const data = evt.target?.result
      if (!data) return

      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

      if (rows.length === 0) return

      let newItems: Record<string, unknown>[] = []
      let updateItems: Record<string, unknown>[] = []
      let skippedCount = 0
      let warningCount = 0
      const previewRows: PreviewRow[] = []

      if (entityType === 'requirement') {
        const mapped = rows.map(mapRequirementRow).filter(r => str(r.ref_id))
        // Fetch existing ref_ids
        const { data: existing } = await supabase
          .from('bl_requirements')
          .select('ref_id')
        const existingIds = new Set((existing ?? []).map((r: { ref_id: string }) => r.ref_id))

        for (const item of mapped) {
          if (!item.ref_id || !str(item.requirement)) {
            skippedCount++
            continue
          }
          const isUpdate = existingIds.has(str(item.ref_id))
          if (isUpdate) {
            // For updates, use original status from spreadsheet instead of forcing Backlog
            const origRow = rows.find(r => str(r['ID']) === str(item.ref_id))
            const origStatus = origRow ? str(origRow['Status']) : ''
            if (origStatus) item.status = origStatus
            updateItems.push(item)
          } else {
            newItems.push(item)
          }
          previewRows.push({
            identifier: str(item.ref_id),
            name: str(item.requirement),
            action: isUpdate ? 'Update' : 'New',
            status: str(item.status),
          })
        }
      } else {
        const mapped = rows.map(mapContentRow).filter(r => str(r.publish_date))
        // Fetch existing publish_date + pillar combos
        const { data: existing } = await supabase
          .from('bl_content_calendar')
          .select('publish_date, pillar')
        const existingCombos = new Set(
          (existing ?? []).map((r: { publish_date: string; pillar: string }) => `${r.publish_date}|${r.pillar}`)
        )

        for (const item of mapped) {
          if (!item.publish_date || !str(item.topic)) {
            skippedCount++
            continue
          }
          const combo = `${str(item.publish_date)}|${str(item.pillar)}`
          const isUpdate = existingCombos.has(combo)
          if (isUpdate) {
            // For updates, use original status from spreadsheet
            const origRow = rows.find(r =>
              excelDateToISO(r['Date']) === str(item.publish_date) &&
              str(r['Pillar']) === str(item.pillar)
            )
            const origStatus = origRow ? str(origRow['Status']) : ''
            if (origStatus) item.status = origStatus
            updateItems.push(item)
          } else {
            newItems.push(item)
          }
          previewRows.push({
            identifier: str(item.publish_date),
            name: str(item.topic),
            action: isUpdate ? 'Update' : 'New',
            status: str(item.status),
          })
        }
      }

      setPreview({
        newItems,
        updateItems,
        skippedCount,
        warningCount,
        previewRows,
        filename: file.name,
      })
    }
    reader.readAsArrayBuffer(file)
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [entityType])

  const handleImport = useCallback(async () => {
    if (!preview) return
    setImporting(true)

    try {
      const table = entityType === 'requirement' ? 'bl_requirements' : 'bl_content_calendar'

      if (preview.newItems.length > 0) {
        await supabase.from(table).insert(preview.newItems)
      }

      for (const item of preview.updateItems) {
        if (entityType === 'requirement') {
          await supabase.from(table).update(item).eq('ref_id', str(item.ref_id))
        } else {
          await supabase
            .from(table)
            .update(item)
            .eq('publish_date', str(item.publish_date))
            .eq('pillar', str(item.pillar))
        }
      }

      // Store upload history in localStorage
      const historyKey = 'bl-upload-history'
      const existing = JSON.parse(localStorage.getItem(historyKey) || '[]')
      existing.push({
        filename: preview.filename,
        timestamp: new Date().toISOString(),
        entityType,
        newCount: preview.newItems.length,
        updateCount: preview.updateItems.length,
      })
      localStorage.setItem(historyKey, JSON.stringify(existing))

      onImportComplete()
      setPreview(null)
    } finally {
      setImporting(false)
    }
  }, [preview, entityType, onImportComplete])

  const totalItems = preview ? preview.newItems.length + preview.updateItems.length : 0

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: '6px 14px',
          fontSize: 11,
          borderRadius: 6,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'inherit',
          fontWeight: 500,
        }}
      >
        <Upload size={13} />
        Upload Excel
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Preview Modal */}
      {preview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setPreview(null) }}
        >
          <div
            style={{
              maxWidth: 600,
              width: '90%',
              background: 'var(--bg-card)',
              borderRadius: 12,
              padding: 20,
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Import Preview
              </h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                {preview.filename}
              </p>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              <div style={{ background: 'rgba(52,211,153,0.1)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#34D399' }}>{preview.newItems.length}</div>
                <div style={{ fontSize: 10, color: '#34D399', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New</div>
              </div>
              <div style={{ background: 'rgba(96,165,250,0.1)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#60a5fa' }}>{preview.updateItems.length}</div>
                <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Updated</div>
              </div>
              <div style={{ background: 'rgba(136,146,168,0.1)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#8892a8' }}>{preview.skippedCount}</div>
                <div style={{ fontSize: 10, color: '#8892a8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skipped</div>
              </div>
              <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#F59E0B' }}>{preview.warningCount}</div>
                <div style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Warnings</div>
              </div>
            </div>

            {/* Preview table */}
            {preview.previewRows.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {entityType === 'requirement' ? 'Ref ID' : 'Date'}
                      </th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {entityType === 'requirement' ? 'Requirement' : 'Topic'}
                      </th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.previewRows.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {row.identifier}
                        </td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.name}
                        </td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 99,
                            background: row.action === 'New' ? 'rgba(52,211,153,0.15)' : 'rgba(96,165,250,0.15)',
                            color: row.action === 'New' ? '#34D399' : '#60a5fa',
                          }}>
                            {row.action}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                          {row.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.previewRows.length > 10 && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                    ... showing 10 of {preview.previewRows.length} items
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setPreview(null)}
                style={{
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || totalItems === 0}
                style={{
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 8,
                  background: 'var(--accent)',
                  border: 'none',
                  color: 'var(--bg-primary)',
                  cursor: importing || totalItems === 0 ? 'not-allowed' : 'pointer',
                  opacity: importing || totalItems === 0 ? 0.5 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {importing ? 'Importing...' : `Import ${totalItems} items`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
