import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { adminDb } from "@/lib/firebase-admin"
import { executeAction } from "@/lib/automations/actions"
import {
  markRunning,
  markCompleted,
  scheduleRetry as scheduleV1Retry,
  shouldRetry,
} from "@/lib/automations/jobs"
import { createEngineAdapter } from "@/src/automation/services/engine-adapter"
import {
  runExecution,
  resumeExecution,
  retryExecution,
} from "@/src/automation/engine/workflow-engine"
import type { AutomationAction, AutomationActionType } from "@/lib/types"

const BATCH_LIMIT = 10
const GROUP_LIMITS: Record<string, number> = {
  send_whatsapp: 15,
  send_email: 10,
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req)
    const body = await req.json().catch(() => ({}))
    const limit = body.limit ?? BATCH_LIMIT

    const pendingJobs = await adminDb
      .collection("companies")
      .doc(auth.companyId)
      .collection("jobs")
      .where("status", "==", "pending")
      .where("scheduledAt", "<=", new Date())
      .orderBy("scheduledAt", "asc")
      .limit(limit as number)
      .get()

    if (pendingJobs.empty) {
      return NextResponse.json({ processed: 0, companyId: auth.companyId })
    }

    const throttled = applyGroupThrottle(pendingJobs.docs)

    let processed = 0
    let failed = 0
    let retried = 0

    for (const doc of throttled) {
      const job = doc.data()

      try {
        await markRunning(auth.companyId, doc.id)

        const jobType = job.type as string

        // ── V2 Engine Jobs ──────────────────────────
        if (
          jobType === "automation.execute" ||
          jobType === "automation.retry" ||
          jobType === "automation.resume"
        ) {
          const payload = (job.payload ?? {}) as Record<string, unknown>
          const executionId = payload.executionId as string
          const companyId = (payload.companyId as string) ?? auth.companyId

          if (!executionId) {
            throw new Error(`${jobType}: executionId requerido en payload`)
          }

          const services = createEngineAdapter(companyId)

          if (jobType === "automation.execute") {
            await runExecution(executionId, companyId, services)
          } else if (jobType === "automation.retry") {
            const attempt = (payload.attempt as number) ?? 1
            await retryExecution(executionId, companyId, attempt, services)
          } else if (jobType === "automation.resume") {
            await resumeExecution(executionId, companyId, services)
          }

          await markCompleted(auth.companyId, doc.id, { executionId, status: "completed" })
          processed++
          continue
        }

        // ── V1 Engine Jobs ──────────────────────────
        const action: AutomationAction = {
          type: job.type as AutomationActionType,
          config: job.payload as Record<string, unknown>,
          order: 0,
        }

        const result = await executeAction(
          auth.companyId,
          action,
          (job.payload ?? {}) as Record<string, unknown>,
        )

        await markCompleted(auth.companyId, doc.id, result)
        processed++
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        const currentAttempts = (job.attempts ?? 0) + 1

        if (shouldRetry(currentAttempts, job.maxAttempts ?? 3)) {
          await scheduleV1Retry(
            auth.companyId,
            doc.id,
            currentAttempts,
            job.maxAttempts ?? 3,
            err,
          )
          retried++
        } else {
          await adminDb
            .collection("companies")
            .doc(auth.companyId)
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

    return NextResponse.json({
      processed,
      failed,
      retried,
      companyId: auth.companyId,
    })
  } catch (error) {
    return handleError(error)
  }
}

function applyGroupThrottle(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
): FirebaseFirestore.QueryDocumentSnapshot[] {
  const groups: Record<string, number> = {}
  const limited: FirebaseFirestore.QueryDocumentSnapshot[] = []

  for (const doc of docs) {
    const job = doc.data()
    const group = job.group as string | undefined

    if (group && GROUP_LIMITS[group]) {
      const current = groups[group] ?? 0
      if (current >= GROUP_LIMITS[group]) continue
      groups[group] = current + 1
    }

    limited.push(doc)
  }

  return limited
}
