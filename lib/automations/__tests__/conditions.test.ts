import { describe, it, expect } from "vitest"
import { evaluateConditions } from "../conditions"
import type { AutomationCondition } from "@/lib/types"

describe("evaluateConditions", () => {
  it("returns true for empty conditions", () => {
    expect(evaluateConditions([], {})).toBe(true)
  })

  it("returns true when conditions is null/undefined", () => {
    expect(evaluateConditions(null as any, {})).toBe(true)
    expect(evaluateConditions(undefined as any, {})).toBe(true)
  })

  it("evaluates eq operator", () => {
    const c: AutomationCondition[] = [
      { field: "status", operator: "eq", value: "active" },
    ]
    expect(evaluateConditions(c, { status: "active" })).toBe(true)
    expect(evaluateConditions(c, { status: "inactive" })).toBe(false)
  })

  it("evaluates neq operator", () => {
    const c: AutomationCondition[] = [
      { field: "status", operator: "neq", value: "inactive" },
    ]
    expect(evaluateConditions(c, { status: "active" })).toBe(true)
    expect(evaluateConditions(c, { status: "inactive" })).toBe(false)
  })

  it("evaluates gt/gte/lt/lte operators", () => {
    const gt: AutomationCondition[] = [{ field: "total", operator: "gt", value: 100 }]
    expect(evaluateConditions(gt, { total: 101 })).toBe(true)
    expect(evaluateConditions(gt, { total: 100 })).toBe(false)

    const gte: AutomationCondition[] = [{ field: "total", operator: "gte", value: 100 }]
    expect(evaluateConditions(gte, { total: 100 })).toBe(true)
    expect(evaluateConditions(gte, { total: 99 })).toBe(false)

    const lt: AutomationCondition[] = [{ field: "total", operator: "lt", value: 100 }]
    expect(evaluateConditions(lt, { total: 99 })).toBe(true)
    expect(evaluateConditions(lt, { total: 100 })).toBe(false)

    const lte: AutomationCondition[] = [{ field: "total", operator: "lte", value: 100 }]
    expect(evaluateConditions(lte, { total: 100 })).toBe(true)
    expect(evaluateConditions(lte, { total: 101 })).toBe(false)
  })

  it("evaluates contains operator", () => {
    const c: AutomationCondition[] = [
      { field: "name", operator: "contains", value: "Juan" },
    ]
    expect(evaluateConditions(c, { name: "Juan Pérez" })).toBe(true)
    expect(evaluateConditions(c, { name: "Pedro" })).toBe(false)
  })

  it("evaluates in operator with array value", () => {
    const c: AutomationCondition[] = [
      { field: "status", operator: "in", value: ["active", "vip"] },
    ]
    expect(evaluateConditions(c, { status: "active" })).toBe(true)
    expect(evaluateConditions(c, { status: "vip" })).toBe(true)
    expect(evaluateConditions(c, { status: "inactive" })).toBe(false)
  })

  it("evaluates in operator with comma-separated string value", () => {
    const c: AutomationCondition[] = [
      { field: "status", operator: "in", value: "active,vip" },
    ]
    expect(evaluateConditions(c, { status: "active" })).toBe(true)
    expect(evaluateConditions(c, { status: "vip" })).toBe(true)
    expect(evaluateConditions(c, { status: "inactive" })).toBe(false)
  })

  it("evaluates in operator with single-item string value", () => {
    const c: AutomationCondition[] = [
      { field: "status", operator: "in", value: "active" },
    ]
    expect(evaluateConditions(c, { status: "active" })).toBe(true)
    expect(evaluateConditions(c, { status: "inactive" })).toBe(false)
  })

  it("evaluates not_in operator with array value", () => {
    const c: AutomationCondition[] = [
      { field: "status", operator: "not_in", value: ["inactive", "lost"] },
    ]
    expect(evaluateConditions(c, { status: "active" })).toBe(true)
    expect(evaluateConditions(c, { status: "inactive" })).toBe(false)
  })

  it("evaluates not_in operator with comma-separated string value", () => {
    const c: AutomationCondition[] = [
      { field: "status", operator: "not_in", value: "inactive,lost" },
    ]
    expect(evaluateConditions(c, { status: "active" })).toBe(true)
    expect(evaluateConditions(c, { status: "inactive" })).toBe(false)
  })

  it("evaluates not_in operator with single-item string value", () => {
    const c: AutomationCondition[] = [
      { field: "status", operator: "not_in", value: "inactive" },
    ]
    expect(evaluateConditions(c, { status: "active" })).toBe(true)
    expect(evaluateConditions(c, { status: "inactive" })).toBe(false)
  })

  it("evaluates multiple conditions as AND", () => {
    const c: AutomationCondition[] = [
      { field: "status", operator: "eq", value: "active" },
      { field: "total", operator: "gte", value: 100 },
    ]
    expect(evaluateConditions(c, { status: "active", total: 150 })).toBe(true)
    expect(evaluateConditions(c, { status: "active", total: 50 })).toBe(false)
    expect(evaluateConditions(c, { status: "inactive", total: 150 })).toBe(false)
  })

  it("accesses nested fields via dot notation", () => {
    const c: AutomationCondition[] = [
      { field: "customer.status", operator: "eq", value: "vip" },
    ]
    expect(evaluateConditions(c, { customer: { status: "vip" } })).toBe(true)
    expect(evaluateConditions(c, { customer: { status: "active" } })).toBe(false)
  })

  it("handles missing nested path gracefully", () => {
    const c: AutomationCondition[] = [
      { field: "customer.nonexistent", operator: "eq", value: "anything" },
    ]
    expect(evaluateConditions(c, { customer: {} })).toBe(false)
  })

  it("returns false for unsupported operator", () => {
    const c: AutomationCondition[] = [
      { field: "x", operator: "unsupported" as any, value: "y" },
    ]
    expect(evaluateConditions(c, { x: "y" })).toBe(false)
  })
})
