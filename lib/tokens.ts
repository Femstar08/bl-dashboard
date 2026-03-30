export const COLORS = {
  NAVY:     '#0F1B35',
  NAVY_MID: '#162240',
  NAVY_CARD:'#1E2F52',
  TEAL:     '#53E9C5',
  TEAL_DIM: '#2BB89A',
  SLATE:    '#5C6478',
  LIGHT:    '#E8EDF5',
  BORDER:   'rgba(83,233,197,0.15)',
  AMBER:    '#F59E0B',
  GREEN:    '#34D399',
  RED:      '#F87171',
  PURPLE:   '#7C8CF8',
  ORANGE:   '#F97316',
}

export const PROSPECT_STAGES = [
  'Identified',
  'Connection Sent',
  'Connected',
  'Replied',
  'Call Booked',
  'Proposal',
  'Signed',
  'Dead',
] as const

export type ProspectStage = typeof PROSPECT_STAGES[number]

export const STAGE_COLORS: Record<ProspectStage, string> = {
  'Identified':      '#5C6478',
  'Connection Sent': '#7C8CF8',
  'Connected':       '#A78BFA',
  'Replied':         '#F59E0B',
  'Call Booked':     '#F97316',
  'Proposal':        '#53E9C5',
  'Signed':          '#34D399',
  'Dead':            '#F87171',
}

export const NEXT_STAGE: Partial<Record<ProspectStage, ProspectStage>> = {
  'Identified':      'Connection Sent',
  'Connection Sent': 'Connected',
  'Connected':       'Replied',
  'Replied':         'Call Booked',
  'Call Booked':     'Proposal',
  'Proposal':        'Signed',
}

// ── Lead pipeline stages (unified) ──────────────────────────────
export const LEAD_STAGES = [
  'New', 'Identified', 'Enriched', 'Contacted',
  'Engaged', 'Negotiation', 'Signed', 'Lost',
] as const

export type LeadStage = typeof LEAD_STAGES[number]

export const LEAD_STAGE_COLORS: Record<LeadStage, string> = {
  'New':         '#5C6478',
  'Identified':  '#7C8CF8',
  'Enriched':    '#A78BFA',
  'Contacted':   '#F59E0B',
  'Engaged':     '#F97316',
  'Negotiation': '#53E9C5',
  'Signed':      '#34D399',
  'Lost':        '#F87171',
}

export const LEAD_NEXT_STAGE: Partial<Record<LeadStage, LeadStage>> = {
  'New':         'Identified',
  'Identified':  'Enriched',
  'Enriched':    'Contacted',
  'Contacted':   'Engaged',
  'Engaged':     'Negotiation',
  'Negotiation': 'Signed',
}

export const LEAD_SOURCES = ['CompanyQuery', 'LinkedIn', 'Referral', 'Inbound', 'Manual', 'Event'] as const

export const SOURCE_COLORS: Record<string, string> = {
  CompanyQuery: '#53E9C5',
  LinkedIn: '#7C8CF8',
  Referral: '#F59E0B',
  Inbound: '#34D399',
  Manual: '#8892A4',
  Event: '#F97316',
  'Companies House Search': '#53E9C5',
  'ai_onboarding': '#A78BFA',
}
