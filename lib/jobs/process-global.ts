import { adminDb } from "@/lib/firebase-admin"
import { executeAction } from "@/lib/automations/actions"
import {
  markRunning,
  markCompleted,
  scheduleRetry,
  shouldRetry,
} from "@/lib/automations/jobs"
import type { AutomationAction, AutomationActionType } from "@/lib/types"
import { runExecution, resumeExecution, retryExecution } from "@/src/automation/engine/workflow-engine"
import { createEngineAdapter } from "@/src/automation/services/engine-adapter"
import { logger } from "@/src/lib/logger"

const BATCH_LIMIT = 20
const GROUP_LIMITS: Record<string, number> = {
  send_whatsapp: 15,
  send_email: 10,
}

const V2_JOB_TYPES = new Set(["automation.execute", "automation.retry", "automation.resume"])

export async function processPendingJobsGlobal(options?: { limit?: number }): Promise<{
  processed: number
  failed: number
  retried: number
  totalCompanies: number
}> {
  const limit = options?.limit ?? BATCH_LIMIT

  const companiesSnap = await adminDb.collection("companies").select().get()

  let processed = 0
  let failed = 0
  let retried = 0
  let totalCompanies = 0

  for (const companyDoc of companiesSnap.docs) {
    const companyId = companyDoc.id
    try {
      const result = await processCompanyJobs(companyId, limit)
      processed += result.processed
      failed += result.failed
      retried += result.retried
    } catch (err) {
      logger.error("Error processing jobs for company", { companyId }, err)
    }
    totalCompanies++
  }

  return { processed, failed, retried, totalCompanies }
}

export async function processCompanyJobs(
  companyId: string,
  limit: number = 10
): Promise<{
  processed: number
  failed: number
  retried: number
}> {
  const pendingJobs = await adminDb
    .collection("companies")
    .doc(companyId)
    .collection("jobs")
    .where("status", "==", "pending")
    .where("scheduledAt", "<=", new Date())
    .orderBy("scheduledAt", "asc")
    .limit(limit)
    .get()

  if (pendingJobs.empty) {
    return { processed: 0, failed: 0, retried: 0 }
  }

  let processed = 0
  let failed = 0
  let retried = 0

  for (const doc of pendingJobs.docs) {
    const job = doc.data()

    try {
      await markRunning(companyId, doc.id)

      if (V2_JOB_TYPES.has(job.type)) {
        const services = createEngineAdapter(companyId)

        if (job.type === "automation.execute") {
          const { executionId } = job.payload as { executionId: string }
          await runExecution(executionId, companyId, services)
        } else if (job.type === "automation.retry") {
          const { executionId, attempt } = job.payload as { executionId: string; attempt: number }
          await retryExecution(executionId, companyId, attempt, services)
        } else if (job.type === "automation.resume") {
          const { executionId } = job.payload as { executionId: string }
          await resumeExecution(executionId, companyId, services)
        }

        await markCompleted(companyId, doc.id, { status: "processed" })
        processed++
        continue
      }

      const action: AutomationAction = {
        type: job.type as AutomationActionType,
        config: job.payload as Record<string, unknown>,
        order: 0,
      }

      const result = await executeAction(
        companyId,
        action,
        (job.payload ?? {}) as Record<string, unknown>
      )

      await markCompleted(companyId, doc.id, result)
      processed++
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      const currentAttempts = (job.attempts ?? 0) + 1

      if (shouldRetry(currentAttempts, job.maxAttempts ?? 3)) {
        await scheduleRetry(companyId, doc.id, currentAttempts, job.maxAttempts ?? 3, err)
        retried++
      } else {
        await adminDb
          .collection("companies")
          .doc(companyId)
          .collection("jobs")
          .doc(doc.id)
          .update({
            status: "failed",
            completedAt: new Date(),
            lastError: err.message,
            updatedAt: new Date(),
          })
        failed++
      }
    }
  }

  return { processed, failed, retried }
}
