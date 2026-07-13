import { describe, it, expect, vi, beforeEach } from "vitest"
import { executeAction } from "../actions"
import type { AutomationAction } from "@/lib/types"

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: vi.fn(),
  },
}))

vi.mock("@/lib/whatsapp/client", () => ({
  createWhatsAppClient: vi.fn(),
}))

vi.mock("@/lib/whatsapp/rateLimiter", () => ({
  checkRateLimit: vi.fn(),
  incrementRateLimit: vi.fn(),
}))

function makeChainedMock() {
  const addFn = vi.fn()
  const updateFn = vi.fn()
  const getFn = vi.fn()

  const docFn = vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: docFn,
      add: addFn,
      update: updateFn,
      get: getFn,
    })),
    update: updateFn,
    get: getFn,
  }))

  const whereFn = vi.fn(() => ({ get: getFn, where: whereFn, orderBy: vi.fn(), limit: vi.fn() }))

  const collectionFn = vi.fn(() => ({
    doc: docFn,
    where: whereFn,
    add: addFn,
    get: getFn,
    orderBy: vi.fn(),
    limit: vi.fn(),
  }))

  return { collectionFn, docFn, whereFn, addFn, updateFn, getFn }
}

describe("executeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("throws for unsupported action type", async () => {
    const action: AutomationAction = { type: "send_sms" as any, config: {}, order: 0 }
    await expect(executeAction("c1", action, {})).rejects.toThrow(
      "Tipo de acci"
    )
  })

  it("add_tag adds a tag to customer", async () => {
    const { adminDb } = await import("@/lib/firebase-admin")
    const m = makeChainedMock()
    ;(adminDb.collection as any).mockImplementation(m.collectionFn)

    const action: AutomationAction = { type: "add_tag", config: { tag: "vip" }, order: 0 }
    const result = await executeAction("c1", action, { customerId: "cuid1" })

    expect(result).toEqual({ tag: "vip", added: true })
    expect(m.updateFn).toHaveBeenCalled()
  })

  it("add_tag throws without customerId", async () => {
    const action: AutomationAction = { type: "add_tag", config: { tag: "vip" }, order: 0 }
    await expect(executeAction("c1", action, {})).rejects.toThrow("add_tag: customerId requerido")
  })

  it("add_tag throws without tag", async () => {
    const action: AutomationAction = { type: "add_tag", config: {}, order: 0 }
    await expect(executeAction("c1", action, { customerId: "cuid1" })).rejects.toThrow(
      "add_tag: tag requerido"
    )
  })

  it("remove_tag removes a tag from customer", async () => {
    const { adminDb } = await import("@/lib/firebase-admin")
    const m = makeChainedMock()
    ;(adminDb.collection as any).mockImplementation(m.collectionFn)

    const action: AutomationAction = { type: "remove_tag", config: { tag: "old_tag" }, order: 0 }
    const result = await executeAction("c1", action, { customerId: "cuid1" })

    expect(result).toEqual({ tag: "old_tag", removed: true })
  })

  it("change_status updates customer status", async () => {
    const { adminDb } = await import("@/lib/firebase-admin")
    const m = makeChainedMock()
    ;(adminDb.collection as any).mockImplementation(m.collectionFn)

    const action: AutomationAction = { type: "change_status", config: { status: "vip" }, order: 0 }
    const result = await executeAction("c1", action, { customerId: "cuid1" })

    expect(result).toEqual({ status: "vip", changed: true })
  })

  it("create_sale creates a sale document", async () => {
    const { adminDb } = await import("@/lib/firebase-admin")
    const m = makeChainedMock()
    m.addFn.mockResolvedValue({ id: "sale1" })
    ;(adminDb.collection as any).mockImplementation(m.collectionFn)

    const action: AutomationAction = {
      type: "create_sale",
      config: { total: 500, items: [{ name: "Producto A", price: 500 }] },
      order: 0,
    }
    const result = await executeAction("c1", action, { customerId: "cuid1" })

    expect(result.saleId).toBe("sale1")
    expect(result.total).toBe(500)
  })

  it("create_lead creates a lead document", async () => {
    const { adminDb } = await import("@/lib/firebase-admin")
    const m = makeChainedMock()
    m.addFn.mockResolvedValue({ id: "lead1" })
    ;(adminDb.collection as any).mockImplementation(m.collectionFn)

    const action: AutomationAction = { type: "create_lead", config: {}, order: 0 }
    const result = await executeAction("c1", action, {
      customerPhone: "521234567890",
      customerName: "Juan Pérez",
    })

    expect(result.leadId).toBe("lead1")
    expect(result.leadDate).toBeTruthy()
  })

  it("delay returns delayed", async () => {
    const action: AutomationAction = { type: "delay", config: {}, order: 0 }
    const result = await executeAction("c1", action, {})
    expect(result).toEqual({ delayed: true })
  })

  it("send_email throws without recipient", async () => {
    const action: AutomationAction = { type: "send_email", config: {}, order: 0 }
    await expect(executeAction("c1", action, {})).rejects.toThrow(
      "send_email: no hay destinatario"
    )
  })

  it("send_email skips when RESEND_API_KEY not set", async () => {
    const action: AutomationAction = {
      type: "send_email",
      config: { subject: "Test", message: "<p>Hola</p>" },
      order: 0,
    }
    const result = await executeAction("c1", action, { email: "test@example.com" })

    expect(result.status).toBe("skipped")
    expect(result.message).toContain("RESEND_API_KEY")
  })
})
