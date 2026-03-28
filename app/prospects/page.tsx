'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  ArrowLeft,
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

const NAVY = '#0F1B35';
const NAVY_MID = '#162240';
const NAVY_CARD = '#1E2F52';
const TEAL = '#53E9C5';
const SLATE = '#5C6478';
const LIGHT = '#E8EDF5';
const BORDER = 'rgba(83,233,197,0.15)';
const AMBER = '#F59E0B';
const GREEN = '#34D399';
const RED = '#F87171';
const PURPLE = '#7C8CF8';

const STATUS_OPTIONS = [
  'New',
  'Sent',
  'Accepted',
  'Replied',
  'Call Booked',
  'Proposal',
  'Signed',
  'Dead',
];

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
  if (score === null) return SLATE;
  if (score >= 8) return GREEN;
  if (score >= 6) return AMBER;
  return SLATE;
}

function getPriorityColor(priority: string | null): string {
  if (!priority) return SLATE;
  const p = priority.toLowerCase();
  if (p === 'high') return RED;
  if (p === 'medium') return AMBER;
  return SLATE;
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
          backgroundColor: NAVY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Loader2
            size={40}
            style={{ color: TEAL, animation: 'spin 1s linear infinite' }}
          />
          <p style={{ color: LIGHT, marginTop: 16, fontSize: 16 }}>
            Loading prospects...
          </p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: NAVY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            backgroundColor: NAVY_CARD,
            border: `1px solid ${RED}`,
            borderRadius: 12,
            padding: 32,
            maxWidth: 480,
            textAlign: 'center',
          }}
        >
          <AlertCircle size={40} style={{ color: RED, marginBottom: 16 }} />
          <h2 style={{ color: LIGHT, fontSize: 20, margin: '0 0 8px' }}>
            Error Loading Prospects
          </h2>
          <p style={{ color: SLATE, fontSize: 14, margin: '0 0 20px' }}>
            {error}
          </p>
          <button
            onClick={fetchProspects}
            style={{
              backgroundColor: TEAL,
              color: NAVY,
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: NAVY }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: NAVY_MID,
          borderBottom: `1px solid ${BORDER}`,
          padding: '20px 32px',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <Link
            href="/"
            style={{
              color: TEAL,
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 700,
                color: LIGHT,
                letterSpacing: '-0.02em',
              }}
            >
              Beacon &amp; Ledger
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: TEAL,
                fontWeight: 500,
              }}
            >
              Prospects
            </p>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px' }}>
        {prospects.length === 0 ? (
          <div
            style={{
              backgroundColor: NAVY_CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: 48,
              textAlign: 'center',
              marginTop: 40,
            }}
          >
            <Building2
              size={48}
              style={{ color: SLATE, marginBottom: 16 }}
            />
            <h2 style={{ color: LIGHT, fontSize: 20, margin: '0 0 8px' }}>
              No auto-discovered prospects yet
            </h2>
            <p style={{ color: SLATE, fontSize: 14, margin: 0 }}>
              The CompanyQuery pipeline will populate this page.
            </p>
          </div>
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
                  backgroundColor: BORDER,
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
                icon={<Users size={20} style={{ color: TEAL }} />}
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
              <div
                style={{
                  backgroundColor: NAVY_CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 24,
                }}
              >
                <h3
                  style={{
                    margin: '0 0 16px',
                    fontSize: 16,
                    fontWeight: 600,
                    color: LIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <BarChart3 size={18} style={{ color: TEAL }} />
                  Trigger Type Breakdown
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {triggerBreakdown.map(([type, count]) => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span
                        style={{
                          color: LIGHT,
                          fontSize: 13,
                          minWidth: 160,
                          textTransform: 'capitalize',
                        }}
                      >
                        {type.replace(/_/g, ' ')}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 24,
                          backgroundColor: NAVY_MID,
                          borderRadius: 6,
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            width: `${(count / maxTriggerCount) * 100}%`,
                            height: '100%',
                            backgroundColor: TEAL,
                            borderRadius: 6,
                            opacity: 0.7,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          color: TEAL,
                          fontWeight: 600,
                          fontSize: 14,
                          minWidth: 30,
                          textAlign: 'right',
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section A: Prospect Queue */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filteredProspects.length === 0 ? (
                <div
                  style={{
                    backgroundColor: NAVY_CARD,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 12,
                    padding: 32,
                    textAlign: 'center',
                  }}
                >
                  <p style={{ color: SLATE, fontSize: 14, margin: 0 }}>
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
                    <div
                      key={prospect.id}
                      style={{
                        backgroundColor: NAVY_CARD,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 12,
                        padding: 20,
                      }}
                    >
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
                                color: LIGHT,
                              }}
                            >
                              {prospect.company_name}
                            </h3>
                            {prospect.company_number && (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: SLATE,
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
                                color: SLATE,
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
                            <span
                              style={{
                                backgroundColor: getScoreBadgeColor(prospect.bl_score),
                                color: NAVY,
                                fontWeight: 700,
                                fontSize: 13,
                                padding: '3px 10px',
                                borderRadius: 6,
                              }}
                            >
                              Score: {prospect.bl_score}
                            </span>
                          )}
                          {prospect.bl_priority && (
                            <span
                              style={{
                                backgroundColor: getPriorityColor(prospect.bl_priority),
                                color: NAVY,
                                fontWeight: 600,
                                fontSize: 12,
                                padding: '3px 10px',
                                borderRadius: 6,
                                textTransform: 'capitalize',
                              }}
                            >
                              {prospect.bl_priority}
                            </span>
                          )}
                          {prospect.trigger_type && (
                            <span
                              style={{
                                border: `1px solid ${TEAL}`,
                                color: TEAL,
                                fontSize: 12,
                                fontWeight: 500,
                                padding: '3px 10px',
                                borderRadius: 6,
                                textTransform: 'capitalize',
                              }}
                            >
                              {prospect.trigger_type.replace(/_/g, ' ')}
                            </span>
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
                          color: SLATE,
                          marginBottom: 12,
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
                          <button
                            onClick={() => toggleReason(prospect.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: TEAL,
                              fontSize: 13,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: 0,
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                            {isExpanded ? 'Hide reason' : 'Show reason'}
                          </button>
                          {isExpanded && (
                            <p
                              style={{
                                margin: '8px 0 0',
                                fontSize: 13,
                                color: LIGHT,
                                lineHeight: 1.5,
                                backgroundColor: NAVY_MID,
                                borderRadius: 8,
                                padding: 12,
                                border: `1px solid ${BORDER}`,
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
                            color: SLATE,
                            fontWeight: 500,
                          }}
                        >
                          Status:
                        </label>
                        <select
                          value={prospect.status || 'New'}
                          onChange={(e) =>
                            handleStatusChange(prospect.id, e.target.value)
                          }
                          style={{
                            backgroundColor: NAVY_MID,
                            color: LIGHT,
                            border: `1px solid ${BORDER}`,
                            borderRadius: 6,
                            padding: '6px 10px',
                            fontSize: 13,
                            cursor: 'pointer',
                            outline: 'none',
                          }}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        <label
                          style={{
                            fontSize: 12,
                            color: SLATE,
                            fontWeight: 500,
                            marginLeft: 8,
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
                            backgroundColor: NAVY_MID,
                            color: LIGHT,
                            border: `1px solid ${BORDER}`,
                            borderRadius: 6,
                            padding: '6px 10px',
                            fontSize: 13,
                            flex: 1,
                            minWidth: 160,
                            outline: 'none',
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
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: 'transparent',
                            color: TEAL,
                            border: `1px solid ${TEAL}`,
                            borderRadius: 6,
                            padding: '6px 14px',
                            fontSize: 13,
                            fontWeight: 500,
                            textDecoration: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <Linkedin size={14} />
                          Find on LinkedIn
                        </a>

                        {prospect.company_number && (
                          <a
                            href={`https://find-and-update.company-information.service.gov.uk/company/${prospect.company_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: 'transparent',
                              color: PURPLE,
                              border: `1px solid ${PURPLE}`,
                              borderRadius: 6,
                              padding: '6px 14px',
                              fontSize: 13,
                              fontWeight: 500,
                              textDecoration: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <ExternalLink size={14} />
                            View on Companies House
                          </a>
                        )}

                        {prospect.status === 'Signed' &&
                          !prospect.converted_to_lead_id && (
                            <button
                              onClick={() => handleConvertToLead(prospect)}
                              disabled={isConverting}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: GREEN,
                                color: NAVY,
                                border: 'none',
                                borderRadius: 6,
                                padding: '6px 14px',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: isConverting ? 'not-allowed' : 'pointer',
                                opacity: isConverting ? 0.6 : 1,
                              }}
                            >
                              {isConverting ? (
                                <Loader2
                                  size={14}
                                  style={{
                                    animation: 'spin 1s linear infinite',
                                  }}
                                />
                              ) : (
                                <ArrowRightCircle size={14} />
                              )}
                              Convert to Lead
                            </button>
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
                            }}
                          >
                            <ArrowRightCircle size={14} />
                            Converted
                          </span>
                        )}

                        {prospect.status !== 'Dead' && (
                          <button
                            onClick={() => handleDismiss(prospect.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: 'transparent',
                              color: RED,
                              border: `1px solid rgba(248,113,113,0.3)`,
                              borderRadius: 6,
                              padding: '6px 14px',
                              fontSize: 13,
                              fontWeight: 500,
                              cursor: 'pointer',
                              marginLeft: 'auto',
                            }}
                          >
                            <XCircle size={14} />
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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
    <button
      onClick={onClick}
      style={{
        backgroundColor: active ? TEAL : 'transparent',
        color: active ? NAVY : LIGHT,
        border: `1px solid ${active ? TEAL : BORDER}`,
        borderRadius: 6,
        padding: '6px 14px',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        textTransform: 'capitalize',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
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
    <div
      style={{
        backgroundColor: NAVY_CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          backgroundColor: NAVY_MID,
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
        <p style={{ margin: 0, fontSize: 12, color: SLATE, fontWeight: 500 }}>
          {label}
        </p>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 22,
            fontWeight: 700,
            color: LIGHT,
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
