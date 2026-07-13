import { describe, it, expect, vi, beforeEach } from "vitest"
import { workflowService } from "../services/workflow.service"
import type { AutomationEvent } from "../types/events"

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: vi.fn(),
  },
}))

vi.mock("firebase-admin/firestore", () => ({
  Timestamp: {
    now: () => ({ toDate: () => new Date("2026-07-12T00:00:00Z"), seconds: 0, nanoseconds: 0 }),
    fromDate: (d: Date) => ({ toDate: () => d, seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 }),
  },
}))

vi.mock("../validators/workflow-validator", () => ({
  validateWorkflow: vi.fn(),
}))

vi.mock("../registry/trigger-registry", () => ({
  triggerRegistry: {
    findMatchingWorkflows: vi.fn(),
  },
}))

vi.mock("@/src/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

import { adminDb } from "@/lib/firebase-admin"
import { validateWorkflow } from "../validators/workflow-validator"
import { triggerRegistry } from "../registry/trigger-registry"

function makeChain() {
  const addFn = vi.fn()
  const getFn = vi.fn()
  const deleteFn = vi.fn()
  const updateFn = vi.fn()
  const whereFn = vi.fn(() => ({ get: getFn, where: whereFn, orderBy: vi.fn(() => ({ get: getFn, limit: vi.fn(() => ({ get: getFn })) })) }))
  const orderByFn = vi.fn(() => ({ get: getFn, limit: vi.fn(() => ({ get: getFn })) }))
  const limitFn = vi.fn(() => ({ get: getFn }))
  const setFn = vi.fn()
  const docFn = vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: docFn,
      add: addFn,
      get: getFn,
      where: whereFn,
      orderBy: orderByFn,
      limit: limitFn,
      set: setFn,
      delete: deleteFn,
      update: updateFn,
    })),
    get: getFn,
    update: updateFn,
    delete: deleteFn,
    set: setFn,
  }))
  const collectionFn = vi.fn(() => ({
    doc: docFn,
    add: addFn,
    get: getFn,
    where: whereFn,
    orderBy: orderByFn,
    limit: limitFn,
  }))

  return { addFn, getFn, whereFn, orderByFn, limitFn, docFn, collectionFn, updateFn, deleteFn, setFn }
}

function mockDoc(exists: boolean, data: Record<string, unknown>) {
  return {
    exists,
    id: "wf-1",
    data: () => data,
  }
}

const BASE_WF = {
  companyId: "comp-1",
  name: "Test Workflow",
  description: null,
  enabled: true,
  version: 2,
  publishedAt: { toDate: () => new Date("2026-07-12") },
  trigger: { eventType: "customer.created" },
  nodes: [{ id: "n1", type: "trigger", config: {} }],
  edges: [{ id: "e1", from: "n1", to: "n2" }],
  createdAt: { toDate: () => new Date("2026-07-01") },
  updatedAt: { toDate: () => new Date("2026-07-12") },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("WorkflowService", () => {
  describe("getWorkflow", () => {
    it("returns workflow when found", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.getFn.mockResolvedValue(mockDoc(true, BASE_WF))

      const wf = await workflowService.getWorkflow("comp-1", "wf-1")
      expect(wf).not.toBeNull()
      expect(wf!.name).toBe("Test Workflow")
      expect(wf!.version).toBe(2)
    })

    it("returns null when not found", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.getFn.mockResolvedValue(mockDoc(false, {}))

      const wf = await workflowService.getWorkflow("comp-1", "wf-none")
      expect(wf).toBeNull()
    })
  })

  describe("createDraft", () => {
    it("creates a draft with defaults", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.addFn.mockResolvedValue({ id: "wf-new" })

      const id = await workflowService.createDraft("comp-1", { name: "Mi workflow" })

      expect(id).toBe("wf-new")
      expect(m.addFn).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Mi workflow",
          enabled: false,
          version: 0,
          nodes: [],
          edges: [],
        }),
      )
    })

    it("uses defaults for missing fields", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.addFn.mockResolvedValue({ id: "wf-2" })

      const id = await workflowService.createDraft("comp-1", {})
      expect(id).toBe("wf-2")
      expect(m.addFn).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Nuevo workflow",
          trigger: { eventType: "" },
        }),
      )
    })
  })

  describe("updateDraft", () => {
    it("updates selected fields", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.updateFn.mockResolvedValue(undefined)

      await workflowService.updateDraft("comp-1", "wf-1", {
        name: "Updated",
        enabled: true,
      })

      expect(m.updateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated",
          enabled: true,
        }),
      )
    })

    it("always sets updatedAt", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.updateFn.mockResolvedValue(undefined)

      await workflowService.updateDraft("comp-1", "wf-1", {})

      expect(m.updateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedAt: expect.any(Object),
        }),
      )
    })
  })

  describe("publish", () => {
    it("validates and publishes a new version", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.getFn.mockResolvedValue(mockDoc(true, BASE_WF))
      ;(validateWorkflow as any).mockReturnValue({ valid: true, errors: [] })
      m.setFn.mockResolvedValue(undefined)
      m.updateFn.mockResolvedValue(undefined)

      const version = await workflowService.publish("comp-1", "wf-1")

      expect(version).toBe(3)
      expect(validateWorkflow).toHaveBeenCalled()
      expect(m.setFn).toHaveBeenCalled()
      expect(m.updateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 3,
          enabled: true,
        }),
      )
    })

    it("throws when workflow not found", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.getFn.mockResolvedValue(mockDoc(false, {}))

      await expect(workflowService.publish("comp-1", "wf-none")).rejects.toThrow("Workflow not found")
    })
  })

  describe("listWorkflows", () => {
    it("returns all workflows ordered by updatedAt desc", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.getFn.mockResolvedValue({
        docs: [
          mockDoc(true, { ...BASE_WF, id: "wf-1", name: "First" }),
          mockDoc(true, { ...BASE_WF, id: "wf-2", name: "Second" }),
        ],
        size: 2,
      })

      const list = await workflowService.listWorkflows("comp-1")
      expect(list).toHaveLength(2)
      expect(list[0].name).toBe("First")
    })
  })

  describe("deleteWorkflow", () => {
    it("deletes the workflow document", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.deleteFn.mockResolvedValue(undefined)

      await workflowService.deleteWorkflow("comp-1", "wf-1")
      expect(m.deleteFn).toHaveBeenCalled()
    })
  })

  describe("findWorkflowsByEvent", () => {
    it("filters enabled published workflows and matches by trigger", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.getFn.mockResolvedValueOnce({
        docs: [mockDoc(true, BASE_WF)],
        size: 1,
      })
      m.getFn.mockResolvedValueOnce(
        mockDoc(true, { ...BASE_WF, nodes: [], edges: [] }),
      )
      ;(triggerRegistry.findMatchingWorkflows as any).mockReturnValue([
        { id: "wf-1", name: "Test Workflow" },
      ])

      const event: AutomationEvent = {
        id: "evt-1",
        companyId: "comp-1",
        type: "customer.created",
        data: {},
        source: "test",
        timestamp: new Date(),
        correlationId: null,
      }

      const result = await workflowService.findWorkflowsByEvent("comp-1", event)
      expect(result).toHaveLength(1)
      expect(triggerRegistry.findMatchingWorkflows).toHaveBeenCalled()
    })
  })

  describe("loadWorkflowVersion", () => {
    it("loads a specific published version", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.getFn.mockResolvedValue(mockDoc(true, { ...BASE_WF, version: 5 }))

      const wf = await workflowService.loadWorkflowVersion("comp-1", "wf-1", 5)
      expect(wf).not.toBeNull()
      expect(wf!.version).toBe(5)
    })

    it("throws when version not found", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.getFn.mockResolvedValue(mockDoc(false, {}))

      await expect(
        workflowService.loadWorkflowVersion("comp-1", "wf-1", 99),
      ).rejects.toThrow("Workflow version not found")
    })
  })
})
