'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PROSPECT_STAGES, STAGE_COLORS, type ProspectStage } from '@/lib/tokens';
import {
  Building2,
  ExternalLink,
  Linkedin,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Users,
  TrendingUp,
  BarChart3,
  Target,
  XCircle,
  ArrowRightCircle,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const AMBER = '#F59E0B';
const GREEN = '#34D399';
const RED = '#F87171';
const PURPLE = '#7C8CF8';

interface Prospect {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  industry: string | null;
  status: string | null;
  notes: string | null;
  date_added: string | null;
  created_at: string;
  updated_at: string | null;
  postcode: string | null;
  company_number: string | null;
  type: string | null;
  next_action: string | null;
  linkedin_url: string | null;
  converted_to_lead_id: string | null;
  converted_at: string | null;
  source: string | null;
  bl_score: number | null;
  bl_priority: string | null;
  bl_reason: string | null;
  trigger_type: string | null;
  region: string | null;
  incorporation_date: string | null;
  next_accounts_due: string | null;
}

type ScoreFilter = 'all' | 'high' | 'medium';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '--';
  }
}

function getScoreBadgeColor(score: number | null): string {
  if (score === null) return 'var(--text-muted)';
  if (score >= 8) return GREEN;
  if (score >= 6) return AMBER;
  return 'var(--text-muted)';
}

function getPriorityColor(priority: string | null): string {
  if (!priority) return 'var(--text-muted)';
  const p = priority.toLowerCase();
  if (p === 'high') return RED;
  if (p === 'medium') return AMBER;
  return 'var(--text-muted)';
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
  const [triggerFilter, setTriggerFilter] = useState<string | null>(null);
  const [expandedReasons, setExpandedReasons] = useState<Set<string>>(new Set());
  const [editingNextAction, setEditingNextAction] = useState<Record<string, string>>({});
  const [convertingIds, setConvertingIds] = useState<Set<string>>(new Set());

  const fetchProspects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('bl_crm_prospects')
        .select('*')
        .eq('source', 'CompanyQuery')
        .order('bl_score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setProspects((data as Prospect[]) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load prospects';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const distinctTriggerTypes = useMemo(() => {
    const types = new Set<string>();
    prospects.forEach((p) => {
      if (p.trigger_type) types.add(p.trigger_type);
    });
    return Array.from(types).sort();
  }, [prospects]);

  const filteredProspects = useMemo(() => {
    let result = prospects;
    if (scoreFilter === 'high') {
      result = result.filter((p) => p.bl_score !== null && p.bl_score >= 8);
    } else if (scoreFilter === 'medium') {
      result = result.filter((p) => p.bl_score !== null && p.bl_score >= 6 && p.bl_score <= 7);
    }
    if (triggerFilter) {
      result = result.filter((p) => p.trigger_type === triggerFilter);
    }
    return result;
  }, [prospects, scoreFilter, triggerFilter]);

  const stats = useMemo(() => {
    const total = filteredProspects.length;
    const highPriority = filteredProspects.filter(
      (p) => p.bl_score !== null && p.bl_score >= 8
    ).length;
    const converted = filteredProspects.filter(
      (p) => p.converted_to_lead_id !== null
    ).length;
    const scores = filteredProspects
      .map((p) => p.bl_score)
      .filter((s): s is number => s !== null);
    const avgScore =
      scores.length > 0
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : '0.0';
    return { total, highPriority, converted, avgScore };
  }, [filteredProspects]);

  const triggerBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredProspects.forEach((p) => {
      const key = p.trigger_type || 'Unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredProspects]);

  const maxTriggerCount = useMemo(() => {
    if (triggerBreakdown.length === 0) return 1;
    return Math.max(...triggerBreakdown.map(([, c]) => c), 1);
  }, [triggerBreakdown]);

  const toggleReason = (id: string) => {
    setExpandedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStatusChange = async (prospectId: string, newStatus: string) => {
    const prev = prospects.map((p) => ({ ...p }));
    setProspects((curr) =>
      curr.map((p) => (p.id === prospectId ? { ...p, status: newStatus } : p))
    );
    try {
      const { error: updateError } = await supabase
        .from('bl_crm_prospects')
        .update({ status: newStatus })
        .eq('id', prospectId);
      if (updateError) throw updateError;
    } catch {
      setProspects(prev);
    }
  };

  const handleNextActionBlur = async (prospectId: string) => {
    const value = editingNextAction[prospectId];
    if (value === undefined) return;
    const prospect = prospects.find((p) => p.id === prospectId);
    if (!prospect || prospect.next_action === value) {
      setEditingNextAction((prev) => {
        const next = { ...prev };
        delete next[prospectId];
        return next;
      });
      return;
    }
    const prev = prospects.map((p) => ({ ...p }));
    setProspects((curr) =>
      curr.map((p) => (p.id === prospectId ? { ...p, next_action: value } : p))
    );
    setEditingNextAction((prevEditing) => {
      const next = { ...prevEditing };
      delete next[prospectId];
      return next;
    });
    try {
      const { error: updateError } = await supabase
        .from('bl_crm_prospects')
        .update({ next_action: value })
        .eq('id', prospectId);
      if (updateError) throw updateError;
    } catch {
      setProspects(prev);
    }
  };

  const handleDismiss = async (prospectId: string) => {
    const prev = prospects.map((p) => ({ ...p }));
    setProspects((curr) =>
      curr.map((p) => (p.id === prospectId ? { ...p, status: 'Dead' } : p))
    );
    try {
      const { error: updateError } = await supabase
        .from('bl_crm_prospects')
        .update({ status: 'Dead' })
        .eq('id', prospectId);
      if (updateError) throw updateError;
    } catch {
      setProspects(prev);
    }
  };

  const handleConvertToLead = async (prospect: Prospect) => {
    if (convertingIds.has(prospect.id)) return;
    setConvertingIds((prev) => new Set(prev).add(prospect.id));

    const prevProspects = prospects.map((p) => ({ ...p }));

    try {
      const { data: newLead, error: insertError } = await supabase
        .from('leads')
        .insert({
          company_name: prospect.company_name,
          status: 'Discovery',
          source: 'CompanyQuery',
          notes: prospect.bl_reason || prospect.notes || '',
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      if (!newLead) throw new Error('No lead returned after insert');

      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('bl_crm_prospects')
        .update({
          converted_to_lead_id: newLead.id,
          converted_at: now,
        })
        .eq('id', prospect.id);

      if (updateError) throw updateError;

      setProspects((curr) =>
        curr.map((p) =>
          p.id === prospect.id
            ? { ...p, converted_to_lead_id: newLead.id, converted_at: now }
            : p
        )
      );
    } catch {
      setProspects(prevProspects);
    } finally {
      setConvertingIds((prev) => {
        const next = new Set(prev);
        next.delete(prospect.id);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Loader2
            size={40}
            style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }}
          />
          <p style={{ color: 'var(--text-primary)', marginTop: 16, fontSize: 16, fontFamily: 'inherit' }}>
            Loading prospects...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: `1px solid ${RED}`,
            borderRadius: 12,
            padding: 32,
            maxWidth: 480,
            textAlign: 'center',
          }}
        >
          <AlertCircle size={40} style={{ color: RED, marginBottom: 16 }} />
          <h2 style={{ color: 'var(--text-primary)', fontSize: 20, margin: '0 0 8px', fontFamily: 'inherit' }}>
            Error Loading Prospects
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 20px', fontFamily: 'inherit' }}>
            {error}
          </p>
          <Button onClick={fetchProspects}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bl-page">
      <PageHeader
        title="Prospects"
        subtitle="LinkedIn outreach and lead tracking"
        icon={Users}
        gradientFrom="#1E3A5F"
        gradientTo="#1E40AF"
        accentColor="#60A5FA"
      />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px' }}>
        {prospects.length === 0 ? (
          <Card className="bl-card" style={{ marginTop: 40, textAlign: 'center' }}>
            <CardContent className="p-12">
            <Building2
              size={48}
              style={{ color: 'var(--text-muted)', marginBottom: 16 }}
            />
            <h2 style={{ color: 'var(--text-primary)', fontSize: 20, margin: '0 0 8px', fontFamily: 'inherit' }}>
              No auto-discovered prospects yet
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, fontFamily: 'inherit' }}>
              The CompanyQuery pipeline will populate this page.
            </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filter Bar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 20,
              }}
            >
              <FilterButton
                active={scoreFilter === 'all' && triggerFilter === null}
                onClick={() => {
                  setScoreFilter('all');
                  setTriggerFilter(null);
                }}
                label="All"
              />
              <FilterButton
                active={scoreFilter === 'high'}
                onClick={() => {
                  setScoreFilter('high');
                  setTriggerFilter(null);
                }}
                label="High (8-10)"
              />
              <FilterButton
                active={scoreFilter === 'medium'}
                onClick={() => {
                  setScoreFilter('medium');
                  setTriggerFilter(null);
                }}
                label="Medium (6-7)"
              />
              <div
                style={{
                  width: 1,
                  backgroundColor: 'var(--border)',
                  margin: '0 4px',
                }}
              />
              {distinctTriggerTypes.map((tt) => (
                <FilterButton
                  key={tt}
                  active={triggerFilter === tt}
                  onClick={() => {
                    setScoreFilter('all');
                    setTriggerFilter(triggerFilter === tt ? null : tt);
                  }}
                  label={tt.replace(/_/g, ' ')}
                />
              ))}
            </div>

            {/* Section B: Pipeline Summary Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <StatCard
                icon={<Users size={20} style={{ color: 'var(--accent)' }} />}
                label="Total Prospects"
                value={String(stats.total)}
              />
              <StatCard
                icon={<Target size={20} style={{ color: RED }} />}
                label="High Priority"
                value={String(stats.highPriority)}
              />
              <StatCard
                icon={<ArrowRightCircle size={20} style={{ color: GREEN }} />}
                label="Converted to Leads"
                value={String(stats.converted)}
              />
              <StatCard
                icon={<TrendingUp size={20} style={{ color: PURPLE }} />}
                label="Avg BL Score"
                value={stats.avgScore}
              />
            </div>

            {/* Section C: Trigger Type Breakdown */}
            {triggerBreakdown.length > 0 && (
              <Card className="bl-card" style={{ marginBottom: 24 }}>
              <CardContent className="p-5">
                <h3
                  style={{
                    margin: '0 0 16px',
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: 'inherit',
                  }}
                >
                  <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
                  Trigger Type Breakdown
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {triggerBreakdown.map(([type, count]) => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span
                        style={{
                          color: 'var(--text-primary)',
                          fontSize: 13,
                          minWidth: 160,
                          textTransform: 'capitalize',
                          fontFamily: 'inherit',
                        }}
                      >
                        {type.replace(/_/g, ' ')}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 24,
                          backgroundColor: 'var(--bg-mid)',
                          borderRadius: 6,
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            width: `${(count / maxTriggerCount) * 100}%`,
                            height: '100%',
                            backgroundColor: 'var(--accent)',
                            borderRadius: 6,
                            opacity: 0.7,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          color: 'var(--accent)',
                          fontWeight: 600,
                          fontSize: 14,
                          minWidth: 30,
                          textAlign: 'right',
                          fontFamily: 'inherit',
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
              </Card>
            )}

            {/* Section A: Prospect Queue */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filteredProspects.length === 0 ? (
                <div
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 32,
                    textAlign: 'center',
                  }}
                >
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, fontFamily: 'inherit' }}>
                    No prospects match the current filters.
                  </p>
                </div>
              ) : (
                filteredProspects.map((prospect) => {
                  const reasonText = prospect.bl_reason || prospect.notes;
                  const isExpanded = expandedReasons.has(prospect.id);
                  const isConverting = convertingIds.has(prospect.id);
                  const nextActionValue =
                    editingNextAction[prospect.id] !== undefined
                      ? editingNextAction[prospect.id]
                      : prospect.next_action || '';

                  return (
                    <Card key={prospect.id} className="bl-card">
                    <CardContent className="p-6">
                      {/* Card Header */}
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 12,
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              flexWrap: 'wrap',
                            }}
                          >
                            <h3
                              style={{
                                margin: 0,
                                fontSize: 18,
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                fontFamily: 'inherit',
                              }}
                            >
                              {prospect.company_name}
                            </h3>
                            {prospect.company_number && (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: 'var(--text-muted)',
                                  fontFamily: 'monospace',
                                }}
                              >
                                #{prospect.company_number}
                              </span>
                            )}
                          </div>
                          {prospect.industry && (
                            <p
                              style={{
                                margin: '4px 0 0',
                                fontSize: 13,
                                color: 'var(--text-muted)',
                                fontFamily: 'inherit',
                              }}
                            >
                              {prospect.industry}
                            </p>
                          )}
                        </div>

                        {/* Badges */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          {prospect.bl_score !== null && (
                            <Badge style={{ background: getScoreBadgeColor(prospect.bl_score) + '22', color: getScoreBadgeColor(prospect.bl_score), border: 'none' }}>
                              Score: {prospect.bl_score}
                            </Badge>
                          )}
                          {prospect.bl_priority && (
                            <Badge style={{ background: getPriorityColor(prospect.bl_priority) + '22', color: getPriorityColor(prospect.bl_priority), border: 'none', textTransform: 'capitalize' }}>
                              {prospect.bl_priority}
                            </Badge>
                          )}
                          {prospect.trigger_type && (
                            <Badge variant="outline" style={{ textTransform: 'capitalize' }}>
                              {prospect.trigger_type.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Details Row */}
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 16,
                          fontSize: 13,
                          color: 'var(--text-muted)',
                          marginBottom: 12,
                          fontFamily: 'inherit',
                        }}
                      >
                        {prospect.incorporation_date && (
                          <span>
                            Incorporated: {formatDate(prospect.incorporation_date)}
                          </span>
                        )}
                        {prospect.next_accounts_due && (
                          <span>
                            Accounts due: {formatDate(prospect.next_accounts_due)}
                          </span>
                        )}
                        {prospect.postcode && <span>Postcode: {prospect.postcode}</span>}
                        {prospect.region && <span>Region: {prospect.region}</span>}
                      </div>

                      {/* Reason / Notes (Expandable) */}
                      {reasonText && (
                        <div style={{ marginBottom: 12 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleReason(prospect.id)}
                            className="p-0 h-auto text-[var(--accent)] hover:bg-transparent"
                          >
                            {isExpanded ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                            {isExpanded ? 'Hide reason' : 'Show reason'}
                          </Button>
                          {isExpanded && (
                            <p
                              style={{
                                margin: '8px 0 0',
                                fontSize: 13,
                                color: 'var(--text-primary)',
                                lineHeight: 1.5,
                                backgroundColor: 'var(--bg-mid)',
                                borderRadius: 8,
                                padding: 12,
                                border: '1px solid var(--border)',
                                fontFamily: 'inherit',
                              }}
                            >
                              {reasonText}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Status + Next Action Row */}
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 12,
                          alignItems: 'center',
                          marginBottom: 14,
                        }}
                      >
                        <label
                          style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            fontWeight: 500,
                            fontFamily: 'inherit',
                          }}
                        >
                          Status:
                        </label>
                        <select
                          value={prospect.status || 'Identified'}
                          onChange={(e) =>
                            handleStatusChange(prospect.id, e.target.value)
                          }
                          style={{
                            backgroundColor: 'var(--bg-mid)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            padding: '6px 10px',
                            fontSize: 13,
                            cursor: 'pointer',
                            outline: 'none',
                            fontFamily: 'inherit',
                          }}
                        >
                          {PROSPECT_STAGES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        <label
                          style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            fontWeight: 500,
                            marginLeft: 8,
                            fontFamily: 'inherit',
                          }}
                        >
                          Next Action:
                        </label>
                        <input
                          type="text"
                          value={nextActionValue}
                          onChange={(e) =>
                            setEditingNextAction((prev) => ({
                              ...prev,
                              [prospect.id]: e.target.value,
                            }))
                          }
                          onFocus={() => {
                            if (editingNextAction[prospect.id] === undefined) {
                              setEditingNextAction((prev) => ({
                                ...prev,
                                [prospect.id]: prospect.next_action || '',
                              }));
                            }
                          }}
                          onBlur={() => handleNextActionBlur(prospect.id)}
                          placeholder="e.g. Send intro email..."
                          style={{
                            backgroundColor: 'var(--bg-mid)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            padding: '6px 10px',
                            fontSize: 13,
                            flex: 1,
                            minWidth: 160,
                            outline: 'none',
                            fontFamily: 'inherit',
                          }}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                        }}
                      >
                        <a
                          href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(
                            prospect.company_name
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                          <Linkedin size={14} />
                          Find on LinkedIn
                        </a>

                        {prospect.company_number && (
                          <a
                            href={`https://find-and-update.company-information.service.gov.uk/company/${prospect.company_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: 'outline', size: 'sm' })}
                          >
                            <ExternalLink size={14} />
                            View on Companies House
                          </a>
                        )}

                        {prospect.status === 'Signed' &&
                          !prospect.converted_to_lead_id && (
                            <Button
                              size="sm"
                              onClick={() => handleConvertToLead(prospect)}
                              disabled={isConverting}
                            >
                              {isConverting ? (
                                <Loader2
                                  size={14}
                                  style={{ animation: 'spin 1s linear infinite' }}
                                />
                              ) : (
                                <ArrowRightCircle size={14} />
                              )}
                              Convert to Lead
                            </Button>
                          )}

                        {prospect.converted_to_lead_id && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              color: GREEN,
                              fontSize: 13,
                              fontWeight: 500,
                              padding: '6px 14px',
                              fontFamily: 'inherit',
                            }}
                          >
                            <ArrowRightCircle size={14} />
                            Converted
                          </span>
                        )}

                        {prospect.status !== 'Dead' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDismiss(prospect.id)}
                            style={{ marginLeft: 'auto', color: RED, borderColor: `rgba(248,113,113,0.3)` }}
                          >
                            <XCircle size={14} />
                            Dismiss
                          </Button>
                        )}
                      </div>
                    </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      style={{ textTransform: 'capitalize' }}
    >
      {label}
    </Button>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="bl-card">
      <CardContent className="p-4 flex items-center gap-3">
        <div
          style={{
            backgroundColor: 'var(--bg-mid)',
            borderRadius: 8,
            padding: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, fontFamily: 'inherit' }}>
            {label}
          </p>
          <p
            style={{
              margin: '2px 0 0',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
            }}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
