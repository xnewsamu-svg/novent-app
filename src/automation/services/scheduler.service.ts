import { createJob } from "@/lib/automations/jobs"
import { executionService } from "./execution.service"
import { adminDb } from "@/lib/firebase-admin"

export interface ISchedulerService {
  scheduleExecution(companyId: string, executionId: string, scheduledAt?: Date | null): Promise<string>
  scheduleRetry(companyId: string, executionId: string, attempt: number): Promise<string>
  scheduleResume(companyId: string, executionId: string, scheduledAt: Date): Promise<string>
  cancel(companyId: string, jobId: string): Promise<void>
}

const BACKOFF_BASE_MS = 1000

function computeRetryDelay(attempt: number): number {
  const delay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1)
  return Math.min(delay, 3600000)
}

class SchedulerService implements ISchedulerService {
  async scheduleExecution(
    companyId: string,
    executionId: string,
    scheduledAt?: Date | null,
  ): Promise<string> {
    const jobId = await createJob({
      companyId,
      type: "automation.execute",
      payload: { executionId, companyId },
      scheduledAt: scheduledAt ?? null,
      priority: "normal",
      maxAttempts: 1,
      tags: ["automation-v2", `execution:${executionId}`],
    })
    return jobId
  }

  async scheduleRetry(
    companyId: string,
    executionId: string,
    attempt: number,
  ): Promise<string> {
    const delayMs = computeRetryDelay(attempt)
    const scheduledAt = new Date(Date.now() + delayMs)

    await executionService.update(companyId, executionId, {
      status: "pending",
      retryCount: attempt,
      error: `Retry scheduled: attempt ${attempt}, delay ${delayMs}ms`,
    })

    const jobId = await createJob({
      companyId,
      type: "automation.retry",
      payload: { executionId, companyId, attempt },
      scheduledAt,
      priority: "high",
      maxAttempts: 1,
      tags: ["automation-v2", `execution:${executionId}`, `retry:${attempt}`],
    })

    return jobId
  }

  async scheduleResume(
    companyId: string,
    executionId: string,
    scheduledAt: Date,
  ): Promise<string> {
    const jobId = await createJob({
      companyId,
      type: "automation.resume",
      payload: { executionId, companyId },
      scheduledAt,
      priority: "normal",
      maxAttempts: 1,
      tags: ["automation-v2", `execution:${executionId}`],
    })
    return jobId
  }

  async cancel(companyId: string, jobId: string): Promise<void> {
    const ref = adminDb.collection("companies").doc(companyId).collection("jobs").doc(jobId)
    const snap = await ref.get()
    if (!snap.exists) return
    await ref.update({ status: "cancelled" })
  }
}

export const schedulerService: ISchedulerService = new SchedulerService()
