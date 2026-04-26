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
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="bl-page">
      <PageHeader
        title="System Health"
        subtitle="Workflow status and error monitoring"
        icon={Activity}
        gradientFrom="#7F1D1D"
        gradientTo="#991B1B"
        accentColor="#F87171"
      />

      {/* Header row: overall status badge + refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <Badge style={{ background: `${overallHealth === 'healthy' ? GREEN : overallHealth === 'warning' ? AMBER : RED}22`, color: overallHealth === 'healthy' ? GREEN : overallHealth === 'warning' ? AMBER : RED, border: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
          {overallHealth === 'healthy' && <><CheckCircle2 size={12} /> All Systems OK</>}
          {overallHealth === 'warning' && <><AlertTriangle size={12} /> Warnings</>}
          {overallHealth === 'error' && <><XCircle size={12} /> Errors Detected</>}
        </Badge>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={14} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh
        </Button>
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
          <Card key={kpi.label} className="bl-card">
            <CardContent className="p-6">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{kpi.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workflow Status Grid */}
      <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
        Workflow Status
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {workflows.map(wf => (
          <Card key={wf.id} className="bl-card" style={{ borderLeft: `3px solid ${wf.status === 'healthy' ? GREEN : wf.status === 'warning' ? AMBER : RED}` }}>
            <CardContent className="p-6" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 280 }}>
                {wf.name.replace('BL — ', '')}
              </span>
              <Badge style={{ background: `${wf.status === 'healthy' ? GREEN : wf.status === 'warning' ? AMBER : RED}18`, color: wf.status === 'healthy' ? GREEN : wf.status === 'warning' ? AMBER : RED, border: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
                {wf.status === 'healthy' && <><CheckCircle2 size={10} /> OK</>}
                {wf.status === 'warning' && <><AlertTriangle size={10} /> {wf.errorCount24h} err</>}
                {wf.status === 'error' && <><XCircle size={10} /> {wf.errorCount24h} errs</>}
              </Badge>
              {wf.lastError ? (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: RED }}>Last error:</span>{' '}
                  {wf.lastError.error_node} &mdash; {timeAgo(wf.lastError.created_at)}
                  {' — '}{wf.lastError.error_message}
                </span>
              ) : (
                <span style={{ fontSize: 11, color: GREEN }}>No errors recorded</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error Log */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Error Log
        </h2>
        {unacknowledgedCount > 0 && (
          <Button variant="outline" onClick={handleAcknowledgeAll} style={{ color: AMBER }}>
            <EyeOff size={13} /> Acknowledge All ({unacknowledgedCount})
          </Button>
        )}
      </div>

      {errors.length === 0 ? (
        <Card className="bl-card">
          <CardContent className="p-6" style={{ textAlign: 'center', padding: 40 }}>
            <CheckCircle2 size={32} style={{ color: GREEN, marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>No errors recorded</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              All workflows are running smoothly
            </div>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {errors.map(err => (
            <Card
              key={err.id}
              className="bl-card"
              style={{ opacity: err.acknowledged ? 0.5 : 1 }}
            >
              <CardContent className="p-6" style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <XCircle size={16} style={{ color: RED, marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {err.workflow_name.replace('BL — ', '')}
                    </span>
                    <Badge style={{ background: `${PURPLE}18`, color: PURPLE, border: 'none' }}>{err.error_node}</Badge>
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
                  <Button
                    variant="outline"
                    onClick={() => handleAcknowledge(err.id)}
                    title="Acknowledge"
                    style={{ width: 30, height: 30, padding: 0, flexShrink: 0 }}
                  >
                    <Eye size={14} />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
