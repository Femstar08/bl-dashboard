'use client'
import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Download, ChevronDown } from 'lucide-react'
import type { Comment, Phase } from '@/lib/types-requirements'

interface ExportColumn {
  key: string
  label: string
}

interface ExportButtonProps {
  data: Record<string, any>[]
  columns: ExportColumn[]
  filename: string
  title: string
  comments?: Comment[]
  phases?: Phase[]
  entityType: 'requirement' | 'content_calendar'
}

export default function ExportButton({ data, columns, filename, title, comments, phases, entityType }: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(data.map(row => {
      const obj: Record<string, any> = {}
      columns.forEach(c => { obj[c.label] = row[c.key] })
      return obj
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')

    if (comments && comments.length > 0) {
      const commentRows = comments.map(c => ({
        'Entity ID': c.entity_id,
        'Author': c.author,
        'Comment': c.body,
        'Reply To': c.parent_id || '',
        'Date': new Date(c.created_at).toLocaleDateString()
      }))
      const cs = XLSX.utils.json_to_sheet(commentRows)
      XLSX.utils.book_append_sheet(wb, cs, 'Comments')
    }

    XLSX.writeFile(wb, filename + '.xlsx')
    setOpen(false)
  }

  function exportCSV() {
    const headers = columns.map(c => c.label).join(',')
    const rows = data.map(row =>
      columns.map(c => {
        const val = String(row[c.key] ?? '')
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"` : val
      }).join(',')
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename + '.csv'
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  function exportPDF() {
    const doc = new jsPDF()

    // Cover page
    doc.setFontSize(10)
    doc.setTextColor(83, 233, 197)
    doc.text('BEACON & LEDGER', 105, 60, { align: 'center' })
    doc.setFontSize(20)
    doc.setTextColor(0, 0, 0)
    doc.text(title, 105, 75, { align: 'center' })
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), 105, 85, { align: 'center' })
    doc.text('Generated from B&L Dashboard', 105, 92, { align: 'center' })

    // Summary page
    doc.addPage()
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text('Executive Summary', 14, 20)
    doc.setFontSize(10)
    doc.text(`Total items: ${data.length}`, 14, 32)

    // Status breakdown
    const statusCounts: Record<string, number> = {}
    data.forEach(row => {
      const s = row.status || 'Unknown'
      statusCounts[s] = (statusCounts[s] || 0) + 1
    })
    let y = 42
    Object.entries(statusCounts).forEach(([status, count]) => {
      doc.text(`${status}: ${count}`, 14, y)
      y += 8
    })

    // Phase breakdown (requirements only)
    if (phases && phases.length > 0) {
      doc.addPage()
      doc.setFontSize(14)
      doc.text('Phase Progress', 14, 20)
      doc.setFontSize(10)
      y = 32
      phases.forEach(p => {
        const phaseItems = data.filter(r => r.phase === p.phase)
        const done = phaseItems.filter(r => r.status === 'Done').length
        const pct = phaseItems.length ? Math.round((done / phaseItems.length) * 100) : 0
        doc.text(`${p.phase} — ${p.description}: ${pct}% (${done}/${phaseItems.length})`, 14, y)
        y += 8
        if (y > 280) { doc.addPage(); y = 20 }
      })
    }

    // Data table
    doc.addPage()
    doc.setFontSize(14)
    doc.text('Detail', 14, 20)
    ;(doc as any).autoTable({
      startY: 28,
      head: [columns.map(c => c.label)],
      body: data.map(row => columns.map(c => String(row[c.key] ?? ''))),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [83, 233, 197], textColor: [15, 27, 53] },
      theme: 'grid',
    })

    // Comments
    if (comments && comments.length > 0) {
      doc.addPage()
      doc.setFontSize(14)
      doc.text('Comments', 14, 20)
      doc.setFontSize(8)
      y = 32
      comments.filter(c => !c.parent_id).forEach(c => {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.setFont('helvetica', 'bold')
        doc.text(`${c.author} — ${new Date(c.created_at).toLocaleDateString()}`, 14, y)
        doc.setFont('helvetica', 'normal')
        y += 5
        const lines = doc.splitTextToSize(c.body, 180)
        doc.text(lines, 14, y)
        y += lines.length * 4 + 6
      })
    }

    doc.save(filename + '.pdf')
    setOpen(false)
  }

  const options = [
    {
      label: 'Excel (.xlsx)',
      subtitle: 'Working data with comments',
      color: '#34D399',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="#34D399" strokeWidth="2" />
          <path d="M8 8l4 4m0-4l-4 4" stroke="#34D399" strokeWidth="2" strokeLinecap="round" />
          <line x1="16" y1="8" x2="16" y2="16" stroke="#34D399" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="16" x2="20" y2="16" stroke="#34D399" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      onClick: exportExcel,
    },
    {
      label: 'CSV',
      subtitle: 'Universal flat format',
      color: '#60a5fa',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="#60a5fa" strokeWidth="2" />
          <line x1="3" y1="9" x2="21" y2="9" stroke="#60a5fa" strokeWidth="1.5" />
          <line x1="3" y1="15" x2="21" y2="15" stroke="#60a5fa" strokeWidth="1.5" />
          <line x1="9" y1="3" x2="9" y2="21" stroke="#60a5fa" strokeWidth="1.5" />
        </svg>
      ),
      onClick: exportCSV,
    },
    {
      label: 'PDF Report',
      subtitle: 'Polished stakeholder format',
      color: '#F87171',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M6 2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="#F87171" strokeWidth="2" />
          <polyline points="14,2 14,8 20,8" stroke="#F87171" strokeWidth="2" />
          <line x1="8" y1="13" x2="16" y2="13" stroke="#F87171" strokeWidth="1.5" />
          <line x1="8" y1="17" x2="14" y2="17" stroke="#F87171" strokeWidth="1.5" />
        </svg>
      ),
      onClick: exportPDF,
    },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
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
        <Download size={13} />
        Export
        <ChevronDown size={11} style={{ opacity: 0.5 }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 34,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 4,
            minWidth: 200,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            zIndex: 50,
          }}
        >
          {options.map(opt => (
            <button
              key={opt.label}
              onClick={opt.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 6,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-mid)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {opt.icon}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                  {opt.subtitle}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
