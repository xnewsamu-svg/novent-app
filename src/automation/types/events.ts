export type AutomationEventType = string

export interface AutomationEvent {
  id: string
  companyId: string
  type: AutomationEventType
  data: Record<string, unknown>
  source: string
  timestamp: Date
  correlationId: string | null
}
