'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Clock,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────
const GREEN = '#34D399';
const RED = '#F87171';
const AMBER = '#F59E0B';
const PURPLE = '#7C8CF8';

// ── Types ─────────────────────────────────────────────────────
interface WorkflowError {
  id: string;
  workflow_id: string;
  workflow_name: string;
  execution_id: string;
  error_node: string;
  error_message: string;
  error_description: string;
  severity: string;
  acknowledged: boolean;
  created_at: string;
}

interface WorkflowInfo {
  id: string;
  name: string;
  active: boolean;
  lastError: WorkflowError | null;
  errorCount24h: number;
  status: 'healthy' | 'warning' | 'error';
}

// ── Known workflows ───────────────────────────────────────────
const KNOWN_WORKFLOWS = [
  { id: 'rvtM1BDLCj7qnkIK', name: 'BL — Generate Image (Webhook Trigger)', type: 'webhook' },
  { id: 'p7bTQJvXPV9gIKkT', name: 'BL — Fetch News Sources (Daily)', type: 'schedule' },
  { id: '7MaJJTzkfdRp4vo1', name: 'BL — Post to LinkedIn with Image (v3)', type: 'schedule' },
  { id: 'aNLi1bvhBBO43H0P', name: 'BL — Generate LinkedIn Draft (Webhook Trigger)', type: 'webhook' },
  { id: 'o0wPNG0rtQDtVxyA', name: 'BL — Error Notifier (Global)', type: 'system' },
];

// ── Helpers ───────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Component ─────────────────────────────────────────────────
export default function HealthPage() {
  const [errors, setErrors] = useState<WorkflowError[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchErrors = useCallback(async () => {
    const { data } = await supabase
      .from('bl_workflow_errors')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setErrors(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchErrors();
    const interval = setInterval(fetchErrors, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [fetchErrors]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchErrors();
  };

  const handleAcknowledge = async (id: string) => {
    await supabase.from('bl_workflow_errors').update({ acknowledged: true }).eq('id', id);
    setErrors(prev => prev.map(e => e.id === id ? { ...e, acknowledged: true } : e));
  };

  const handleAcknowledgeAll = async () => {
    const unacked = errors.filter(e => !e.acknowledged).map(e => e.id);
    if (unacked.length === 0) return;
    await supabase.from('bl_workflow_errors').update({ acknowledged: true }).in('id', unacked);
    setErrors(prev => prev.map(e => ({ ...e, acknowledged: true })));
  };

  // ── Compute workflow health ─────────────────────────────────
  const now = Date.now();
  const last24h = errors.filter(e => now - new Date(e.created_at).getTime() < 86400000);

  const workflows: WorkflowInfo[] = KNOWN_WORKFLOWS.map(wf => {
    const wfErrors = errors.filter(e => e.workflow_id === wf.id);
    const wfErrors24h = last24h.filter(e => e.workflow_id === wf.id);
    const lastError = wfErrors[0] || null;
    const errorCount24h = wfErrors24h.length;
    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    if (errorCount24h >= 3) status = 'error';
    else if (errorCount24h >= 1) status = 'warning';
    return { id: wf.id, name: wf.name, active: true, lastError, errorCount24h, status };
  });

  const overallHealth = workflows.some(w => w.status === 'error')
    ? 'error'
    : workflows.some(w => w.status === 'warning')
      ? 'warning'
      : 'healthy';

  const unacknowledgedCount = errors.filter(e => !e.acknowledged).length;
  const totalErrors24h = last24h.length;

  // ── Styles ──────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 20,
  };

  const badge = (color: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 6,
    background: `${color}18`,
    color,
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Activity size={22} style={{ color: 'var(--accent)' }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            System Health
          </h1>
          <span style={badge(
            overallHealth === 'healthy' ? GREEN : overallHealth === 'warning' ? AMBER : RED
          )}>
            {overallHealth === 'healthy' && <><CheckCircle2 size={12} /> All Systems OK</>}
            {overallHealth === 'warning' && <><AlertTriangle size={12} /> Warnings</>}
            {overallHealth === 'error' && <><XCircle size={12} /> Errors Detected</>}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-card)',
            color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          {
            label: 'Overall Status',
            value: overallHealth === 'healthy' ? 'Healthy' : overallHealth === 'warning' ? 'Warning' : 'Error',
            color: overallHealth === 'healthy' ? GREEN : overallHealth === 'warning' ? AMBER : RED,
            icon: overallHealth === 'healthy' ? <CheckCircle2 size={18} /> : overallHealth === 'warning' ? <AlertTriangle size={18} /> : <XCircle size={18} />,
          },
          {
            label: 'Active Workflows',
            value: String(KNOWN_WORKFLOWS.length),
            color: PURPLE,
            icon: <Zap size={18} />,
          },
          {
            label: 'Errors (24h)',
            value: String(totalErrors24h),
            color: totalErrors24h === 0 ? GREEN : RED,
            icon: <Clock size={18} />,
          },
          {
            label: 'Unacknowledged',
            value: String(unacknowledgedCount),
            color: unacknowledgedCount === 0 ? GREEN : AMBER,
            icon: <AlertTriangle size={18} />,
          },
        ].map(kpi => (
          <div key={kpi.label} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Workflow Status Grid */}
      <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
        Workflow Status
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {workflows.map(wf => (
          <div key={wf.id} style={{
            ...card,
            padding: '14px 20px',
            borderLeft: `3px solid ${wf.status === 'healthy' ? GREEN : wf.status === 'warning' ? AMBER : RED}`,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 280 }}>
              {wf.name.replace('BL — ', '')}
            </span>
            <span style={badge(wf.status === 'healthy' ? GREEN : wf.status === 'warning' ? AMBER : RED)}>
              {wf.status === 'healthy' && <><CheckCircle2 size={10} /> OK</>}
              {wf.status === 'warning' && <><AlertTriangle size={10} /> {wf.errorCount24h} err</>}
              {wf.status === 'error' && <><XCircle size={10} /> {wf.errorCount24h} errs</>}
            </span>
            {wf.lastError ? (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: RED }}>Last error:</span>{' '}
                {wf.lastError.error_node} &mdash; {timeAgo(wf.lastError.created_at)}
                {' — '}{wf.lastError.error_message}
              </span>
            ) : (
              <span style={{ fontSize: 11, color: GREEN }}>No errors recorded</span>
            )}
          </div>
        ))}
      </div>

      {/* Error Log */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Error Log
        </h2>
        {unacknowledgedCount > 0 && (
          <button
            onClick={handleAcknowledgeAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: AMBER, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <EyeOff size={13} /> Acknowledge All ({unacknowledgedCount})
          </button>
        )}
      </div>

      {errors.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <CheckCircle2 size={32} style={{ color: GREEN, marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>No errors recorded</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            All workflows are running smoothly
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {errors.map(err => (
            <div
              key={err.id}
              style={{
                ...card,
                padding: '14px 18px',
                opacity: err.acknowledged ? 0.5 : 1,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <XCircle size={16} style={{ color: RED, marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {err.workflow_name.replace('BL — ', '')}
                  </span>
                  <span style={badge(PURPLE)}>{err.error_node}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {timeAgo(err.created_at)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: RED, marginTop: 4 }}>
                  {err.error_message}
                </div>
                {err.error_description && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {err.error_description}
                  </div>
                )}
              </div>
              {!err.acknowledged && (
                <button
                  onClick={() => handleAcknowledge(err.id)}
                  title="Acknowledge"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 30, height: 30, borderRadius: 6,
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <Eye size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
