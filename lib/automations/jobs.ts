import { FieldValue } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"
import type { JobStatus } from "@/lib/types"

export interface CreateJobParams {
  companyId: string
  type: string
  payload: Record<string, unknown>
  scheduledAt?: Date | null
  priority?: "low" | "normal" | "high" | "critical"
  maxAttempts?: number
  group?: string
  automationId?: string
  tags?: string[]
}

export async function createJob(params: CreateJobParams): Promise<string> {
  const now = new Date()
  const ref = adminDb
    .collection("companies")
    .doc(params.companyId)
    .collection("jobs")

  const docRef = await ref.add({
    type: params.type,
    status: "pending",
    priority: params.priority ?? "normal",
    scheduledAt: params.scheduledAt ?? null,
    startedAt: null,
    completedAt: null,
    duration: null,
    attempts: 0,
    maxAttempts: params.maxAttempts ?? 3,
    lastError: null,
    errorStack: [],
    payload: params.payload,
    result: null,
    executedBy: null,
    automationId: params.automationId ?? null,
    group: params.group ?? null,
    tags: params.tags ?? [],
    version: 1,
    companyId: params.companyId,
    createdAt: now,
    updatedAt: now,
  })

  return docRef.id
}

export function shouldRetry(
  attempts: number,
  maxAttempts: number
): boolean {
  return attempts < maxAttempts
}

export function nextRetryDelay(attempts: number): number {
  const base = 1000
  const max = 3_600_000
  return Math.min(base * Math.pow(2, attempts), max)
}

export async function markRunning(
  companyId: string,
  jobId: string
): Promise<void> {
  await adminDb
    .collection("companies")
    .doc(companyId)
    .collection("jobs")
    .doc(jobId)
    .update({
      status: "running",
      startedAt: new Date(),
      updatedAt: new Date(),
    })
}

export async function markCompleted(
  companyId: string,
  jobId: string,
  result: Record<string, unknown>
): Promise<void> {
  const now = new Date()
  const ref = adminDb
    .collection("companies")
    .doc(companyId)
    .collection("jobs")
    .doc(jobId)

  const jobSnap = await ref.get()
  const startedAt = jobSnap.data()?.startedAt?.toMillis?.() ?? now.getTime()

  await ref.update({
    status: "completed",
    completedAt: now,
    duration: now.getTime() - startedAt,
    result,
    updatedAt: now,
  })
}

export async function markFailed(
  companyId: string,
  jobId: string,
  error: Error,
  currentAttempts: number
): Promise<void> {
  const now = new Date()
  const ref = adminDb
    .collection("companies")
    .doc(companyId)
    .collection("jobs")
    .doc(jobId)

  await ref.update({
    status: "failed",
    completedAt: now,
    lastError: error.message,
    errorStack: FieldValue.arrayUnion({
      attempt: currentAttempts,
      message: error.message,
      stack: error.stack ?? null,
      timestamp: now,
    }),
    updatedAt: now,
  })
}

export async function scheduleRetry(
  companyId: string,
  jobId: string,
  attempts: number,
  maxAttempts: number,
  error: Error
): Promise<void> {
  const now = new Date()
  const delay = nextRetryDelay(attempts)
  const scheduledAt = new Date(now.getTime() + delay)
  const ref = adminDb
    .collection("companies")
    .doc(companyId)
    .collection("jobs")
    .doc(jobId)

  await ref.update({
    status: "pending",
    scheduledAt,
    attempts,
    lastError: error.message,
    errorStack: FieldValue.arrayUnion({
      attempt: attempts,
      message: error.message,
      stack: error.stack ?? null,
      timestamp: now,
    }),
    updatedAt: now,
  })
}
