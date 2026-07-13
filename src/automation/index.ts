// ============================================================================
// AUTO-REGISTRATION IMPORTS
// ============================================================================

import "./conditions/comparison-evaluator"
import "./conditions/logical-evaluator"
import "./executors/trigger-executor"
import "./executors/condition-executor"
import "./executors/action-executor"
import "./executors/delay-executor"
import "./executors/end-executor"
import "./actions/whatsapp.action"
import "./actions/email.action"
import "./actions/webhook.action"
import "./actions/customer-create.action"
import "./actions/customer-update.action"
import "./actions/sale-create.action"
import "./actions/inventory-update.action"
import "./actions/event-emit.action"
import "./actions/delay.action"
import "./actions/cita-create.action"
import "./triggers/customer-events.trigger"
import "./triggers/sale-events.trigger"
import "./triggers/inventory-events.trigger"
import "./triggers/lead-received.trigger"
import "./triggers/birthday.trigger"
import "./triggers/scheduled.trigger"
import "./triggers/webhook.trigger"
import "./triggers/whatsapp-keyword.trigger"
import "./triggers/whatsapp-status.trigger"

// ============================================================================
// REGISTRIES
// ============================================================================

export { actionRegistry } from "./registry/action-registry"
export { triggerRegistry } from "./registry/trigger-registry"
export { conditionRegistry } from "./registry/condition-registry"
export { nodeRegistry } from "./registry/node-registry"

// ============================================================================
// TYPES
// ============================================================================

export type { AutomationEvent, AutomationEventType } from "./types/events"
export type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowTrigger,
  ValidationResult,
} from "./types/workflow"
export type {
  Execution,
  ExecutionContext,
  ExecutionLog,
  ExecutionStatus,
  LogStatus,
} from "./types/execution"
export type { TriggerMatcher } from "./types/trigger"
export type {
  ActionExecutor,
  ActionDependencies,
  ActionResult,
} from "./types/action"
export type {
  ConditionExpression,
  ConditionLeaf,
  ConditionGroup,
  ConditionEvaluator,
  ComparisonOperator,
  LogicalOperator,
} from "./types/condition"
export {
  isConditionGroup,
  isConditionLeaf,
} from "./types/condition"

// ============================================================================
// ENGINE
// ============================================================================

export { buildContext, resolveFromContext, setVariable, getOutputVariable } from "./engine/context-builder"
export { evaluateExpression } from "./engine/condition-evaluator"
export { executeNode } from "./engine/node-executor"
export {
  run,
  runExecution,
  resumeExecution,
  retryExecution,
  findFirstNode,
  findNextNode,
  completeExecution,
  MAX_NODE_VISITS,
  MAX_RETRIES,
  MAX_DURATION_MS,
} from "./engine/workflow-engine"
export type { EngineServices } from "./engine/workflow-engine"
export { resolvePath, resolveTemplate, resolveValue } from "./engine/variable-resolver"
export { AutomationEventBus, automationEventBus } from "./engine/event-bus"

// ============================================================================
// VALIDATORS
// ============================================================================

export { validateWorkflow } from "./validators/workflow-validator"
export { validateNodes } from "./validators/node-validator"
export type { NodeValidationError } from "./validators/node-validator"
export { validateEdges } from "./validators/edge-validator"
export type { EdgeValidationError } from "./validators/edge-validator"

// ============================================================================
// SERVICES
// ============================================================================

export { workflowService } from "./services/workflow.service"
export type { IWorkflowService } from "./services/workflow.service"
export { executionService } from "./services/execution.service"
export type { IExecutionService } from "./services/execution.service"
export { schedulerService } from "./services/scheduler.service"
export type { ISchedulerService } from "./services/scheduler.service"
export { createEngineAdapter } from "./services/engine-adapter"

// ============================================================================
// WHATSAPP PROVIDER
// ============================================================================

export * from "./providers/whatsapp"
