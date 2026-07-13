import { describe, it, expect, vi } from "vitest"
import { AutomationEventBus } from "../engine/event-bus"
import type { AutomationEvent } from "../types/events"

function makeEvent(type: string, data: Record<string, unknown> = {}): AutomationEvent {
  return {
    id: "evt1",
    companyId: "comp1",
    type,
    data,
    source: "test",
    timestamp: new Date(),
    correlationId: null,
  }
}

describe("AutomationEventBus", () => {
  it("subscribes and emits to a topic", async () => {
    const bus = new AutomationEventBus()
    const handler = vi.fn()
    bus.subscribe("workflow.started", handler)
    await bus.emit(makeEvent("workflow.started", { workflowId: "wf1" }))
    expect(handler).toHaveBeenCalled()
  })

  it("does not call handler for different topic", async () => {
    const bus = new AutomationEventBus()
    const handler = vi.fn()
    bus.subscribe("workflow.completed", handler)
    await bus.emit(makeEvent("workflow.started"))
    expect(handler).not.toHaveBeenCalled()
  })

  it("subscribes to all topics with subscribeAll", async () => {
    const bus = new AutomationEventBus()
    const handler = vi.fn()
    bus.subscribeAll(handler)
    await bus.emit(makeEvent("any.event", { data: 1 }))
    await bus.emit(makeEvent("another.event", { data: 2 }))
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it("unsubscribes a handler", async () => {
    const bus = new AutomationEventBus()
    const handler = vi.fn()
    const unsub = bus.subscribe("test", handler)
    unsub()
    await bus.emit(makeEvent("test"))
    expect(handler).not.toHaveBeenCalled()
  })

  it("handles multiple subscribers on same topic", async () => {
    const bus = new AutomationEventBus()
    const h1 = vi.fn()
    const h2 = vi.fn()
    bus.subscribe("test", h1)
    bus.subscribe("test", h2)
    await bus.emit(makeEvent("test", { value: 1 }))
    expect(h1).toHaveBeenCalled()
    expect(h2).toHaveBeenCalled()
  })
})
