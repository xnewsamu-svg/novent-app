import { describe, it, expect } from "vitest"
import { validateEdges } from "../validators/edge-validator"
import type { WorkflowNode, WorkflowEdge } from "../types/workflow"

const trigger: WorkflowNode = { id: "t1", type: "trigger", position: { x: 0, y: 0 }, config: {} }
const action: WorkflowNode = { id: "a1", type: "action.whatsapp.send", position: { x: 100, y: 0 }, config: { actionType: "action.whatsapp.send" } }
const condition: WorkflowNode = { id: "c1", type: "condition", position: { x: 100, y: 100 }, config: { expression: {} } }
const end: WorkflowNode = { id: "e1", type: "end", position: { x: 200, y: 0 }, config: {} }

describe("EdgeValidator", () => {
  it("passes valid edges", () => {
    const edges: WorkflowEdge[] = [
      { id: "e1", from: "t1", to: "a1", label: null, branch: null },
      { id: "e2", from: "a1", to: "e1", label: null, branch: null },
    ]
    const errors = validateEdges([trigger, action, end], edges)
    expect(errors).toHaveLength(0)
  })

  it("rejects edges referencing non-existent from node", () => {
    const edges: WorkflowEdge[] = [
      { id: "e1", from: "nonexistent", to: "e1", label: null, branch: null },
    ]
    const errors = validateEdges([end], edges)
    expect(errors.some((e) => e.message.includes("non-existent"))).toBe(true)
  })

  it("rejects edges referencing non-existent to node", () => {
    const edges: WorkflowEdge[] = [
      { id: "e1", from: "e1", to: "nonexistent", label: null, branch: null },
    ]
    const errors = validateEdges([end], edges)
    expect(errors.some((e) => e.message.includes("non-existent"))).toBe(true)
  })

  it("rejects trigger node with more than one outgoing edge", () => {
    const edges: WorkflowEdge[] = [
      { id: "e1", from: "t1", to: "a1", label: null, branch: null },
      { id: "e2", from: "t1", to: "e1", label: null, branch: null },
    ]
    const errors = validateEdges([trigger, action, end], edges)
    expect(errors.some((e) => e.message.includes("exactly one"))).toBe(true)
  })

  it("rejects end node with outgoing edges", () => {
    const edges: WorkflowEdge[] = [
      { id: "e1", from: "e1", to: "t1", label: null, branch: null },
    ]
    const errors = validateEdges([end, trigger], edges)
    expect(errors.some((e) => e.message.includes("outgoing"))).toBe(true)
  })

  it("rejects condition without true/false branches", () => {
    const edges: WorkflowEdge[] = [
      { id: "e1", from: "c1", to: "e1", label: null, branch: null },
    ]
    const errors = validateEdges([condition, end], edges)
    expect(errors.some((e) => e.message.includes("true branch") || e.message.includes("false branch"))).toBe(true)
  })

  it("passes condition with true and false branches", () => {
    const allNodes = [condition, action, end]
    const edges: WorkflowEdge[] = [
      { id: "e1", from: "c1", to: "a1", label: "Sí", branch: true },
      { id: "e2", from: "c1", to: "e1", label: "No", branch: false },
      { id: "e3", from: "a1", to: "e1", label: null, branch: null },
    ]
    const errors = validateEdges(allNodes, edges)
    expect(errors).toHaveLength(0)
  })

  it("detects cycles", () => {
    const edges: WorkflowEdge[] = [
      { id: "e1", from: "a1", to: "t1", label: null, branch: null },
      { id: "e2", from: "t1", to: "a1", label: null, branch: null },
    ]
    const errors = validateEdges([trigger, action], edges)
    expect(errors.some((e) => e.message.includes("cycle"))).toBe(true)
  })
})
