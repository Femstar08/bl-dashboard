'use client'

import { useState, useEffect, useCallback, CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertCircle, Clock, RefreshCw, X } from 'lucide-react'

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

const card: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
}

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

const badge = (color: string): CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 600,
  background: color + '22',
  color,
  border: `1px solid ${color}44`,
})

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
    <div style={{ padding: '24px 24px 80px', maxWidth: 1280, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Audit Log</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Every agent interaction — prompts, responses, timing, errors
          </p>
        </div>
        <button
          onClick={fetchRows}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: 'var(--text-muted)',
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ ...card, padding: '14px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
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

        <button
          onClick={() => setErrorsOnly(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 8, fontSize: 13,
            fontFamily: 'inherit', cursor: 'pointer',
            border: `1px solid ${errorsOnly ? '#F8717180' : 'var(--border)'}`,
            background: errorsOnly ? '#F8717122' : 'var(--bg-mid)',
            color: errorsOnly ? '#F87171' : 'var(--text-muted)',
            fontWeight: errorsOnly ? 600 : 400,
          }}
        >
          <AlertCircle size={13} /> Errors only
        </button>

        {(agent !== 'All' || dateFrom || dateTo || errorsOnly) && (
          <button
            onClick={() => { setAgent('All'); setDateFrom(''); setDateTo(''); setErrorsOnly(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '7px 12px', borderRadius: 8, fontSize: 13,
              fontFamily: 'inherit', cursor: 'pointer',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-muted)',
            }}
          >
            <X size={13} /> Clear
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {loading ? 'Loading…' : `${rows.length} row${rows.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: 'hidden' }}>
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
              <span style={badge(AGENT_COLORS[row.agent_id] ?? '#8892A4')}>
                {row.agent_id.toUpperCase()}
              </span>
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
                ? <span style={badge('#F87171')}>Error</span>
                : <span style={badge('#34D399')}>OK</span>
              }
            </span>
          </div>
        ))}
      </div>

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
              <span style={badge(AGENT_COLORS[selected.agent_id] ?? '#8892A4')}>
                {selected.agent_id.toUpperCase()}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {fmtDate(selected.created_at)}
              </span>
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            >
              <X size={18} />
            </button>
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
