import { conditionRegistry } from "../registry/condition-registry"
import {
  type ConditionExpression,
  type ConditionLeaf,
  type ConditionGroup,
  isConditionGroup,
} from "../types/condition"
import { resolveValue } from "./variable-resolver"
import type { ExecutionContext } from "../types/execution"

export function evaluateExpression(
  expression: ConditionExpression,
  context: ExecutionContext,
): boolean {
  const ctx = context.eventPayload

  if (isConditionGroup(expression)) {
    return evaluateGroup(expression, ctx, context)
  }

  return evaluateLeafWithResolution(expression, ctx, context)
}

function evaluateGroup(
  group: ConditionGroup,
  ctx: Record<string, unknown>,
  executionContext: ExecutionContext,
): boolean {
  switch (group.operator) {
    case "AND":
      return group.conditions.every((c) => evaluateExpression(c, executionContext))

    case "OR":
      return group.conditions.some((c) => evaluateExpression(c, executionContext))

    case "NOT": {
      if (group.conditions.length !== 1) return false
      return !evaluateExpression(group.conditions[0], executionContext)
    }

    default:
      return false
  }
}

function evaluateLeafWithResolution(
  leaf: ConditionLeaf,
  ctx: Record<string, unknown>,
  executionContext: ExecutionContext,
): boolean {
  const resolvedValue = resolveValue(leaf.value, executionContext)
  const evaluator = conditionRegistry.get("comparison")
  return evaluator.evaluate(
    { ...leaf, value: resolvedValue },
    ctx,
  )
}
