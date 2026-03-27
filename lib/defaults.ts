import { Lead, ContentItem, Milestone, RevenueTarget } from './types'

export const DEFAULT_LEADS: Lead[] = [
  { id: '1', name: 'Practice A', type: 'Accountant', stage: 'Outreach', value: 3500, note: 'MTD-focused intro', createdAt: new Date().toISOString() },
  { id: '2', name: 'SME Client B', type: 'SME', stage: 'Discovery', value: 250, note: 'Fresha/Xero disconnect', createdAt: new Date().toISOString() },
]

export const DEFAULT_CONTENT: ContentItem[] = [
  { id: '1', channel: 'Femi', topic: 'How AI saved my client 10 hrs/week', status: 'Draft', scheduledDate: '', note: '' },
  { id: '2', channel: 'B&L', topic: 'MTD: are you actually ready?', status: 'Queued', scheduledDate: '', note: 'Accountant audience' },
  { id: '3', channel: 'B&L', topic: 'What fragmented data costs SMEs', status: 'Draft', scheduledDate: '', note: '' },
]

export const DEFAULT_MILESTONES: Milestone[] = [
  { id: '1', label: 'Lead magnets built (accountants + SMEs)', done: false, track: 'Marketing' },
  { id: '2', label: 'Email sequences written (both audiences)', done: false, track: 'Marketing' },
  { id: '3', label: 'LinkedIn outreach live', done: false, track: 'Marketing' },
  { id: '4', label: 'B&L company page refreshed', done: false, track: 'Marketing' },
  { id: '5', label: 'Femi profile headline updated', done: false, track: 'Marketing' },
  { id: '6', label: 'Provisioning + roles fixed', done: false, track: 'Platform' },
  { id: '7', label: 'Compliance UI deployed + wired', done: false, track: 'Platform' },
  { id: '8', label: 'Test matrix A–F passed', done: false, track: 'Platform' },
  { id: '9', label: 'BeaconBot MVP live (internal)', done: false, track: 'Platform' },
  { id: '10', label: 'Platform waitlist launched', done: false, track: 'Platform' },
  { id: '11', label: '3 accountant consulting clients signed', done: false, track: 'Consulting' },
  { id: '12', label: 'First SME case study published', done: false, track: 'Consulting' },
  { id: '13', label: 'First discovery calls booked (3+)', done: false, track: 'Consulting' },
]

export const DEFAULT_REVENUE: RevenueTarget = {
  mrr: 0,
  consultingTarget: 10500,
  saasTarget: 10000,
}
