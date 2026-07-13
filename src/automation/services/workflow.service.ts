import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"
import type { Workflow } from "../types/workflow"
import type { AutomationEvent } from "../types/events"
import { validateWorkflow } from "../validators/workflow-validator"
import { triggerRegistry } from "../registry/trigger-registry"
import { logger } from "@/src/lib/logger"

function workflowsPath(companyId: string) {
  return adminDb.collection("companies").doc(companyId).collection("workflows")
}

function workflowDoc(companyId: string, workflowId: string) {
  return adminDb.collection("companies").doc(companyId).collection("workflows").doc(workflowId)
}

function versionsPath(companyId: string, workflowId: string) {
  return adminDb
    .collection("companies")
    .doc(companyId)
    .collection("workflows")
    .doc(workflowId)
    .collection("versions")
}

function versionDoc(companyId: string, workflowId: string, version: number) {
  return adminDb
    .collection("companies")
    .doc(companyId)
    .collection("workflows")
    .doc(workflowId)
    .collection("versions")
    .doc(String(version))
}

function snapshotToWorkflow(snap: DocumentSnapshot): Workflow | null {
  if (!snap.exists) return null
  const data = snap.data()!
  return {
    id: snap.id,
    companyId: data.companyId,
    name: data.name,
    description: data.description ?? null,
    enabled: data.enabled ?? false,
    version: data.version ?? 0,
    publishedAt: data.publishedAt?.toDate() ?? null,
    trigger: data.trigger,
    nodes: data.nodes ?? [],
    edges: data.edges ?? [],
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
  } as Workflow
}

export interface IWorkflowService {
  getWorkflow(companyId: string, workflowId: string): Promise<Workflow | null>
  getLatestDraft(companyId: string, workflowId: string): Promise<Workflow | null>
  getPublishedVersion(companyId: string, workflowId: string, version: number): Promise<Workflow | null>
  createDraft(companyId: string, data: Partial<Workflow>): Promise<string>
  updateDraft(companyId: string, workflowId: string, data: Partial<Workflow>): Promise<void>
  publish(companyId: string, workflowId: string): Promise<number>
  deleteWorkflow(companyId: string, workflowId: string): Promise<void>
  listWorkflows(companyId: string): Promise<Workflow[]>
  findWorkflowsByEvent(companyId: string, event: AutomationEvent): Promise<Workflow[]>
  loadWorkflowVersion(companyId: string, workflowId: string, version: number): Promise<Workflow>
}

class WorkflowService implements IWorkflowService {
  async getWorkflow(companyId: string, workflowId: string): Promise<Workflow | null> {
    const snap = await workflowDoc(companyId, workflowId).get()
    return snapshotToWorkflow(snap)
  }

  async getLatestDraft(companyId: string, workflowId: string): Promise<Workflow | null> {
    return this.getWorkflow(companyId, workflowId)
  }

  async getPublishedVersion(
    companyId: string,
    workflowId: string,
    version: number,
  ): Promise<Workflow | null> {
    const snap = await versionDoc(companyId, workflowId, version).get()
    return snapshotToWorkflow(snap)
  }

  async createDraft(companyId: string, data: Partial<Workflow>): Promise<string> {
    const now = Timestamp.now()
    const ref = await workflowsPath(companyId).add({
      companyId,
      name: data.name ?? "Nuevo workflow",
      description: data.description ?? null,
      enabled: false,
      version: 0,
      publishedAt: null,
      trigger: data.trigger ?? { eventType: "" },
      nodes: data.nodes ?? [],
      edges: data.edges ?? [],
      createdAt: now,
      updatedAt: now,
    })
    return ref.id
  }

  async updateDraft(
    companyId: string,
    workflowId: string,
    data: Partial<Workflow>,
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    }
    if (data.name !== undefined) updates.name = data.name
    if (data.description !== undefined) updates.description = data.description
    if (data.trigger !== undefined) updates.trigger = data.trigger
    if (data.nodes !== undefined) updates.nodes = data.nodes
    if (data.edges !== undefined) updates.edges = data.edges
    if (data.enabled !== undefined) updates.enabled = data.enabled

    await workflowDoc(companyId, workflowId).update(updates)
  }

  async publish(companyId: string, workflowId: string): Promise<number> {
    const existing = await this.getWorkflow(companyId, workflowId)
    if (!existing) throw new Error("Workflow not found")

    const validation = validateWorkflow(existing)
    if (!validation.valid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join("; ")}`)
    }

    const newVersion = existing.version + 1
    const now = Timestamp.now()

    const snapshot = {
      ...existing,
      id: workflowId,
      version: newVersion,
      publishedAt: now.toDate(),
      updatedAt: now.toDate(),
    }

    await versionDoc(companyId, workflowId, newVersion).set(snapshot)

    await workflowDoc(companyId, workflowId).update({
      version: newVersion,
      publishedAt: now,
      enabled: true,
      updatedAt: now,
    })

    return newVersion
  }

  async deleteWorkflow(companyId: string, workflowId: string): Promise<void> {
    await workflowDoc(companyId, workflowId).delete()
  }

  async listWorkflows(companyId: string): Promise<Workflow[]> {
    const q = workflowsPath(companyId)
      .orderBy("updatedAt", "desc")
      .limit(100)
    const snap = await q.get()
    return snap.docs.map((d) => snapshotToWorkflow(d)!).filter(Boolean)
  }

  async findWorkflowsByEvent(companyId: string, event: AutomationEvent): Promise<Workflow[]> {
    const q = workflowsPath(companyId)
      .where("enabled", "==", true)
      .where("publishedAt", "!=", null)
    const snap = await q.get()
    const allWorkflows: Workflow[] = []
    for (const docSnap of snap.docs) {
      const wf = snapshotToWorkflow(docSnap)
      if (!wf) continue
      const versionSnap = await versionDoc(companyId, wf.id, wf.version).get()
      if (versionSnap.exists) {
        const published = snapshotToWorkflow(versionSnap)
        if (published) allWorkflows.push(published)
      } else {
        logger.debug("Workflow publicado sin snapshot", {
          companyId,
          workflowId: wf.id,
          version: wf.version,
        })
      }
    }

    logger.debug("Workflows candidatos encontrados", {
      companyId,
      eventType: event.type,
      total: allWorkflows.length,
      workflowIds: allWorkflows.map((w) => w.id),
    })

    const matched = triggerRegistry.findMatchingWorkflows(event, allWorkflows)

    logger.debug("Workflows matched por trigger", {
      companyId,
      eventType: event.type,
      matched: matched.length,
      workflowIds: matched.map((w) => w.id),
    })

    return matched
  }

  async loadWorkflowVersion(
    companyId: string,
    workflowId: string,
    version: number,
  ): Promise<Workflow> {
    const wf = await this.getPublishedVersion(companyId, workflowId, version)
    if (!wf) throw new Error(`Workflow version not found: ${workflowId} v${version}`)
    return wf
  }
}

export const workflowService: IWorkflowService = new WorkflowService()
