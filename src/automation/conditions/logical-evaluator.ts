import { conditionRegistry } from "../registry/condition-registry"
import type { ConditionGroup, ConditionExpression } from "../types/condition"
import { isConditionGroup, isConditionLeaf } from "../types/condition"

function evaluateGroup(
  group: ConditionGroup,
  context: Record<string, unknown>,
  evaluateExpression: (expr: ConditionExpression, ctx: Record<string, unknown>) => boolean,
): boolean {
  switch (group.operator) {
    case "AND":
      return group.conditions.every((c) => evaluateExpression(c, context))

    case "OR":
      return group.conditions.some((c) => evaluateExpression(c, context))

    case "NOT": {
      if (group.conditions.length !== 1) {
        return false
      }
      return !evaluateExpression(group.conditions[0], context)
    }

    default:
      return false
  }
}

const logicalEvaluator = {
  type: "logical",
  evaluate(
    expression: ConditionExpression,
    context: Record<string, unknown>,
  ): boolean {
    const evaluateRecursive = (expr: ConditionExpression, ctx: Record<string, unknown>): boolean => {
      if (isConditionGroup(expr)) {
        return evaluateGroup(expr, ctx, evaluateRecursive)
      }
      if (isConditionLeaf(expr)) {
        const evaluator = conditionRegistry.get("comparison")
        return evaluator.evaluate(expr, ctx)
      }
      return false
    }
    return evaluateRecursive(expression, context)
  },
}

conditionRegistry.register(logicalEvaluator)

export { evaluateGroup, logicalEvaluator }
