'use client'
import { useState, useEffect, useCallback } from 'react'
import { Settings, X, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { SyncConfig } from '@/lib/types-requirements'

interface SyncSettingsProps {
  entityType: 'requirement' | 'content_calendar'
  onSyncComplete: () => void
}

function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const APPS_SCRIPT_CODE = `// Install in Google Sheets: Extensions > Apps Script
// Replace YOUR_SUPABASE_URL with your Supabase project URL
function onEdit(e) {
  var url = 'YOUR_SUPABASE_URL/functions/v1/sync-google-sheet';
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      entity_type: '${/* placeholder */ 'requirement'}'
    })
  });
}`

export default function SyncSettings({ entityType, onSyncComplete }: SyncSettingsProps) {
  const [open, setOpen] = useState(false)
  const [sheetUrl, setSheetUrl] = useState('')
  const [sheetTab, setSheetTab] = useState('')
  const [syncEnabled, setSyncEnabled] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [configId, setConfigId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [showScript, setShowScript] = useState(false)

  const sheetId = extractSheetId(sheetUrl)

  const loadConfig = useCallback(async () => {
    const { data } = await supabase
      .from('bl_sync_config')
      .select('*')
      .eq('entity_type', entityType)
      .single()

    if (data) {
      const config = data as SyncConfig
      setConfigId(config.id)
      if (config.google_sheet_id) {
        setSheetUrl(`https://docs.google.com/spreadsheets/d/${config.google_sheet_id}/edit`)
      }
      setSheetTab(config.sheet_tab || '')
      setSyncEnabled(config.sync_enabled)
      setLastSynced(config.last_synced_at)
    }
  }, [entityType])

  useEffect(() => {
    if (open) loadConfig()
  }, [open, loadConfig])

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      entity_type: entityType,
      google_sheet_id: sheetId,
      sheet_tab: sheetTab || null,
      sync_enabled: syncEnabled,
    }

    if (configId) {
      await supabase
        .from('bl_sync_config')
        .update(payload)
        .eq('entity_type', entityType)
    } else {
      const { data } = await supabase
        .from('bl_sync_config')
        .insert(payload)
        .select()
        .single()
      if (data) setConfigId(data.id)
    }
    setSaving(false)
    setSyncResult('Settings saved')
    setTimeout(() => setSyncResult(null), 2000)
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-sheet', {
        body: { entity_type: entityType },
      })
      if (error) {
        setSyncResult(`Error: ${error.message}`)
      } else if (data?.success) {
        setSyncResult(`Synced: ${data.created} created, ${data.updated} updated`)
        setLastSynced(new Date().toISOString())
        onSyncComplete()
      } else {
        setSyncResult(`Failed: ${data?.reason || 'unknown error'}`)
      }
    } catch (err) {
      setSyncResult(`Error: ${String(err)}`)
    } finally {
      setSyncing(false)
    }
  }

  const appsScriptForEntity = APPS_SCRIPT_CODE.replace(
    `'requirement'`,
    `'${entityType}'`
  )

  return (
    <div style={{ position: 'relative' }}>
      {/* Gear icon button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: 6,
          background: open ? 'var(--bg-mid)' : 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Sync settings"
      >
        <Settings size={14} />
      </button>

      {/* Settings panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 34,
            width: 320,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            zIndex: 50,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Google Sheets Sync
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                padding: 2,
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Google Sheet URL */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Google Sheet URL
            </label>
            <input
              type="text"
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: 12,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            {sheetId && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                Sheet ID: {sheetId.slice(0, 20)}...
              </span>
            )}
          </div>

          {/* Tab name */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Sheet Tab Name
            </label>
            <input
              type="text"
              value={sheetTab}
              onChange={e => setSheetTab(e.target.value)}
              placeholder="Sheet1"
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: 12,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Sync enabled toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
              Sync enabled
            </span>
            <button
              onClick={() => setSyncEnabled(v => !v)}
              style={{
                width: 40,
                height: 22,
                borderRadius: 11,
                border: 'none',
                background: syncEnabled ? 'var(--accent)' : 'var(--border)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                padding: 0,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 3,
                  left: syncEnabled ? 21 : 3,
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>

          {/* Last synced */}
          <div style={{ marginBottom: 14, fontSize: 11, color: 'var(--text-muted)' }}>
            {lastSynced ? `Last synced: ${timeAgo(lastSynced)}` : 'Never synced'}
          </div>

          {/* Sync result message */}
          {syncResult && (
            <div style={{
              marginBottom: 12,
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              background: syncResult.startsWith('Error') || syncResult.startsWith('Failed')
                ? 'rgba(248,113,113,0.12)'
                : 'rgba(52,211,153,0.12)',
              color: syncResult.startsWith('Error') || syncResult.startsWith('Failed')
                ? '#F87171'
                : '#34D399',
            }}>
              {syncResult}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              onClick={handleSyncNow}
              disabled={syncing || !sheetId}
              style={{
                flex: 1,
                padding: '7px 0',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                background: 'var(--accent)',
                border: 'none',
                color: 'var(--bg-primary)',
                cursor: syncing || !sheetId ? 'not-allowed' : 'pointer',
                opacity: syncing || !sheetId ? 0.5 : 1,
                fontFamily: 'inherit',
              }}
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                padding: '7px 0',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1,
                fontFamily: 'inherit',
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          {/* Collapsible Apps Script section */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <button
              onClick={() => setShowScript(v => !v)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 0,
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted)',
                fontFamily: 'inherit',
              }}
            >
              {showScript ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Setup real-time sync
            </button>
            {showScript && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4 }}>
                  Add this Apps Script to your Google Sheet for automatic sync on edit.
                  Go to Extensions &gt; Apps Script and paste:
                </p>
                <div
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '10px 12px',
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: 'var(--text-muted)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    lineHeight: 1.5,
                    maxHeight: 180,
                    overflowY: 'auto',
                  }}
                >
                  {appsScriptForEntity}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
