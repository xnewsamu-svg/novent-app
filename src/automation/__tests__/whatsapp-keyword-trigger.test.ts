import { describe, it, expect } from "vitest"
import type { AutomationEvent } from "../types/events"
import type { Workflow } from "../types/workflow"

// Re-register the trigger
import "../triggers/whatsapp-keyword.trigger"
import { triggerRegistry } from "../registry/trigger-registry"

function makeEvent(
  overrides: Partial<AutomationEvent> & { data?: Record<string, unknown> },
): AutomationEvent {
  return {
    id: "test-event",
    companyId: "test-company",
    type: "whatsapp.lead.received",
    data: {},
    source: "whatsapp",
    timestamp: new Date(),
    correlationId: "msg-123",
    ...overrides,
  }
}

function makeWorkflow(keyword: string, matchMode: "exact" | "contains" | "startsWith" = "contains"): Workflow {
  return {
    id: "wf-1",
    companyId: "test-company",
    name: "Test workflow",
    description: null,
    enabled: true,
    version: 1,
    publishedAt: new Date(),
    trigger: {
      eventType: "whatsapp.keyword_match",
      config: { keyword, matchMode },
    },
    nodes: [],
    edges: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe("whatsapp-keyword trigger", () => {
  it("Caso 1: mensaje 'confirmar' con keyword 'confirmar' → TRUE", () => {
    const event = makeEvent({
      data: {
        text: "confirmar",
        messageBody: "confirmar",
      },
    })
    const wf = makeWorkflow("confirmar", "contains")
    const matched = triggerRegistry.findMatchingWorkflows(event, [wf])
    expect(matched).toHaveLength(1)
    expect(matched[0].id).toBe("wf-1")
  })

  it("Caso 2: mensaje 'hola' con keyword 'confirmar' → FALSE", () => {
    const event = makeEvent({
      data: {
        text: "hola",
        messageBody: "hola",
      },
    })
    const wf = makeWorkflow("confirmar", "contains")
    const matched = triggerRegistry.findMatchingWorkflows(event, [wf])
    expect(matched).toHaveLength(0)
  })

  it("Caso 3: mensaje 'quiero confirmar mi cita' modo contains → TRUE", () => {
    const event = makeEvent({
      data: {
        text: "quiero confirmar mi cita",
        messageBody: "quiero confirmar mi cita",
      },
    })
    const wf = makeWorkflow("confirmar", "contains")
    const matched = triggerRegistry.findMatchingWorkflows(event, [wf])
    expect(matched).toHaveLength(1)
  })

  it("Caso 4a: lee desde event.data.message.text.body", () => {
    const event = makeEvent({
      data: {
        message: {
          from: "521234567890",
          id: "msg-1",
          timestamp: "1234567890",
          type: "text",
          text: { body: "confirmar" },
        },
      },
    })
    const wf = makeWorkflow("confirmar", "contains")
    const matched = triggerRegistry.findMatchingWorkflows(event, [wf])
    expect(matched).toHaveLength(1)
  })

  it("Caso 4b: lee desde event.data.text", () => {
    const event = makeEvent({
      data: {
        text: "confirmar",
      },
    })
    const wf = makeWorkflow("confirmar", "contains")
    const matched = triggerRegistry.findMatchingWorkflows(event, [wf])
    expect(matched).toHaveLength(1)
  })

  it("Caso 4c: lee desde event.data.messageBody", () => {
    const event = makeEvent({
      data: {
        messageBody: "confirmar",
      },
    })
    const wf = makeWorkflow("confirmar", "contains")
    const matched = triggerRegistry.findMatchingWorkflows(event, [wf])
    expect(matched).toHaveLength(1)
  })

  it("ignora eventos que no son de WhatsApp", () => {
    const event = makeEvent({
      type: "customer.created",
      data: {},
    })
    const wf = makeWorkflow("confirmar", "contains")
    const matched = triggerRegistry.findMatchingWorkflows(event, [wf])
    expect(matched).toHaveLength(0)
  })

  it("ignora workflows sin keyword configurada", () => {
    const event = makeEvent({
      data: {
        text: "confirmar",
        messageBody: "confirmar",
      },
    })
    const wf: Workflow = {
      id: "wf-2",
      companyId: "test-company",
      name: "Sin keyword",
      description: null,
      enabled: true,
      version: 1,
      publishedAt: new Date(),
      trigger: { eventType: "whatsapp.keyword_match", config: {} },
      nodes: [],
      edges: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const matched = triggerRegistry.findMatchingWorkflows(event, [wf])
    expect(matched).toHaveLength(0)
  })

  it("extrae contexto correctamente con keyword y matchMode", () => {
    const event = makeEvent({
      data: {
        text: "confirmar",
        messageBody: "confirmar",
      },
    })
    const wf = makeWorkflow("confirmar", "exact")

    const matcher = triggerRegistry.get("whatsapp.keyword_match")
    const ctx = matcher.extractContext(event, wf)

    expect(ctx.eventPayload?.messageBody).toBe("confirmar")
    expect(ctx.eventPayload?.keyword).toBe("confirmar")
    expect(ctx.eventPayload?.matchMode).toBe("exact")
  })
})
