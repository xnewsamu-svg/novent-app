import type { ConditionExpression } from "./condition"

export interface WorkflowNode {
  id: string
  type: string
  position: { x: number; y: number }
  config: Record<string, unknown>
}

export interface WorkflowEdge {
  id: string
  from: string
  to: string
  label: string | null
  branch: boolean | null
}

export interface WorkflowTrigger {
  eventType: string
  filters?: ConditionExpression | null
  schedule?: string | null
  config?: Record<string, unknown>
}

export interface Workflow {
  id: string
  companyId: string
  name: string
  description: string | null
  enabled: boolean
  version: number
  publishedAt: Date | null
  trigger: WorkflowTrigger
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: Date
  updatedAt: Date
}

export type ValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
}
