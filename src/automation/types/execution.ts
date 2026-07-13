export type ExecutionStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled"

export type LogStatus = "success" | "error" | "skipped" | "pending"

export interface ExecutionContext {
  eventPayload: Record<string, unknown>
  variables: Record<string, unknown>
  visitedNodes: string[]
  delayedUntil: Date | null
}

export interface Execution {
  id: string
  workflowId: string
  workflowVersion: number
  companyId: string
  triggerEvent: string
  status: ExecutionStatus
  triggeredAt: Date
  startedAt: Date | null
  finishedAt: Date | null
  currentNodeId: string | null
  context: ExecutionContext
  error: string | null
  duration: number | null
  retryCount: number
  maxRetries: number
  createdBy: string | null
}

export interface ExecutionLog {
  id: string
  executionId: string
  companyId: string
  nodeId: string
  nodeType: string
  status: LogStatus
  timestamp: Date
  duration: number | null
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  error: string | null
  retryAttempt: number
}
