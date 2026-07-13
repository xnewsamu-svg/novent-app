import { Timestamp, FieldValue, type DocumentSnapshot } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"
import type {
  Execution,
  ExecutionContext,
  ExecutionLog,
  ExecutionStatus,
  LogStatus,
} from "../types/execution"

function executionsPath(companyId: string) {
  return adminDb.collection("companies").doc(companyId).collection("executions")
}

function executionDoc(companyId: string, executionId: string) {
  return adminDb.collection("companies").doc(companyId).collection("executions").doc(executionId)
}

function logsPath(companyId: string, executionId: string) {
  return adminDb
    .collection("companies")
    .doc(companyId)
    .collection("executions")
    .doc(executionId)
    .collection("logs")
}

function snapshotToExecution(snap: DocumentSnapshot): Execution | null {
  if (!snap.exists) return null
  const d = snap.data()!
  return {
    id: snap.id,
    workflowId: d.workflowId,
    workflowVersion: d.workflowVersion,
    companyId: d.companyId,
    triggerEvent: d.triggerEvent,
    status: d.status as ExecutionStatus,
    triggeredAt: d.triggeredAt?.toDate() ?? new Date(),
    startedAt: d.startedAt?.toDate() ?? null,
    finishedAt: d.finishedAt?.toDate() ?? null,
    currentNodeId: d.currentNodeId ?? null,
    context: d.context as ExecutionContext,
    error: d.error ?? null,
    duration: d.duration ?? null,
    retryCount: d.retryCount ?? 0,
    maxRetries: d.maxRetries ?? 3,
    createdBy: d.createdBy ?? null,
  }
}

function snapshotToLog(snap: DocumentSnapshot): ExecutionLog | null {
  if (!snap.exists) return null
  const d = snap.data()!
  return {
    id: snap.id,
    executionId: d.executionId,
    companyId: d.companyId,
    nodeId: d.nodeId,
    nodeType: d.nodeType,
    status: d.status as LogStatus,
    timestamp: d.timestamp?.toDate() ?? new Date(),
    duration: d.duration ?? null,
    input: d.input ?? null,
    output: d.output ?? null,
    error: d.error ?? null,
    retryAttempt: d.retryAttempt ?? 0,
  }
}

export interface IExecutionService {
  create(data: {
    workflowId: string
    workflowVersion: number
    companyId: string
    triggerEvent: string
    context: ExecutionContext
    maxRetries?: number
  }): Promise<string>
  getById(companyId: string, executionId: string): Promise<Execution | null>
  update(companyId: string, executionId: string, updates: Partial<Execution>): Promise<void>
  getByWorkflow(companyId: string, workflowId: string): Promise<Execution[]>
  getByCompany(companyId: string, max?: number): Promise<Execution[]>
  getByCompanyAndStatus(companyId: string, status: ExecutionStatus, max?: number): Promise<Execution[]>
  writeLog(companyId: string, executionId: string, log: Omit<ExecutionLog, "id">): Promise<string>
  getLogs(companyId: string, executionId: string): Promise<ExecutionLog[]>
}

class ExecutionService implements IExecutionService {
  async create(data: {
    workflowId: string
    workflowVersion: number
    companyId: string
    triggerEvent: string
    context: ExecutionContext
    maxRetries?: number
  }): Promise<string> {
    const now = Timestamp.now()
    const ref = await executionsPath(data.companyId).add({
      workflowId: data.workflowId,
      workflowVersion: data.workflowVersion,
      companyId: data.companyId,
      triggerEvent: data.triggerEvent,
      status: "pending",
      triggeredAt: now,
      startedAt: null,
      finishedAt: null,
      currentNodeId: null,
      context: data.context,
      error: null,
      duration: null,
      retryCount: 0,
      maxRetries: data.maxRetries ?? 3,
      createdBy: "automation",
      __version: 0,
    })
    return ref.id
  }

  async getById(companyId: string, executionId: string): Promise<Execution | null> {
    const snap = await executionDoc(companyId, executionId).get()
    return snapshotToExecution(snap)
  }

  async update(
    companyId: string,
    executionId: string,
    updates: Partial<Execution>,
  ): Promise<void> {
    const docRef = executionDoc(companyId, executionId)
    const firestoreUpdates: Record<string, unknown> = {}
    if (updates.status !== undefined) firestoreUpdates.status = updates.status
    if (updates.startedAt !== undefined) {
      firestoreUpdates.startedAt = updates.startedAt !== null ? Timestamp.fromDate(updates.startedAt) : null
    }
    if (updates.finishedAt !== undefined) {
      firestoreUpdates.finishedAt = updates.finishedAt !== null ? Timestamp.fromDate(updates.finishedAt) : null
    }
    if (updates.currentNodeId !== undefined) firestoreUpdates.currentNodeId = updates.currentNodeId
    if (updates.context !== undefined) firestoreUpdates.context = updates.context
    if (updates.error !== undefined) firestoreUpdates.error = updates.error
    if (updates.duration !== undefined) firestoreUpdates.duration = updates.duration
    if (updates.retryCount !== undefined) firestoreUpdates.retryCount = updates.retryCount

    if (Object.keys(firestoreUpdates).length === 0) return

    await adminDb.runTransaction(async (t) => {
      const snap = await t.get(docRef)
      if (!snap.exists) {
        throw new Error(`Execution ${executionId} not found`)
      }
      const currentVersion = (snap.data()?.__version as number) ?? 0
      t.update(docRef, {
        ...firestoreUpdates,
        __version: currentVersion + 1,
      })
    })
  }

  async getByWorkflow(companyId: string, workflowId: string): Promise<Execution[]> {
    const q = executionsPath(companyId)
      .where("workflowId", "==", workflowId)
      .orderBy("triggeredAt", "desc")
      .limit(50)
    const snap = await q.get()
    return snap.docs.map((d) => snapshotToExecution(d)!).filter(Boolean)
  }

  async getByCompany(companyId: string, max = 50): Promise<Execution[]> {
    const q = executionsPath(companyId)
      .orderBy("triggeredAt", "desc")
      .limit(max)
    const snap = await q.get()
    return snap.docs.map((d) => snapshotToExecution(d)!).filter(Boolean)
  }

  async getByCompanyAndStatus(companyId: string, status: ExecutionStatus, max = 50): Promise<Execution[]> {
    const q = executionsPath(companyId)
      .where("status", "==", status)
      .orderBy("triggeredAt", "desc")
      .limit(max)
    const snap = await q.get()
    return snap.docs.map((d) => snapshotToExecution(d)!).filter(Boolean)
  }

  async writeLog(
    companyId: string,
    executionId: string,
    log: Omit<ExecutionLog, "id">,
  ): Promise<string> {
    const ref = await logsPath(companyId, executionId).add({
      executionId: log.executionId,
      companyId: log.companyId,
      nodeId: log.nodeId,
      nodeType: log.nodeType,
      status: log.status,
      timestamp: Timestamp.fromDate(log.timestamp),
      duration: log.duration ?? null,
      input: log.input ?? null,
      output: log.output ?? null,
      error: log.error ?? null,
      retryAttempt: log.retryAttempt ?? 0,
    })
    return ref.id
  }

  async getLogs(companyId: string, executionId: string): Promise<ExecutionLog[]> {
    const q = logsPath(companyId, executionId)
      .orderBy("timestamp", "asc")
    const snap = await q.get()
    return snap.docs.map((d) => snapshotToLog(d)!).filter(Boolean)
  }
}

export const executionService: IExecutionService = new ExecutionService()
