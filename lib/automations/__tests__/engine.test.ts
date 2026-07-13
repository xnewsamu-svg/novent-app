import { describe, it, expect, vi, beforeEach } from "vitest"
import { evaluateAutomationEvent, executeAutomationById } from "../engine"
import { evaluateConditions } from "../conditions"
import { createJob } from "../jobs"

vi.mock("../conditions", () => ({
  evaluateConditions: vi.fn(),
}))

vi.mock("../jobs", () => ({
  createJob: vi.fn(),
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: vi.fn(),
  },
}))

import { adminDb } from "@/lib/firebase-admin"

function makeChainedMock() {
  const execUpdateFn = vi.fn().mockResolvedValue(undefined)
  const addFn = vi.fn().mockResolvedValue({ id: "exec1", update: execUpdateFn })
  const updateFn = vi.fn()
  const getFn = vi.fn()
  const whereFn = vi.fn(() => ({ get: getFn, where: whereFn }))
  const docFn = vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: docFn,
      add: addFn,
      update: updateFn,
      get: getFn,
      where: whereFn,
    })),
    update: updateFn,
    get: getFn,
    ref: { update: updateFn },
  }))

  const collectionFn = vi.fn(() => ({
    doc: docFn,
    where: whereFn,
    add: addFn,
    get: getFn,
  }))

  return { collectionFn, docFn, whereFn, addFn, updateFn, getFn, execUpdateFn }
}

describe("evaluateAutomationEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns matched=0 when no automations match", async () => {
    const m = makeChainedMock()
    ;(adminDb.collection as any).mockImplementation(m.collectionFn)
    m.getFn.mockResolvedValue({ empty: true, docs: [], size: 0 })

    const result = await evaluateAutomationEvent("c1", "customer.created", {})
    expect(result).toEqual({ matched: 0, executions: [] })
  })

  it("skips automations whose conditions fail", async () => {
    const m = makeChainedMock()
    ;(adminDb.collection as any).mockImplementation(m.collectionFn)
    ;(evaluateConditions as any).mockReturnValue(false)

    const autoDoc = {
      id: "auto1",
      data: () => ({
        enabled: true,
        trigger: {
          event: "customer.created",
          conditions: [{ field: "status", operator: "eq", value: "vip" }],
        },
        actions: [{ type: "send_whatsapp", config: {}, order: 0 }],
      }),
      ref: { update: vi.fn() },
    }
    m.getFn.mockResolvedValue({ empty: false, docs: [autoDoc], size: 1 })

    const result = await evaluateAutomationEvent("c1", "customer.created", { status: "active" })
    expect(result).toEqual({ matched: 1, executions: [] })
    expect(createJob).not.toHaveBeenCalled()
  })

  it("creates jobs for matching automations", async () => {
    const m = makeChainedMock()
    ;(adminDb.collection as any).mockImplementation(m.collectionFn)
    ;(evaluateConditions as any).mockReturnValue(true)
    ;(createJob as any).mockResolvedValue("job1")

    const autoDoc = {
      id: "auto1",
      data: () => ({
        enabled: true,
        trigger: { event: "customer.created", conditions: [] },
        actions: [{ type: "send_whatsapp", config: { message: "Hola" }, order: 0 }],
      }),
      ref: { update: vi.fn() },
    }

    m.getFn.mockResolvedValue({ empty: false, docs: [autoDoc], size: 1 })
    const result = await evaluateAutomationEvent("c1", "customer.created", { customerId: "cuid1" })
    expect(result.matched).toBe(1)
    expect(result.executions).toEqual(["exec1"])
    expect(createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "c1",
        type: "send_whatsapp",
        automationId: "auto1",
        group: "whatsapp",
      })
    )
  })

  it("sorts actions by order before creating jobs", async () => {
    const m = makeChainedMock()
    ;(adminDb.collection as any).mockImplementation(m.collectionFn)
    ;(evaluateConditions as any).mockReturnValue(true)
    ;(createJob as any).mockResolvedValue("job1")

    const autoDoc = {
      id: "auto1",
      data: () => ({
        enabled: true,
        trigger: { event: "customer.created", conditions: [] },
        actions: [
          { type: "add_tag", config: { tag: "vip" }, order: 2 },
          { type: "send_whatsapp", config: { message: "Bienvenido" }, order: 1 },
        ],
      }),
      ref: { update: vi.fn() },
    }

    m.getFn.mockResolvedValue({ empty: false, docs: [autoDoc], size: 1 })

    await evaluateAutomationEvent("c1", "customer.created", {})

    expect(createJob).toHaveBeenCalledTimes(2)
    const calls = (createJob as any).mock.calls
    expect(calls[0][0].type).toBe("send_whatsapp")
    expect(calls[1][0].type).toBe("add_tag")
  })
})

describe("executeAutomationById", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("throws when automation not found", async () => {
    const m = makeChainedMock()
    ;(adminDb.collection as any).mockImplementation(m.collectionFn)
    m.getFn.mockResolvedValue({ exists: false })

    await expect(executeAutomationById("c1", "auto1", {})).rejects.toThrow(
      "Automatización no encontrada"
    )
  })

  it("throws when automation is disabled", async () => {
    const m = makeChainedMock()
    ;(adminDb.collection as any).mockImplementation(m.collectionFn)
    m.getFn.mockResolvedValue({
      exists: true,
      data: () => ({ enabled: false, actions: [] }),
    })

    await expect(executeAutomationById("c1", "auto1", {})).rejects.toThrow(
      "Automatización deshabilitada"
    )
  })

  it("creates jobs for all actions", async () => {
    const m = makeChainedMock()
    ;(adminDb.collection as any).mockImplementation(m.collectionFn)
    ;(createJob as any).mockResolvedValue("job1")
    m.getFn.mockResolvedValue({
      exists: true,
      data: () => ({
        enabled: true,
        trigger: { event: null, conditions: [] },
        actions: [
          { type: "send_whatsapp", config: {}, order: 0 },
          { type: "add_tag", config: { tag: "vip" }, order: 1 },
        ],
      }),
      ref: { update: vi.fn() },
    })

    const execId = await executeAutomationById("c1", "auto1", { customerId: "cuid1" })
    expect(execId).toBe("exec1")
    expect(createJob).toHaveBeenCalledTimes(2)
  })
})
