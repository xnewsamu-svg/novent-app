import {
  type ConditionExpression,
  type ConditionLeaf,
  type ConditionGroup,
  type ComparisonOperator,
  type LogicalOperator,
} from "../types/condition"

function isValidComparisonOperator(op: unknown): op is ComparisonOperator {
  const validOps: ComparisonOperator[] = [
    "==", "!=", "<", ">", "<=", ">=",
    "contains", "startsWith", "endsWith",
    "exists", "in", "notIn",
  ]
  return validOps.includes(op as ComparisonOperator)
}

function isValidLogicalOperator(op: unknown): op is LogicalOperator {
  return op === "AND" || op === "OR" || op === "NOT"
}

function parseLeaf(raw: Record<string, unknown>): ConditionLeaf {
  if (typeof raw.field !== "string" || !raw.field) {
    throw new Error("Invalid condition leaf: field must be a non-empty string")
  }
  if (!isValidComparisonOperator(raw.op)) {
    throw new Error(`Invalid condition leaf: invalid operator "${String(raw.op)}"`)
  }
  return {
    field: raw.field,
    op: raw.op,
    value: "value" in raw ? raw.value : undefined,
  }
}

function parseGroup(raw: Record<string, unknown>): ConditionGroup {
  if (!isValidLogicalOperator(raw.operator)) {
    throw new Error(`Invalid condition group: invalid operator "${String(raw.operator)}"`)
  }
  if (!Array.isArray(raw.conditions)) {
    throw new Error("Invalid condition group: conditions must be an array")
  }
  return {
    operator: raw.operator,
    conditions: raw.conditions.map((c) => parseConditionExpression(c)),
  }
}

export function parseConditionExpression(raw: unknown): ConditionExpression {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid condition expression: must be an object")
  }

  const obj = raw as Record<string, unknown>

  if ("field" in obj) {
    return parseLeaf(obj)
  }

  if ("operator" in obj) {
    return parseGroup(obj)
  }

  throw new Error("Invalid condition expression: missing field or operator")
}
