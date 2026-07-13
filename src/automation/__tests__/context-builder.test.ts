import { describe, it, expect } from "vitest"
import { buildContext, resolveFromContext, setVariable, getOutputVariable } from "../engine/context-builder"
import type { AutomationEvent } from "../types/events"

function makeEvent(data: Record<string, unknown> = {}): AutomationEvent {
  return {
    id: "evt1",
    companyId: "comp1",
    type: "test.event",
    data,
    source: "test",
    timestamp: new Date(),
    correlationId: null,
  }
}

describe("ContextBuilder", () => {
  it("builds context from event", () => {
    const event = makeEvent({ customerName: "Juan", phone: "521234567890" })
    const ctx = buildContext(event)
    expect(ctx.eventPayload.customerName).toBe("Juan")
    expect(ctx.variables).toEqual({})
    expect(ctx.visitedNodes).toEqual([])
    expect(ctx.delayedUntil).toBeNull()
  })

  it("resolves dot-notation from context", () => {
    const event = makeEvent({ customerName: "Juan" })
    const ctx = buildContext(event)
    expect(resolveFromContext("event.customerName", ctx)).toBe("Juan")
  })

  it("returns undefined for unresolved path", () => {
    const ctx = buildContext(makeEvent({}))
    expect(resolveFromContext("event.nonexistent", ctx)).toBeUndefined()
  })

  it("sets and gets variables", () => {
    const ctx = buildContext(makeEvent({}))
    const updated = setVariable(ctx, "myVar", "myValue")
    expect(updated.variables.myVar).toBe("myValue")
    expect(ctx.variables.myVar).toBeUndefined()
  })

  it("gets output variable by node id", () => {
    const ctx = buildContext(makeEvent({}))
    ctx.variables.outputs = { n1: { result: "ok" } }
    expect(getOutputVariable(ctx, "n1", "result")).toBe("ok")
  })

  it("returns undefined for missing output variable", () => {
    const ctx = buildContext(makeEvent({}))
    expect(getOutputVariable(ctx, "nonexistent", "field")).toBeUndefined()
  })
})
