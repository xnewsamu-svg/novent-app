import { describe, it, expect } from "vitest"
import { validateNodes } from "../validators/node-validator"
import type { WorkflowNode } from "../types/workflow"

describe("NodeValidator", () => {
  it("passes valid nodes", () => {
    const nodes: WorkflowNode[] = [
      { id: "t1", type: "trigger", position: { x: 0, y: 0 }, config: {} },
      { id: "a1", type: "action.whatsapp.send", position: { x: 100, y: 0 }, config: { actionType: "action.whatsapp.send" } },
      { id: "e1", type: "end", position: { x: 200, y: 0 }, config: {} },
    ]
    const errors = validateNodes(nodes)
    expect(errors).toHaveLength(0)
  })

  it("rejects empty nodes array", () => {
    const errors = validateNodes([])
    expect(errors.length).toBeGreaterThan(0)
  })

  it("rejects missing node id", () => {
    const nodes: WorkflowNode[] = [
      { id: "", type: "trigger", position: { x: 0, y: 0 }, config: {} },
    ]
    const errors = validateNodes(nodes)
    expect(errors.some((e) => e.message.includes("missing id"))).toBe(true)
  })

  it("rejects duplicate node ids", () => {
    const nodes: WorkflowNode[] = [
      { id: "n1", type: "trigger", position: { x: 0, y: 0 }, config: {} },
      { id: "n1", type: "end", position: { x: 100, y: 0 }, config: {} },
    ]
    const errors = validateNodes(nodes)
    expect(errors.some((e) => e.message.includes("Duplicate"))).toBe(true)
  })

  it("rejects missing node type", () => {
    const nodes: WorkflowNode[] = [
      { id: "n1", type: "", position: { x: 0, y: 0 }, config: {} },
    ]
    const errors = validateNodes(nodes)
    expect(errors.some((e) => e.message.includes("missing type"))).toBe(true)
  })

  it("rejects missing config", () => {
    const nodes = [
      { id: "n1", type: "trigger", position: { x: 0, y: 0 } },
    ] as WorkflowNode[]
    const errors = validateNodes(nodes)
    expect(errors.some((e) => e.message.includes("missing config"))).toBe(true)
  })

  it("rejects multiple trigger nodes", () => {
    const nodes: WorkflowNode[] = [
      { id: "t1", type: "trigger", position: { x: 0, y: 0 }, config: {} },
      { id: "t2", type: "trigger", position: { x: 100, y: 0 }, config: {} },
      { id: "e1", type: "end", position: { x: 200, y: 0 }, config: {} },
    ]
    const errors = validateNodes(nodes)
    expect(errors.some((e) => e.message.includes("2 trigger"))).toBe(true)
  })

  it("rejects missing trigger node", () => {
    const nodes: WorkflowNode[] = [
      { id: "e1", type: "end", position: { x: 0, y: 0 }, config: {} },
    ]
    const errors = validateNodes(nodes)
    expect(errors.some((e) => e.message.includes("trigger node"))).toBe(true)
  })

  it("rejects missing end node", () => {
    const nodes: WorkflowNode[] = [
      { id: "t1", type: "trigger", position: { x: 0, y: 0 }, config: {} },
    ]
    const errors = validateNodes(nodes)
    expect(errors.some((e) => e.message.includes("end node"))).toBe(true)
  })
})
