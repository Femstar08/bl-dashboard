'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Award,
  Users,
  Send,
  UserCheck,
  MessageSquare,
  Phone,
  Plus,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

// ── Design tokens ──────────────────────────────────────────────
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

// ── Types ──────────────────────────────────────────────────────
interface ContentPiece {
  id: string;
  title: string;
  content: string;
  content_type: string;
  platform: string;
  status: string;
  metadata: Record<string, unknown> | null;
  published_at: string | null;
  created_at: string;
}

interface AnalyticMetric {
  id: string;
  content_id: string;
  metric_name: string;
  metric_value: number;
  recorded_at: string;
  platform: string;
}

interface PostWithMetrics {
  piece: ContentPiece;
  metrics: { likes: number; comments: number; shares: number; impressions: number };
}

interface WeeklyStat {
  id: string;
  week_starting: string;
  channel: string;
  sent: number;
  accepted: number;
  replied: number;
  calls_booked: number;
}

interface FormData {
  platform: string;
  profile: string;
  date: string;
  post_excerpt: string;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
}

const defaultForm: FormData = {
  platform: 'linkedin',
  profile: 'Femi',
  date: new Date().toISOString().split('T')[0],
  post_excerpt: '',
  likes: 0,
  comments: 0,
  shares: 0,
  impressions: 0,
};

// ── Helpers ────────────────────────────────────────────────────
function extractMetrics(
  piece: ContentPiece,
  analyticsRows: AnalyticMetric[]
): { likes: number; comments: number; shares: number; impressions: number } {
  const fromAnalytics = analyticsRows.filter((r) => r.content_id === piece.id);

  if (fromAnalytics.length > 0) {
    const val = (name: string) =>
      fromAnalytics.find((r) => r.metric_name === name)?.metric_value ?? 0;
    return {
      likes: val('likes'),
      comments: val('comments'),
      shares: val('shares'),
      impressions: val('impressions'),
    };
  }

  const m = piece.metadata as Record<string, unknown> | null;
  return {
    likes: Number(m?.likes ?? 0),
    comments: Number(m?.comments ?? 0),
    shares: Number(m?.shares ?? 0),
    impressions: Number(m?.impressions ?? 0),
  };
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return '0%';
  return ((numerator / denominator) * 100).toFixed(1) + '%';
}

// ── Component ──────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [posts, setPosts] = useState<PostWithMetrics[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [piecesRes, analyticsRes, weeklyRes] = await Promise.all([
        supabase
          .from('bl_dashboard_content_pieces')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('bl_dashboard_content_analytics').select('*'),
        supabase.from('bl_weekly_stats').select('*'),
      ]);

      if (piecesRes.error) throw new Error(piecesRes.error.message);

      const pieces: ContentPiece[] = piecesRes.data ?? [];
      const analytics: AnalyticMetric[] = analyticsRes.data ?? [];
      const weekly: WeeklyStat[] = weeklyRes.data ?? [];

      const merged: PostWithMetrics[] = pieces.map((piece) => ({
        piece,
        metrics: extractMetrics(piece, analytics),
      }));

      setPosts(merged);
      setWeeklyStats(weekly);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Form submit ────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.post_excerpt.trim()) {
      setSubmitError('Post excerpt is required');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    try {
      const { data: newPiece, error: pieceErr } = await supabase
        .from('bl_dashboard_content_pieces')
        .insert({
          title: form.post_excerpt.slice(0, 100),
          content: form.post_excerpt,
          content_type: 'post',
          platform: form.platform,
          status: 'published',
          metadata: {
            profile: form.profile,
            likes: form.likes,
            comments: form.comments,
            shares: form.shares,
            impressions: form.impressions,
          },
          published_at: form.date,
        })
        .select('id')
        .single();

      if (pieceErr) throw new Error(pieceErr.message);

      const contentId = newPiece.id;
      const metricNames = ['likes', 'comments', 'shares', 'impressions'] as const;
      const metricRows = metricNames.map((name) => ({
        content_id: contentId,
        metric_name: name,
        metric_value: form[name],
        platform: form.platform,
        recorded_at: form.date,
      }));

      try {
        await supabase.from('bl_dashboard_content_analytics').insert(metricRows);
      } catch {
        // RLS may block anon inserts to analytics — metrics are already in content_pieces metadata
      }

      setForm(defaultForm);
      setFormOpen(false);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save post';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived data ───────────────────────────────────────────
  const bestPost =
    posts.length > 0
      ? posts.reduce((best, p) =>
          p.metrics.impressions > best.metrics.impressions ? p : best
        )
      : null;

  const totalLikes = posts.reduce((s, p) => s + p.metrics.likes, 0);
  const totalComments = posts.reduce((s, p) => s + p.metrics.comments, 0);
  const totalShares = posts.reduce((s, p) => s + p.metrics.shares, 0);
  const totalImpressions = posts.reduce((s, p) => s + p.metrics.impressions, 0);
  const avgEngagement =
    totalImpressions > 0
      ? ((totalLikes + totalComments + totalShares) / totalImpressions) * 100
      : 0;

  const femiCount = posts.filter(
    (p) => (p.piece.metadata as Record<string, unknown> | null)?.profile === 'Femi'
  ).length;
  const blCount = posts.filter(
    (p) => (p.piece.metadata as Record<string, unknown> | null)?.profile === 'B&L'
  ).length;

  // Funnel
  const funnelSent = weeklyStats.reduce((s, r) => s + (r.sent ?? 0), 0);
  const funnelAccepted = weeklyStats.reduce((s, r) => s + (r.accepted ?? 0), 0);
  const funnelReplied = weeklyStats.reduce((s, r) => s + (r.replied ?? 0), 0);
  const funnelBooked = weeklyStats.reduce((s, r) => s + (r.calls_booked ?? 0), 0);

  // ── Styles ─────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: NAVY_CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: SLATE,
    marginBottom: 16,
  };

  const input: React.CSSProperties = {
    background: NAVY_MID,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: '10px 14px',
    color: LIGHT,
    fontSize: 14,
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const label: React.CSSProperties = {
    fontSize: 12,
    color: SLATE,
    marginBottom: 4,
    display: 'block',
    fontWeight: 600,
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: NAVY, color: LIGHT, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div
        style={{
          background: NAVY_MID,
          borderBottom: `1px solid ${BORDER}`,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Link href="/" style={{ color: TEAL, display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: LIGHT }}>Beacon &amp; Ledger</div>
          <div style={{ fontSize: 12, color: SLATE, fontWeight: 600, letterSpacing: 1 }}>Analytics</div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>
        {/* Loading state */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 60 }}>
            <Loader2 size={22} color={TEAL} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: SLATE, fontSize: 14 }}>Loading analytics...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div
            style={{
              ...card,
              borderColor: RED,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <AlertCircle size={20} color={RED} />
            <span style={{ color: RED, fontSize: 14 }}>{error}</span>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Section B: Performance Summary ── */}
            <div style={sectionTitle}>
              <TrendingUp size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Performance Summary
            </div>

            {posts.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: SLATE, fontSize: 14, padding: 40 }}>
                No posts logged yet. Add your first post result below.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 24 }}>
                {/* Best Post */}
                <div style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Award size={16} color={AMBER} />
                    <span style={{ fontSize: 11, color: SLATE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Best Post
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: LIGHT, lineHeight: 1.5, marginBottom: 8 }}>
                    {bestPost ? bestPost.piece.title.slice(0, 60) + (bestPost.piece.title.length > 60 ? '...' : '') : '—'}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: TEAL }}>
                    {bestPost ? fmtNum(bestPost.metrics.impressions) : '0'}{' '}
                    <span style={{ fontSize: 11, color: SLATE, fontWeight: 500 }}>impressions</span>
                  </div>
                </div>

                {/* Avg Engagement */}
                <div style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <BarChart3 size={16} color={GREEN} />
                    <span style={{ fontSize: 11, color: SLATE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Avg Engagement
                    </span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: GREEN }}>{avgEngagement.toFixed(1)}%</div>
                  <div style={{ fontSize: 11, color: SLATE, marginTop: 4 }}>
                    (likes + comments + shares) / impressions
                  </div>
                </div>

                {/* Posts by Profile */}
                <div style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Users size={16} color={PURPLE} />
                    <span style={{ fontSize: 11, color: SLATE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      By Profile
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: PURPLE }}>{femiCount}</div>
                      <div style={{ fontSize: 11, color: SLATE }}>Femi</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: TEAL }}>{blCount}</div>
                      <div style={{ fontSize: 11, color: SLATE }}>B&amp;L</div>
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <TrendingUp size={16} color={TEAL} />
                    <span style={{ fontSize: 11, color: SLATE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Totals
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: LIGHT }}>{fmtNum(totalLikes)}</div>
                      <div style={{ fontSize: 10, color: SLATE }}>Likes</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: LIGHT }}>{fmtNum(totalComments)}</div>
                      <div style={{ fontSize: 10, color: SLATE }}>Comments</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: LIGHT }}>{fmtNum(totalShares)}</div>
                      <div style={{ fontSize: 10, color: SLATE }}>Shares</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: LIGHT }}>{fmtNum(totalImpressions)}</div>
                      <div style={{ fontSize: 10, color: SLATE }}>Impressions</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Section A: Post Performance Log ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={sectionTitle}>
                <BarChart3 size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Post Performance Log
              </div>
              <button
                onClick={() => setFormOpen(!formOpen)}
                style={{
                  background: TEAL,
                  color: NAVY,
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Plus size={15} />
                Add Post Result
              </button>
            </div>

            {/* Add Post Form */}
            {formOpen && (
              <div style={{ ...card, marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: LIGHT, marginBottom: 16 }}>Log Post Result</div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                  {/* Platform */}
                  <div>
                    <span style={label}>Platform</span>
                    <select
                      value={form.platform}
                      onChange={(e) => setForm({ ...form, platform: e.target.value })}
                      style={{ ...input, cursor: 'pointer' }}
                    >
                      <option value="linkedin">LinkedIn</option>
                    </select>
                  </div>

                  {/* Profile */}
                  <div>
                    <span style={label}>Profile</span>
                    <select
                      value={form.profile}
                      onChange={(e) => setForm({ ...form, profile: e.target.value })}
                      style={{ ...input, cursor: 'pointer' }}
                    >
                      <option value="Femi">Femi</option>
                      <option value="B&L">B&amp;L</option>
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <span style={label}>Date</span>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      style={input}
                    />
                  </div>
                </div>

                {/* Post Excerpt */}
                <div style={{ marginTop: 14 }}>
                  <span style={label}>Post Excerpt</span>
                  <input
                    type="text"
                    placeholder="First 100 characters of the post..."
                    maxLength={100}
                    value={form.post_excerpt}
                    onChange={(e) => setForm({ ...form, post_excerpt: e.target.value })}
                    style={input}
                  />
                </div>

                {/* Metrics row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 14, marginTop: 14 }}>
                  <div>
                    <span style={label}>Likes</span>
                    <input
                      type="number"
                      min={0}
                      value={form.likes}
                      onChange={(e) => setForm({ ...form, likes: Number(e.target.value) })}
                      style={input}
                    />
                  </div>
                  <div>
                    <span style={label}>Comments</span>
                    <input
                      type="number"
                      min={0}
                      value={form.comments}
                      onChange={(e) => setForm({ ...form, comments: Number(e.target.value) })}
                      style={input}
                    />
                  </div>
                  <div>
                    <span style={label}>Shares</span>
                    <input
                      type="number"
                      min={0}
                      value={form.shares}
                      onChange={(e) => setForm({ ...form, shares: Number(e.target.value) })}
                      style={input}
                    />
                  </div>
                  <div>
                    <span style={label}>Impressions</span>
                    <input
                      type="number"
                      min={0}
                      value={form.impressions}
                      onChange={(e) => setForm({ ...form, impressions: Number(e.target.value) })}
                      style={input}
                    />
                  </div>
                </div>

                {submitError && (
                  <div style={{ color: RED, fontSize: 13, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={14} />
                    {submitError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      background: TEAL,
                      color: NAVY,
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 24px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {submitting && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                    {submitting ? 'Saving...' : 'Save Post Result'}
                  </button>
                  <button
                    onClick={() => {
                      setFormOpen(false);
                      setSubmitError(null);
                    }}
                    style={{
                      background: 'transparent',
                      color: SLATE,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 8,
                      padding: '10px 20px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Post list */}
            {posts.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: SLATE, fontSize: 14, padding: 40 }}>
                No posts logged yet. Click &quot;Add Post Result&quot; to start tracking.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                {posts.map((p) => {
                  const meta = p.piece.metadata as Record<string, unknown> | null;
                  const profile = (meta?.profile as string) ?? '—';
                  const dateStr = p.piece.published_at
                    ? new Date(p.piece.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : new Date(p.piece.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                  const engagement =
                    p.metrics.impressions > 0
                      ? (((p.metrics.likes + p.metrics.comments + p.metrics.shares) / p.metrics.impressions) * 100).toFixed(1)
                      : '0.0';

                  return (
                    <div key={p.piece.id} style={card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                                color: NAVY,
                                background: p.piece.platform === 'linkedin' ? '#0A66C2' : TEAL,
                                padding: '2px 8px',
                                borderRadius: 4,
                              }}
                            >
                              {p.piece.platform}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: profile === 'Femi' ? PURPLE : TEAL,
                                border: `1px solid ${profile === 'Femi' ? PURPLE : TEAL}`,
                                padding: '2px 8px',
                                borderRadius: 4,
                              }}
                            >
                              {profile}
                            </span>
                            <span style={{ fontSize: 11, color: SLATE }}>{dateStr}</span>
                          </div>
                          <div style={{ fontSize: 14, color: LIGHT, lineHeight: 1.5 }}>
                            {p.piece.title.slice(0, 100)}{p.piece.title.length > 100 ? '...' : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 16, flexShrink: 0, alignItems: 'center' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: LIGHT }}>{fmtNum(p.metrics.likes)}</div>
                            <div style={{ fontSize: 9, color: SLATE, textTransform: 'uppercase', letterSpacing: 0.5 }}>Likes</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: LIGHT }}>{fmtNum(p.metrics.comments)}</div>
                            <div style={{ fontSize: 9, color: SLATE, textTransform: 'uppercase', letterSpacing: 0.5 }}>Comments</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: LIGHT }}>{fmtNum(p.metrics.shares)}</div>
                            <div style={{ fontSize: 9, color: SLATE, textTransform: 'uppercase', letterSpacing: 0.5 }}>Shares</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: TEAL }}>{fmtNum(p.metrics.impressions)}</div>
                            <div style={{ fontSize: 9, color: SLATE, textTransform: 'uppercase', letterSpacing: 0.5 }}>Impressions</div>
                          </div>
                          <div
                            style={{
                              textAlign: 'center',
                              background: NAVY_MID,
                              borderRadius: 8,
                              padding: '6px 12px',
                            }}
                          >
                            <div style={{ fontSize: 14, fontWeight: 700, color: GREEN }}>{engagement}%</div>
                            <div style={{ fontSize: 9, color: SLATE, textTransform: 'uppercase', letterSpacing: 0.5 }}>Eng Rate</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Section C: Channel Conversion Funnel ── */}
            <div style={sectionTitle}>
              <Send size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Channel Conversion Funnel
            </div>

            {weeklyStats.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', color: SLATE, fontSize: 14, padding: 40 }}>
                No outreach data found in bl_weekly_stats.
              </div>
            ) : (
              <div style={card}>
                {/* Funnel bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Sent', value: funnelSent, icon: <Send size={15} color={LIGHT} />, color: LIGHT },
                    { label: 'Accepted', value: funnelAccepted, icon: <UserCheck size={15} color={TEAL} />, color: TEAL },
                    { label: 'Replied', value: funnelReplied, icon: <MessageSquare size={15} color={PURPLE} />, color: PURPLE },
                    { label: 'Calls Booked', value: funnelBooked, icon: <Phone size={15} color={GREEN} />, color: GREEN },
                  ].map((stage, i) => {
                    const widthPct = funnelSent > 0 ? Math.max((stage.value / funnelSent) * 100, 8) : 0;
                    return (
                      <div key={stage.label}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          {stage.icon}
                          <span style={{ fontSize: 12, color: SLATE, fontWeight: 600, width: 100 }}>{stage.label}</span>
                          <span style={{ fontSize: 18, fontWeight: 700, color: stage.color }}>{fmtNum(stage.value)}</span>
                        </div>
                        <div style={{ background: NAVY_MID, borderRadius: 6, height: 28, width: '100%', position: 'relative', overflow: 'hidden' }}>
                          <div
                            style={{
                              background: stage.color,
                              opacity: 0.25,
                              height: '100%',
                              width: `${widthPct}%`,
                              borderRadius: 6,
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Conversion rates */}
                <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                  {[
                    { from: 'Sent', to: 'Accepted', rate: pct(funnelAccepted, funnelSent), color: TEAL },
                    { from: 'Accepted', to: 'Replied', rate: pct(funnelReplied, funnelAccepted), color: PURPLE },
                    { from: 'Replied', to: 'Booked', rate: pct(funnelBooked, funnelReplied), color: GREEN },
                  ].map((conv) => (
                    <div
                      key={conv.from + conv.to}
                      style={{
                        flex: 1,
                        minWidth: 140,
                        background: NAVY_MID,
                        borderRadius: 8,
                        padding: '12px 16px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 10, color: SLATE, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        {conv.from} <ChevronRight size={10} /> {conv.to}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: conv.color }}>{conv.rate}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
