'use client'

import { useState, useEffect, useCallback, CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertCircle, Clock, RefreshCw, X, FileText } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

/* ── Types ──────────────────────────────────────────────────────── */

interface AuditRow {
  id: string
  agent_id: string
  chat_id: string | null
  prompt: string | null
  response: string | null
  duration_ms: number | null
  input_tokens: number | null
  output_tokens: number | null
  error: string | null
  created_at: string
}

/* ── Constants ──────────────────────────────────────────────────── */

const AGENTS = ['All', 'ceo', 'cto', 'cmo', 'coo', 'cfo', 'ux-designer'] as const

const AGENT_COLORS: Record<string, string> = {
  ceo:           '#7C8CF8',
  cto:           '#53E9C5',
  cmo:           '#F59E0B',
  coo:           '#F97316',
  cfo:           '#34D399',
  'ux-designer': '#A78BFA',
}

/* ── Helpers ────────────────────────────────────────────────────── */

function trunc(s: string | null | undefined, n: number): string {
  if (!s) return '—'
  return s.length <= n ? s : s.slice(0, n) + '…'
}

function fmtMs(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/* ── Shared inline style constants ─────────────────────────────── */

const inputStyle: CSSProperties = {
  background: 'var(--bg-mid)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  padding: '7px 11px',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
}

/* ══════════════════════════════════════════════════════════════════ */

export default function AuditPage() {
  const [rows, setRows]           = useState<AuditRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<AuditRow | null>(null)

  // Filters
  const [agent,      setAgent]      = useState<string>('All')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [errorsOnly, setErrorsOnly] = useState(false)

  /* ── Fetch ──────────────────────────────────────────────────── */

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('bl_agent_audit')
        .select('id, agent_id, chat_id, prompt, response, duration_ms, input_tokens, output_tokens, error, created_at')
        .order('created_at', { ascending: false })
        .limit(500)

      if (agent !== 'All') q = q.eq('agent_id', agent)
      if (dateFrom)        q = q.gte('created_at', dateFrom)
      if (dateTo)          q = q.lte('created_at', dateTo + 'T23:59:59')
      if (errorsOnly)      q = q.not('error', 'is', null)

      const { data, error } = await q
      if (error) throw error
      setRows(data || [])
    } catch { /* silent */ }
    setLoading(false)
  }, [agent, dateFrom, dateTo, errorsOnly])

  useEffect(() => { fetchRows() }, [fetchRows])

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="bl-page">

      <PageHeader
        title="Audit Log"
        subtitle="Agent activity and system event history"
        icon={FileText}
        gradientFrom="#1C1917"
        gradientTo="#292524"
        accentColor="#FB923C"
      />

      {/* Filter bar */}
      <Card className="bl-card" style={{ marginBottom: 16 }}>
        <CardContent className="p-6">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <select
              value={agent}
              onChange={e => setAgent(e.target.value)}
              style={{ ...inputStyle, minWidth: 130 }}
            >
              {AGENTS.map(a => (
                <option key={a} value={a}>{a === 'All' ? 'All agents' : a.toUpperCase()}</option>
              ))}
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={inputStyle}
              title="From date"
            />

            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={inputStyle}
              title="To date"
            />

            <Button
              variant="outline"
              onClick={() => setErrorsOnly(v => !v)}
              style={errorsOnly ? {
                border: '1px solid #F8717180',
                background: '#F8717122',
                color: '#F87171',
                fontWeight: 600,
              } : undefined}
            >
              <AlertCircle size={13} /> Errors only
            </Button>

            {(agent !== 'All' || dateFrom || dateTo || errorsOnly) && (
              <Button
                variant="outline"
                onClick={() => { setAgent('All'); setDateFrom(''); setDateTo(''); setErrorsOnly(false) }}
              >
                <X size={13} /> Clear
              </Button>
            )}

            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              {loading ? 'Loading…' : `${rows.length} row${rows.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bl-card" style={{ overflow: 'hidden' }}>
        <CardContent className="p-0">
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '155px 90px 1fr 1fr 72px 80px 62px',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            gap: 12,
          }}>
            <span>Time</span>
            <span>Agent</span>
            <span>Prompt</span>
            <span>Response</span>
            <span>Duration</span>
            <span>Tokens</span>
            <span>Status</span>
          </div>

          {/* Body */}
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No audit records match your filters.
            </div>
          ) : rows.map(row => (
            <div
              key={row.id}
              onClick={() => setSelected(selected?.id === row.id ? null : row)}
              style={{
                display: 'grid',
                gridTemplateColumns: '155px 90px 1fr 1fr 72px 80px 62px',
                padding: '10px 16px',
                borderBottom: '1px solid var(--border)',
                fontSize: 13,
                gap: 12,
                cursor: 'pointer',
                alignItems: 'center',
                background: selected?.id === row.id ? 'var(--bg-mid)' : 'transparent',
                transition: 'background 0.1s',
              }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                {fmtDate(row.created_at)}
              </span>

              <span>
                <Badge style={{ background: (AGENT_COLORS[row.agent_id] ?? '#8892A4') + '22', color: AGENT_COLORS[row.agent_id] ?? '#8892A4', border: 'none' }}>
                  {row.agent_id.toUpperCase()}
                </Badge>
              </span>

              <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {trunc(row.prompt, 80)}
              </span>

              <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {trunc(row.response, 80)}
              </span>

              <span style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={11} /> {fmtMs(row.duration_ms)}
              </span>

              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {row.input_tokens != null && row.output_tokens != null
                  ? `${row.input_tokens + row.output_tokens}`
                  : '—'}
              </span>

              <span>
                {row.error
                  ? <Badge style={{ background: '#F8717122', color: '#F87171', border: 'none' }}>Error</Badge>
                  : <Badge style={{ background: '#34D39922', color: '#34D399', border: 'none' }}>OK</Badge>
                }
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Slide-out detail panel */}
      {selected && (
        <div style={{
          position: 'fixed',
          top: 52,
          right: 0,
          bottom: 0,
          width: 520,
          background: 'var(--bg-mid)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 40,
          overflowY: 'auto',
        }}>
          {/* Panel header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge style={{ background: (AGENT_COLORS[selected.agent_id] ?? '#8892A4') + '22', color: AGENT_COLORS[selected.agent_id] ?? '#8892A4', border: 'none' }}>
                {selected.agent_id.toUpperCase()}
              </Badge>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {fmtDate(selected.created_at)}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none' }}
            >
              <X size={18} />
            </Button>
          </div>

          {/* Meta row */}
          <div style={{
            display: 'flex', gap: 20, padding: '12px 20px',
            borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap',
          }}>
            {[
              { label: 'Duration',   value: fmtMs(selected.duration_ms) },
              { label: 'Tokens in',  value: selected.input_tokens  ?? '—' },
              { label: 'Tokens out', value: selected.output_tokens ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ fontSize: 12 }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontWeight: 600 }}>{String(value)}</div>
              </div>
            ))}
            <div style={{ fontSize: 12 }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Chat ID</div>
              <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>
                {selected.chat_id ?? '—'}
              </div>
            </div>
            {selected.error && (
              <div style={{ fontSize: 12 }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Error</div>
                <div style={{ color: '#F87171', fontWeight: 600 }}>{selected.error}</div>
              </div>
            )}
          </div>

          {/* Prompt */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Prompt
            </div>
            <pre style={{
              fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              color: 'var(--text-primary)', fontFamily: 'inherit',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '12px 14px', maxHeight: 300, overflowY: 'auto',
            }}>
              {selected.prompt || '(empty)'}
            </pre>
          </div>

          {/* Response */}
          <div style={{ padding: '16px 20px', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Response
            </div>
            <pre style={{
              fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              color: 'var(--text-primary)', fontFamily: 'inherit',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '12px 14px', maxHeight: 400, overflowY: 'auto',
            }}>
              {selected.response || '(empty)'}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
