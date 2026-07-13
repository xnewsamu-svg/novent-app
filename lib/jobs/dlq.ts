import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import type { Job } from '@/lib/types'

export interface DeadLetterJob {
  id: string
  companyId: string
  type: string
  status: string
  priority: string
  scheduledAt: Timestamp | null
  startedAt: Timestamp | null
  completedAt: Timestamp | null
  duration: number | null
  attempts: number
  maxAttempts: number
  lastError: string | null
  errorStack: unknown[]
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  executedBy: string | null
  automationId: string | null
  group: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
  failedAt: Timestamp
  failureReason: string
  originalJobId: string
}

export async function moveToDeadLetterQueue(
  job: Job,
  error: string
): Promise<void> {
  if (job.attempts < job.maxAttempts) {
    return
  }

  try {
    const now = Timestamp.now()
    const dlqData: DeadLetterJob = {
      id: job.id,
      companyId: job.companyId,
      type: job.type,
      status: 'failed',
      priority: job.priority,
      scheduledAt: job.scheduledAt as unknown as Timestamp | null,
      startedAt: job.startedAt as unknown as Timestamp | null,
      completedAt: now,
      duration: job.startedAt
        ? now.seconds - (job.startedAt as unknown as Timestamp).seconds
        : null,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      lastError: error,
      errorStack: job.errorStack as unknown[],
      payload: job.payload,
      result: job.result,
      executedBy: job.executedBy,
      automationId: job.automationId,
      group: job.group,
      createdAt: job.createdAt as unknown as Timestamp,
      updatedAt: job.updatedAt as unknown as Timestamp,
      failedAt: now,
      failureReason: error,
      originalJobId: job.id,
    }

    const dlqRef = adminDb
      .collection(`companies/${job.companyId}/deadLetterQueue`)
      .doc(job.id)

    const jobRef = adminDb
      .collection(`companies/${job.companyId}/jobs`)
      .doc(job.id)

    await adminDb.runTransaction(async (transaction) => {
      transaction.delete(jobRef)
      transaction.set(dlqRef, dlqData)
    })
  } catch (error: unknown) {
    console.error(`[DLQ] Failed to move job ${job.id}:`, error instanceof Error ? error.message : String(error))
  }
}

export async function retryFromDeadLetter(
  companyId: string,
  jobId: string
): Promise<void> {
  const dlqRef = adminDb
    .collection(`companies/${companyId}/deadLetterQueue`)
    .doc(jobId)

  const jobRef = adminDb
    .collection(`companies/${companyId}/jobs`)
    .doc(jobId)

  const dlqSnap = await dlqRef.get()
  if (!dlqSnap.exists) {
    throw new Error('Job not found in dead letter queue')
  }

  const dlqData = dlqSnap.data() as DeadLetterJob

  const restoredData = {
    companyId: dlqData.companyId,
    type: dlqData.type,
    status: 'pending' as const,
    priority: dlqData.priority,
    scheduledAt: Timestamp.now(),
    startedAt: null,
    completedAt: null,
    duration: null,
    attempts: 0,
    maxAttempts: dlqData.maxAttempts,
    lastError: null,
    errorStack: [],
    payload: dlqData.payload,
    result: null,
    executedBy: dlqData.executedBy,
    automationId: dlqData.automationId,
    group: dlqData.group,
    createdAt: dlqData.createdAt,
    updatedAt: Timestamp.now(),
  }

  await adminDb.runTransaction(async (transaction) => {
    transaction.delete(dlqRef)
    transaction.set(jobRef, restoredData)
  })
}

export async function listDeadLetterJobs(
  companyId: string,
  limit: number = 50
): Promise<DeadLetterJob[]> {
  const snapshot = await adminDb
    .collection(`companies/${companyId}/deadLetterQueue`)
    .orderBy('failedAt', 'desc')
    .limit(limit)
    .get()

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as DeadLetterJob[]
}

export async function clearDeadLetterQueue(
  companyId: string,
  olderThan?: Date
): Promise<number> {
  const baseQuery = adminDb
    .collection(`companies/${companyId}/deadLetterQueue`)

  const query = olderThan
    ? baseQuery.where('failedAt', '<', olderThan)
    : baseQuery

  const snapshot = await query.get()
  const batch = adminDb.batch()

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })

  await batch.commit()
  return snapshot.size
}
