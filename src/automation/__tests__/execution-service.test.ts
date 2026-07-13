import { describe, it, expect, vi, beforeEach } from "vitest"
import { executionService } from "../services/execution.service"
import type { ExecutionContext, ExecutionStatus } from "../types/execution"

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: vi.fn(),
    runTransaction: vi.fn(),
  },
}))

vi.mock("firebase-admin/firestore", () => ({
  Timestamp: {
    now: () => ({ toDate: () => new Date("2026-07-12T00:00:00Z"), seconds: 0, nanoseconds: 0 }),
    fromDate: (d: Date) => ({ toDate: () => d, seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 }),
  },
  FieldValue: {
    increment: (n: number) => ({ _increment: n }),
  },
}))

import { adminDb } from "@/lib/firebase-admin"

function makeContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    eventPayload: {},
    variables: {},
    visitedNodes: [],
    delayedUntil: null,
    ...overrides,
  }
}

function makeChain() {
  const addFn = vi.fn()
  const getFn = vi.fn()
  const whereFn = vi.fn(() => ({ get: getFn, where: whereFn, orderBy: vi.fn(() => ({ get: getFn, limit: vi.fn(() => ({ get: getFn })) })) }))
  const orderByFn = vi.fn(() => ({ get: getFn, limit: vi.fn(() => ({ get: getFn })) }))
  const limitFn = vi.fn(() => ({ get: getFn }))
  const docFn = vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: docFn,
      add: addFn,
      get: getFn,
      where: whereFn,
      orderBy: orderByFn,
      limit: limitFn,
    })),
    get: getFn,
    update: vi.fn(),
  }))
  const collectionFn = vi.fn(() => ({
    doc: docFn,
    add: addFn,
    get: getFn,
    where: whereFn,
    orderBy: orderByFn,
    limit: limitFn,
  }))

  return { addFn, getFn, whereFn, orderByFn, limitFn, docFn, collectionFn }
}

function mockDocument(exists: boolean, data: Record<string, unknown>) {
  return {
    exists,
    id: "exec-test-1",
    data: () => data,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("ExecutionService", () => {
  describe("create", () => {
    it("creates an execution with pending status", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.addFn.mockResolvedValue({ id: "exec-new-1" })

      const id = await executionService.create({
        workflowId: "wf-1",
        workflowVersion: 1,
        companyId: "comp-1",
        triggerEvent: "customer.created",
        context: makeContext(),
      })

      expect(id).toBe("exec-new-1")
      expect(adminDb.collection).toHaveBeenCalledWith("companies")
      expect(m.addFn).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: "wf-1",
          status: "pending",
          __version: 0,
        }),
      )
    })

    it("uses custom maxRetries when provided", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.addFn.mockResolvedValue({ id: "exec-1" })

      await executionService.create({
        workflowId: "wf-1",
        workflowVersion: 1,
        companyId: "comp-1",
        triggerEvent: "sale.created",
        context: makeContext(),
        maxRetries: 10,
      })

      expect(m.addFn).toHaveBeenCalledWith(
        expect.objectContaining({ maxRetries: 10 }),
      )
    })
  })

  describe("getById", () => {
    it("returns execution when found", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.getFn.mockResolvedValue(
        mockDocument(true, {
          workflowId: "wf-1",
          workflowVersion: 2,
          companyId: "comp-1",
          triggerEvent: "customer.created",
          status: "completed",
          triggeredAt: { toDate: () => new Date("2026-07-12") },
          startedAt: null,
          finishedAt: null,
          currentNodeId: null,
          context: makeContext(),
          error: null,
          duration: null,
          retryCount: 0,
          maxRetries: 3,
          createdBy: "automation",
        }),
      )

      const exec = await executionService.getById("comp-1", "exec-1")
      expect(exec).not.toBeNull()
      expect(exec!.id).toBe("exec-test-1")
      expect(exec!.status).toBe("completed")
      expect(exec!.workflowVersion).toBe(2)
    })

    it("returns null when not found", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.getFn.mockResolvedValue(mockDocument(false, {}))

      const exec = await executionService.getById("comp-1", "exec-none")
      expect(exec).toBeNull()
    })
  })

  describe("getByCompany", () => {
    it("returns list of executions ordered by triggeredAt desc", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.getFn.mockResolvedValue({
        docs: [
          mockDocument(true, {
            workflowId: "wf-1",
            workflowVersion: 1,
            companyId: "comp-1",
            triggerEvent: "customer.created",
            status: "completed",
            triggeredAt: { toDate: () => new Date("2026-07-12") },
            startedAt: null,
            finishedAt: null,
            currentNodeId: null,
            context: makeContext(),
            error: null,
            duration: 1000,
            retryCount: 0,
            maxRetries: 3,
            createdBy: "automation",
          }),
          mockDocument(true, {
            workflowId: "wf-1",
            workflowVersion: 1,
            companyId: "comp-1",
            triggerEvent: "sale.created",
            status: "failed",
            triggeredAt: { toDate: () => new Date("2026-07-11") },
            startedAt: null,
            finishedAt: null,
            currentNodeId: null,
            context: makeContext(),
            error: "Something went wrong",
            duration: null,
            retryCount: 1,
            maxRetries: 3,
            createdBy: "automation",
          }),
        ],
        size: 2,
      })

      const results = await executionService.getByCompany("comp-1", 10)
      expect(results).toHaveLength(2)
      expect(results[0].status).toBe("completed")
      expect(results[1].status).toBe("failed")
    })
  })

  describe("getByCompanyAndStatus", () => {
    it("filters by status with correct query", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)

      const failedDocs = [
        mockDocument(true, {
          workflowId: "wf-1",
          workflowVersion: 1,
          companyId: "comp-1",
          triggerEvent: "sale.created",
          status: "failed",
          triggeredAt: { toDate: () => new Date("2026-07-11") },
          startedAt: null,
          finishedAt: null,
          currentNodeId: null,
          context: makeContext(),
          error: "Error",
          duration: null,
          retryCount: 1,
          maxRetries: 3,
          createdBy: "automation",
        }),
      ]
      m.getFn.mockResolvedValue({ docs: failedDocs, size: 1 })

      const results = await executionService.getByCompanyAndStatus("comp-1", "failed" as ExecutionStatus, 10)
      expect(results).toHaveLength(1)
      expect(results[0].status).toBe("failed")
      expect(m.whereFn).toHaveBeenCalledWith("status", "==", "failed")
    })

    it("returns empty array when no matches", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.getFn.mockResolvedValue({ docs: [], size: 0 })

      const results = await executionService.getByCompanyAndStatus("comp-1", "running" as ExecutionStatus)
      expect(results).toHaveLength(0)
    })
  })

  describe("getByWorkflow", () => {
    it("filters by workflowId", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.getFn.mockResolvedValue({
        docs: [
          mockDocument(true, {
            workflowId: "wf-specific",
            workflowVersion: 1,
            companyId: "comp-1",
            triggerEvent: "test",
            status: "completed",
            triggeredAt: { toDate: () => new Date() },
            startedAt: null,
            finishedAt: null,
            currentNodeId: null,
            context: makeContext(),
            error: null,
            duration: null,
            retryCount: 0,
            maxRetries: 3,
            createdBy: "automation",
          }),
        ],
        size: 1,
      })

      const results = await executionService.getByWorkflow("comp-1", "wf-specific")
      expect(results).toHaveLength(1)
      expect(m.whereFn).toHaveBeenCalledWith("workflowId", "==", "wf-specific")
    })
  })

  describe("writeLog and getLogs", () => {
    it("writes a log entry and returns its id", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.addFn.mockResolvedValue({ id: "log-1" })

      const logId = await executionService.writeLog("comp-1", "exec-1", {
        executionId: "exec-1",
        companyId: "comp-1",
        nodeId: "node-1",
        nodeType: "action",
        status: "success",
        timestamp: new Date(),
        duration: 500,
        input: { key: "value" },
        output: { result: "ok" },
        error: null,
        retryAttempt: 0,
      })

      expect(logId).toBe("log-1")
      expect(m.addFn).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: "exec-1",
          nodeId: "node-1",
          status: "success",
        }),
      )
    })

    it("reads logs ordered by timestamp asc", async () => {
      const m = makeChain()
      ;(adminDb.collection as any).mockImplementation(m.collectionFn)
      m.getFn.mockResolvedValue({
        docs: [
          mockDocument(true, {
            executionId: "exec-1",
            companyId: "comp-1",
            nodeId: "node-1",
            nodeType: "trigger",
            status: "success",
            timestamp: { toDate: () => new Date("2026-07-12T00:00:00Z") },
            duration: null,
            input: null,
            output: null,
            error: null,
            retryAttempt: 0,
          }),
          mockDocument(true, {
            executionId: "exec-1",
            companyId: "comp-1",
            nodeId: "node-2",
            nodeType: "action",
            status: "success",
            timestamp: { toDate: () => new Date("2026-07-12T00:00:01Z") },
            duration: 200,
            input: {},
            output: {},
            error: null,
            retryAttempt: 0,
          }),
        ],
        size: 2,
      })

      const logs = await executionService.getLogs("comp-1", "exec-1")
      expect(logs).toHaveLength(2)
      expect(logs[0].nodeId).toBe("node-1")
      expect(logs[1].nodeId).toBe("node-2")
    })
  })
})
