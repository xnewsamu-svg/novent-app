import { nodeRegistry } from "../registry/node-registry"
import type { WorkflowNode } from "../types/workflow"
import type { ExecutionContext } from "../types/execution"
import { parseConditionExpression } from "../conditions/expression-parser"
import { evaluateExpression } from "../engine/condition-evaluator"

const conditionExecutor = {
  type: "condition",
  async execute(
    node: WorkflowNode,
    context: ExecutionContext,
    _deps: Record<string, unknown>,
  ) {
    try {
      const rawExpression = node.config.expression
      const expression = parseConditionExpression(rawExpression)

      const result = evaluateExpression(expression, context)

      return {
        success: true,
        output: { result, branch: result ? "true" : "false" },
        error: null,
        retryable: false,
      }
    } catch (err) {
      return {
        success: false,
        output: null,
        error: err instanceof Error ? err.message : "Condition evaluation error",
        retryable: false,
      }
    }
  },
}

nodeRegistry.register(conditionExecutor)

export default conditionExecutor
