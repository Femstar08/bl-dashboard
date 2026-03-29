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
