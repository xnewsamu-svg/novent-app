import type { AutomationEvent } from "./events"
import type { ExecutionContext } from "./execution"
import type { Workflow } from "./workflow"

export interface TriggerMatcher {
  type: string
  label: string
  description: string
  match(event: AutomationEvent, workflow?: Workflow): boolean
  extractContext(event: AutomationEvent, workflow?: Workflow): Partial<ExecutionContext>
}
