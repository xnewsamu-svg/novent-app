import { nodeRegistry } from "../registry/node-registry"
import { actionRegistry } from "../registry/action-registry"
import type { WorkflowNode } from "../types/workflow"
import type { ExecutionContext } from "../types/execution"

const actionExecutor = {
  type: "action.*",
  async execute(
    node: WorkflowNode,
    context: ExecutionContext,
    deps: Record<string, unknown>,
  ) {
    const actionType = node.type
    if (!actionRegistry.has(actionType)) {
      return {
        success: false,
        output: null,
        error: `Action not registered: ${actionType}`,
        retryable: false,
      }
    }

    const executor = actionRegistry.get(actionType)
    return executor.execute(node.config, context, deps)
  },
}

nodeRegistry.register(actionExecutor)

export default actionExecutor
