import { nodeRegistry } from "../registry/node-registry"
import type { WorkflowNode } from "../types/workflow"
import type { ExecutionContext } from "../types/execution"

const endExecutor = {
  type: "end",
  async execute(
    _node: WorkflowNode,
    _context: ExecutionContext,
    _deps: Record<string, unknown>,
  ) {
    return {
      success: true,
      output: { terminated: true },
      error: null,
      retryable: false,
    }
  },
}

nodeRegistry.register(endExecutor)

export default endExecutor
