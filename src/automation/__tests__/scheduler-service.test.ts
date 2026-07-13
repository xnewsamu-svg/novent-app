import { describe, it, expect, vi, beforeEach } from "vitest"
import { schedulerService } from "../services/scheduler.service"

vi.mock("@/lib/automations/jobs", () => ({
  createJob: vi.fn(),
}))

vi.mock("../services/execution.service", () => ({
  executionService: {
    update: vi.fn(),
  },
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: vi.fn(),
  },
}))

import { createJob } from "@/lib/automations/jobs"
import { executionService } from "../services/execution.service"
import { adminDb } from "@/lib/firebase-admin"

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-07-12T12:00:00Z"))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("SchedulerService", () => {
  describe("scheduleExecution", () => {
    it("creates a job with automation.execute type", async () => {
      ;(createJob as any).mockResolvedValue("job-1")

      const jobId = await schedulerService.scheduleExecution("comp-1", "exec-1")

      expect(jobId).toBe("job-1")
      expect(createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "comp-1",
          type: "automation.execute",
          payload: { executionId: "exec-1", companyId: "comp-1" },
          priority: "normal",
          tags: ["automation-v2", "execution:exec-1"],
        }),
      )
    })

    it("passes scheduledAt when provided", async () => {
      ;(createJob as any).mockResolvedValue("job-2")
      const future = new Date("2026-07-12T13:00:00Z")

      await schedulerService.scheduleExecution("comp-1", "exec-1", future)

      expect(createJob).toHaveBeenCalledWith(
        expect.objectContaining({ scheduledAt: future }),
      )
    })
  })

  describe("scheduleRetry", () => {
    it("updates execution status before creating job", async () => {
      ;(createJob as any).mockResolvedValue("job-retry-1")
      ;(executionService.update as any).mockResolvedValue(undefined)

      const jobId = await schedulerService.scheduleRetry("comp-1", "exec-1", 1)

      expect(jobId).toBe("job-retry-1")
      expect(executionService.update).toHaveBeenCalledWith(
        "comp-1",
        "exec-1",
        expect.objectContaining({
          status: "pending",
          retryCount: 1,
        }),
      )
      expect(createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "automation.retry",
          tags: ["automation-v2", "execution:exec-1", "retry:1"],
        }),
      )
    })

    it("computes exponential backoff (1s, 2s, 4s...)", async () => {
      ;(createJob as any).mockResolvedValue("job-retry-2")
      ;(executionService.update as any).mockResolvedValue(undefined)

      await schedulerService.scheduleRetry("comp-1", "exec-1", 1)
      const call1ScheduledAt = (createJob as any).mock.calls[0][0].scheduledAt
      expect(call1ScheduledAt.getTime()).toBe(new Date(Date.now() + 1000).getTime())

      ;(createJob as any).mockClear()
      ;(executionService.update as any).mockClear()
      ;(createJob as any).mockResolvedValue("job-retry-3")

      await schedulerService.scheduleRetry("comp-1", "exec-1", 2)
      const call2ScheduledAt = (createJob as any).mock.calls[0][0].scheduledAt
      expect(call2ScheduledAt.getTime()).toBe(new Date(Date.now() + 2000).getTime())

      ;(createJob as any).mockClear()
      ;(executionService.update as any).mockClear()
      ;(createJob as any).mockResolvedValue("job-retry-4")

      await schedulerService.scheduleRetry("comp-1", "exec-1", 3)
      const call3ScheduledAt = (createJob as any).mock.calls[0][0].scheduledAt
      expect(call3ScheduledAt.getTime()).toBe(new Date(Date.now() + 4000).getTime())
    })

    it("caps delay at 1 hour", async () => {
      ;(createJob as any).mockResolvedValue("job-retry-max")
      ;(executionService.update as any).mockResolvedValue(undefined)

      await schedulerService.scheduleRetry("comp-1", "exec-1", 100)
      const scheduledAt = (createJob as any).mock.calls[0][0].scheduledAt

      const expectedDelay = Math.min(1000 * Math.pow(2, 99), 3600000)
      expect(scheduledAt.getTime()).toBe(new Date("2026-07-12T12:00:00Z").getTime() + expectedDelay)
    })
  })

  describe("scheduleResume", () => {
    it("creates a job with automation.resume type", async () => {
      ;(createJob as any).mockResolvedValue("job-resume-1")
      const resumeAt = new Date("2026-07-12T13:00:00Z")

      const jobId = await schedulerService.scheduleResume("comp-1", "exec-1", resumeAt)

      expect(jobId).toBe("job-resume-1")
      expect(createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "comp-1",
          type: "automation.resume",
          payload: { executionId: "exec-1", companyId: "comp-1" },
          scheduledAt: resumeAt,
        }),
      )
    })
  })

  describe("cancel", () => {
    function makeCancelChain(exists: boolean) {
      const updateFn = vi.fn().mockResolvedValue(undefined)
      const getFn = vi.fn().mockResolvedValue({ exists })
      const jobDocFn = vi.fn(() => ({ get: getFn, update: updateFn }))
      const collectionFn = vi.fn(() => ({
        doc: vi.fn(() => ({
          collection: vi.fn(() => ({
            doc: jobDocFn,
          })),
        })),
      }))
      return { updateFn, collectionFn }
    }

    it("updates job status to cancelled when it exists", async () => {
      const { updateFn, collectionFn } = makeCancelChain(true)
      ;(adminDb.collection as any).mockImplementation(collectionFn)

      await schedulerService.cancel("comp-1", "job-to-cancel")

      expect(updateFn).toHaveBeenCalledWith({ status: "cancelled" })
    })

    it("does nothing when job does not exist", async () => {
      const { updateFn, collectionFn } = makeCancelChain(false)
      ;(adminDb.collection as any).mockImplementation(collectionFn)

      await schedulerService.cancel("comp-1", "job-none")

      expect(updateFn).not.toHaveBeenCalled()
    })
  })
})
