import { nodeRegistry } from "../registry/node-registry"
import { triggerRegistry } from "../registry/trigger-registry"
import type { WorkflowNode } from "../types/workflow"
import type { ExecutionContext } from "../types/execution"

const triggerExecutor = {
  type: "trigger",
  async execute(
    node: WorkflowNode,
    context: ExecutionContext,
    _deps: Record<string, unknown>,
  ) {
    const eventType = node.config.eventType as string | undefined
    if (!eventType) {
      return {
        success: false,
        output: null,
        error: "Trigger node missing eventType in config",
        retryable: false,
      }
    }

    if (!triggerRegistry.has(eventType)) {
      return {
        success: false,
        output: null,
        error: `Trigger not registered: ${eventType}`,
        retryable: false,
      }
    }

    return {
      success: true,
      output: { matched: true, triggerType: eventType },
      error: null,
      retryable: false,
    }
  },
}

nodeRegistry.register(triggerExecutor)

export default triggerExecutor
