import { conditionRegistry } from "../registry/condition-registry"
import type { ConditionLeaf, ComparisonOperator } from "../types/condition"
import { resolvePath } from "../engine/variable-resolver"

type OperatorFn = (value: unknown, target: unknown) => boolean

const operators = new Map<ComparisonOperator, OperatorFn>([
  ["==", (v, t) => v === t],
  ["!=", (v, t) => v !== t],
  ["<", (v, t) => typeof v === "number" && typeof t === "number" && v < t],
  [">", (v, t) => typeof v === "number" && typeof t === "number" && v > t],
  ["<=", (v, t) => typeof v === "number" && typeof t === "number" && v <= t],
  [">=", (v, t) => typeof v === "number" && typeof t === "number" && v >= t],
  ["contains", (v, t) => typeof v === "string" && typeof t === "string" && v.includes(t)],
  ["startsWith", (v, t) => typeof v === "string" && typeof t === "string" && v.startsWith(t)],
  ["endsWith", (v, t) => typeof v === "string" && typeof t === "string" && v.endsWith(t)],
  ["exists", (v, _t) => v !== null && v !== undefined],
  ["in", (v, t) => Array.isArray(t) && t.includes(v)],
  ["notIn", (v, t) => Array.isArray(t) && !t.includes(v)],
])

function evaluateLeaf(leaf: ConditionLeaf, context: Record<string, unknown>): boolean {
  const value = resolvePath(context, leaf.field)
  const operator = operators.get(leaf.op)
  if (!operator) {
    return false
  }
  return operator(value, leaf.value)
}

const comparisonEvaluator = {
  type: "comparison",
  evaluate(
    expression: ConditionLeaf,
    context: Record<string, unknown>,
  ): boolean {
    return evaluateLeaf(expression, context)
  },
}

conditionRegistry.register(comparisonEvaluator)

export { evaluateLeaf, comparisonEvaluator }
