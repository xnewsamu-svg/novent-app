import type { AutomationCondition, AutomationConditionOperator } from "@/lib/types"

export function evaluateConditions(
  conditions: AutomationCondition[],
  data: Record<string, unknown>
): boolean {
  if (!conditions || conditions.length === 0) return true
  return conditions.every((c) => {
    const actual = getNestedValue(data, c.field)
    return compare(actual, c.operator, c.value)
  })
}

function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined
    return (acc as Record<string, unknown>)[key]
  }, obj)
}

function toArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v
  if (typeof v === "string" && v.includes(",")) return v.split(",").map((s) => s.trim())
  return typeof v === "string" ? [v] : []
}

function compare(
  actual: unknown,
  operator: AutomationConditionOperator,
  expected: unknown
): boolean {
  switch (operator) {
    case "eq":
      return actual === expected
    case "neq":
      return actual !== expected
    case "gt":
      return Number(actual) > Number(expected)
    case "gte":
      return Number(actual) >= Number(expected)
    case "lt":
      return Number(actual) < Number(expected)
    case "lte":
      return Number(actual) <= Number(expected)
    case "contains":
      return String(actual).includes(String(expected))
    case "in": {
      const arr = toArray(expected)
      return arr.length > 0 && arr.includes(actual)
    }
    case "not_in": {
      const arr = toArray(expected)
      return arr.length > 0 && !arr.includes(actual)
    }
    default:
      return false
  }
}
