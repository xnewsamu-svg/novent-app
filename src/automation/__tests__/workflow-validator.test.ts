import { describe, it, expect } from "vitest"
import { validateWorkflow } from "../validators/workflow-validator"
import type { Workflow } from "../types/workflow"

function createValidWorkflow(overrides?: Partial<Workflow>): Workflow {
  return {
    id: "wf1",
    companyId: "comp1",
    name: "Test Workflow",
    description: null,
    enabled: false,
    version: 1,
    publishedAt: null,
    trigger: { eventType: "customer.created", filters: null, schedule: null },
    nodes: [
      { id: "n1", type: "trigger", position: { x: 0, y: 0 }, config: {} },
      { id: "n2", type: "action.whatsapp.send", position: { x: 100, y: 0 }, config: { actionType: "action.whatsapp.send" } },
      { id: "n3", type: "end", position: { x: 200, y: 0 }, config: {} },
    ],
    edges: [
      { id: "e1", from: "n1", to: "n2", label: null, branch: null },
      { id: "e2", from: "n2", to: "n3", label: null, branch: null },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe("WorkflowValidator", () => {
  it("passes a valid workflow", () => {
    const result = validateWorkflow(createValidWorkflow())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("rejects workflow without name", () => {
    const result = validateWorkflow(createValidWorkflow({ name: "" }))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("name"))).toBe(true)
  })

  it("rejects workflow without companyId", () => {
    const result = validateWorkflow(createValidWorkflow({ companyId: "" }))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("companyId"))).toBe(true)
  })

  it("rejects workflow without trigger eventType", () => {
    const result = validateWorkflow(createValidWorkflow({ trigger: { eventType: "", filters: null, schedule: null } }))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("trigger"))).toBe(true)
  })

  it("rejects workflow without trigger node", () => {
    const wf = createValidWorkflow({ nodes: [
      { id: "n2", type: "action.whatsapp.send", position: { x: 100, y: 0 }, config: { actionType: "action.whatsapp.send" } },
      { id: "n3", type: "end", position: { x: 200, y: 0 }, config: {} },
    ] })
    const result = validateWorkflow(wf)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("trigger node"))).toBe(true)
  })

  it("rejects workflow without end node", () => {
    const wf = createValidWorkflow({ nodes: [
      { id: "n1", type: "trigger", position: { x: 0, y: 0 }, config: {} },
      { id: "n2", type: "action.whatsapp.send", position: { x: 100, y: 0 }, config: { actionType: "action.whatsapp.send" } },
    ] })
    const result = validateWorkflow(wf)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("end node"))).toBe(true)
  })

  it("rejects duplicate node ids", () => {
    const wf = createValidWorkflow({ nodes: [
      { id: "n1", type: "trigger", position: { x: 0, y: 0 }, config: {} },
      { id: "n1", type: "end", position: { x: 200, y: 0 }, config: {} },
    ] })
    const result = validateWorkflow(wf)
    expect(result.valid).toBe(false)
  })

  it("rejects multiple trigger nodes", () => {
    const wf = createValidWorkflow({ nodes: [
      { id: "n1", type: "trigger", position: { x: 0, y: 0 }, config: {} },
      { id: "n2", type: "trigger", position: { x: 100, y: 0 }, config: {} },
      { id: "n3", type: "end", position: { x: 200, y: 0 }, config: {} },
    ] })
    const result = validateWorkflow(wf)
    expect(result.valid).toBe(false)
  })

  it("rejects action node missing actionType", () => {
    const wf = createValidWorkflow({ nodes: [
      { id: "n1", type: "trigger", position: { x: 0, y: 0 }, config: {} },
      { id: "n2", type: "action.whatsapp.send", position: { x: 100, y: 0 }, config: {} },
      { id: "n3", type: "end", position: { x: 200, y: 0 }, config: {} },
    ] })
    const result = validateWorkflow(wf)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("actionType"))).toBe(true)
  })

  it("rejects condition node missing expression", () => {
    const wf = createValidWorkflow({ nodes: [
      { id: "n1", type: "trigger", position: { x: 0, y: 0 }, config: {} },
      { id: "n2", type: "condition", position: { x: 100, y: 0 }, config: {} },
      { id: "n3", type: "end", position: { x: 200, y: 0 }, config: {} },
    ] })
    const result = validateWorkflow(wf)
    expect(result.valid).toBe(false)
  })

  it("warns about unreachable nodes", () => {
    const wf = createValidWorkflow({ nodes: [
      { id: "n1", type: "trigger", position: { x: 0, y: 0 }, config: {} },
      { id: "n2", type: "end", position: { x: 100, y: 0 }, config: {} },
      { id: "orphan", type: "action.whatsapp.send", position: { x: 200, y: 0 }, config: { actionType: "action.whatsapp.send" } },
    ] })
    const result = validateWorkflow(wf)
    expect(result.warnings.some((w) => w.includes("unreachable"))).toBe(true)
  })
})
