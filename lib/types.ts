export type LeadStage = 'Outreach' | 'Discovery' | 'Proposal' | 'Signed' | 'Lost'
export type LeadType = 'Accountant' | 'SME'
export type ContentStatus = 'Draft' | 'Queued' | 'Published'
export type ContentChannel = 'Femi' | 'B&L'
export type MilestoneTrack = 'Marketing' | 'Platform' | 'Consulting'

export interface Lead {
  id: string
  name: string
  type: LeadType
  stage: LeadStage
  value: number
  note: string
  createdAt: string
}

export interface ContentItem {
  id: string
  channel: ContentChannel
  topic: string
  status: ContentStatus
  scheduledDate: string
  note: string
}

export interface Milestone {
  id: string
  label: string
  done: boolean
  track: MilestoneTrack
}

export interface RevenueTarget {
  mrr: number
  consultingTarget: number
  saasTarget: number
}
