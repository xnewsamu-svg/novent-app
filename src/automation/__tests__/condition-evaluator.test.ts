import { describe, it, expect } from "vitest"
import { evaluateExpression } from "../engine/condition-evaluator"

import "../conditions/comparison-evaluator"
import "../conditions/logical-evaluator"

describe("ConditionEvaluator", () => {
  const context = {
    eventPayload: { total: 150, status: "active", name: "Juan", tags: ["vip", "new"] },
    variables: { greeting: "Hola" },
    visitedNodes: ["n1"],
    delayedUntil: null,
  }

  it("evaluates equality (==) as true", () => {
    expect(evaluateExpression({ field: "total", op: "==", value: "active" }, context)).toBe(false)
    expect(evaluateExpression({ field: "status", op: "==", value: "active" }, context)).toBe(true)
  })

  it("evaluates equality (==) as false", () => {
    expect(evaluateExpression({ field: "status", op: "==", value: "inactive" }, context)).toBe(false)
  })

  it("evaluates not-equal (!=) as true", () => {
    expect(evaluateExpression({ field: "status", op: "!=", value: "inactive" }, context)).toBe(true)
  })

  it("evaluates greater-than (>) as true", () => {
    expect(evaluateExpression({ field: "total", op: ">", value: 100 }, context)).toBe(true)
  })

  it("evaluates greater-than (>) as false", () => {
    expect(evaluateExpression({ field: "total", op: ">", value: 200 }, context)).toBe(false)
  })

  it("evaluates less-than (<)", () => {
    expect(evaluateExpression({ field: "total", op: "<", value: 200 }, context)).toBe(true)
  })

  it("evaluates contains as true", () => {
    expect(evaluateExpression({ field: "name", op: "contains", value: "ua" }, context)).toBe(true)
  })

  it("evaluates contains as false", () => {
    expect(evaluateExpression({ field: "name", op: "contains", value: "xyz" }, context)).toBe(false)
  })

  it("evaluates startsWith as true", () => {
    expect(evaluateExpression({ field: "name", op: "startsWith", value: "Ju" }, context)).toBe(true)
  })

  it("evaluates endsWith as true", () => {
    expect(evaluateExpression({ field: "name", op: "endsWith", value: "an" }, context)).toBe(true)
  })

  it("evaluates exists as true", () => {
    expect(evaluateExpression({ field: "total", op: "exists" }, context)).toBe(true)
  })

  it("evaluates exists as false", () => {
    expect(evaluateExpression({ field: "nonexistent", op: "exists" }, context)).toBe(false)
  })

  it("evaluates in operator as true", () => {
    expect(evaluateExpression({ field: "status", op: "in", value: ["active", "vip"] }, context)).toBe(true)
  })

  it("evaluates AND group (all true)", () => {
    const expr = {
      operator: "AND" as const,
      conditions: [
        { field: "total", op: ">" as const, value: 100 },
        { field: "status", op: "==" as const, value: "active" },
      ],
    }
    expect(evaluateExpression(expr, context)).toBe(true)
  })

  it("evaluates AND group (one false)", () => {
    const expr = {
      operator: "AND" as const,
      conditions: [
        { field: "total", op: ">" as const, value: 100 },
        { field: "status", op: "==" as const, value: "inactive" },
      ],
    }
    expect(evaluateExpression(expr, context)).toBe(false)
  })

  it("evaluates OR group (one true)", () => {
    const expr = {
      operator: "OR" as const,
      conditions: [
        { field: "total", op: ">" as const, value: 200 },
        { field: "status", op: "==" as const, value: "active" },
      ],
    }
    expect(evaluateExpression(expr, context)).toBe(true)
  })

  it("evaluates OR group (all false)", () => {
    const expr = {
      operator: "OR" as const,
      conditions: [
        { field: "total", op: ">" as const, value: 200 },
        { field: "status", op: "==" as const, value: "inactive" },
      ],
    }
    expect(evaluateExpression(expr, context)).toBe(false)
  })

  it("evaluates NOT group", () => {
    const expr = {
      operator: "NOT" as const,
      conditions: [
        { field: "status", op: "==" as const, value: "inactive" },
      ],
    }
    expect(evaluateExpression(expr, context)).toBe(true)
  })
})
