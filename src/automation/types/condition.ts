export type ComparisonOperator =
  | "==" | "!=" | "<" | ">" | "<=" | ">="
  | "contains" | "startsWith" | "endsWith"
  | "exists" | "in" | "notIn"

export type LogicalOperator = "AND" | "OR" | "NOT"

export interface ConditionLeaf {
  field: string
  op: ComparisonOperator
  value?: unknown
}

export interface ConditionGroup {
  operator: LogicalOperator
  conditions: ConditionExpression[]
}

export type ConditionExpression = ConditionLeaf | ConditionGroup

export function isConditionGroup(expr: ConditionExpression): expr is ConditionGroup {
  return "operator" in expr
}

export function isConditionLeaf(expr: ConditionExpression): expr is ConditionLeaf {
  return "field" in expr
}

export interface ConditionEvaluator {
  type: string
  evaluate(
    expression: ConditionExpression,
    context: Record<string, unknown>,
  ): boolean
}
