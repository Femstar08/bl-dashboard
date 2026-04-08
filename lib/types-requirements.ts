export interface Requirement {
  id: string
  ref_id: string
  phase: string
  domain: string
  requirement: string
  type: string
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  status: 'Backlog' | 'Ready' | 'In Progress' | 'Review' | 'Done' | 'Blocked'
  assigned_to: string | null
  complexity: 'S' | 'M' | 'L' | 'XL'
  dependencies: string[]
  acceptance_criteria: string | null
  saas_tier_gate: string
  upgrade_feature: boolean
  notes: string | null
  source: 'sync' | 'upload' | 'manual'
  created_at: string
  updated_at: string
}

export interface Phase {
  id: string
  phase: string
  description: string
  week_target: string
  dependencies: string | null
  total_reqs: number
  critical_count: number
  gate_criteria: string | null
}

export interface ContentCalendarItem {
  id: string
  week: number
  publish_date: string
  day: string
  channel: string
  format: string
  pillar: string
  topic: string
  key_message: string | null
  cta: string | null
  script_draft: string | null
  status: 'To Draft' | 'Drafting' | 'Review' | 'Scheduled' | 'Published'
  performance: { likes?: number; comments?: number; shares?: number; impressions?: number } | null
  notes: string | null
  source: 'sync' | 'upload' | 'manual'
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  entity_type: 'requirement' | 'content_calendar'
  entity_id: string
  parent_id: string | null
  author: string
  body: string
  created_at: string
  updated_at: string
}

export interface SyncConfig {
  id: string
  entity_type: 'requirement' | 'content_calendar'
  google_sheet_id: string | null
  sheet_tab: string | null
  last_synced_at: string | null
  sync_enabled: boolean
}

export const REQ_STATUSES = ['Backlog', 'Ready', 'In Progress', 'Review', 'Done', 'Blocked'] as const
export const REQ_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const
export const REQ_COMPLEXITIES = ['S', 'M', 'L', 'XL'] as const
export const CAL_STATUSES = ['To Draft', 'Drafting', 'Review', 'Scheduled', 'Published'] as const

export const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#F87171',
  High: '#F59E0B',
  Medium: '#7C8CF8',
  Low: '#8892a8',
}

export const STATUS_COLORS: Record<string, string> = {
  Backlog: '#8892a8',
  Ready: '#60a5fa',
  'In Progress': '#F59E0B',
  Review: '#7C8CF8',
  Done: '#34D399',
  Blocked: '#F87171',
}

export const CAL_STATUS_COLORS: Record<string, string> = {
  'To Draft': '#8892a8',
  Drafting: '#60a5fa',
  Review: '#F59E0B',
  Scheduled: '#7C8CF8',
  Published: '#34D399',
}

export const PILLAR_COLORS: Record<string, string> = {
  'Compliance Made Simple': '#53E9C5',
  'Behind the Practice': '#7C8CF8',
  'Tax & Deadline Alerts': '#F59E0B',
  'Automation & Efficiency': '#60a5fa',
  'Industry Insight': '#F87171',
  'Client Wins': '#34D399',
}
