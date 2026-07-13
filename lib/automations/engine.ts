import { FieldValue } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"
import { evaluateConditions } from "@/lib/automations/conditions"
import { createJob } from "@/lib/automations/jobs"
import type { Automation } from "@/lib/types"

export async function evaluateAutomationEvent(
  companyId: string,
  eventType: string,
  eventData: Record<string, unknown>
): Promise<{ matched: number; executions: string[] }> {
  const automations = await adminDb
    .collection("companies")
    .doc(companyId)
    .collection("automations")
    .where("enabled", "==", true)
    .where("trigger.event", "==", eventType)
    .get()

  if (automations.empty) return { matched: 0, executions: [] }

  const executions: string[] = []

  for (const doc of automations.docs) {
    const auto = doc.data() as Automation
    const conditions = auto.trigger?.conditions ?? []

    if (!evaluateConditions(conditions, eventData)) continue

    const now = new Date()

    const execRef = await adminDb
      .collection("companies")
      .doc(companyId)
      .collection("automationExecutions")
      .add({
        automationId: doc.id,
        triggerEvent: eventType,
        status: "running",
        customerId: (eventData.customerId as string) ?? null,
        saleId: (eventData.saleId as string) ?? null,
        jobIds: [],
        startedAt: now,
        completedAt: null,
        error: null,
        companyId,
        createdAt: now,
        updatedAt: now,
      })

    const executionId = execRef.id
    const jobIds: string[] = []

    const sorted = [...(auto.actions ?? [])].sort((a, b) => a.order - b.order)

    for (const action of sorted) {
      const group = isMessagingAction(action.type)
      const jobId = await createJob({
        companyId,
        type: action.type,
        payload: { ...action.config, ...eventData },
        automationId: doc.id,
        group,
        tags: [`automation:${doc.id}`, `execution:${executionId}`],
      })
      jobIds.push(jobId)
    }

    await execRef.update({ jobIds })

    await doc.ref.update({
      executionCount: FieldValue.increment(1),
      lastTriggeredAt: now,
    })

    executions.push(executionId)
  }

  return { matched: automations.size, executions }
}

export async function executeAutomationById(
  companyId: string,
  automationId: string,
  context: Record<string, unknown>
): Promise<string> {
  const doc = await adminDb
    .collection("companies")
    .doc(companyId)
    .collection("automations")
    .doc(automationId)
    .get()

  if (!doc.exists) throw new Error(`Automatización no encontrada: ${automationId}`)

  const auto = doc.data() as Automation
  if (!auto.enabled) throw new Error(`Automatización deshabilitada: ${automationId}`)

  const now = new Date()

  const execRef = await adminDb
    .collection("companies")
    .doc(companyId)
    .collection("automationExecutions")
    .add({
      automationId,
      triggerEvent: "manual",
      status: "running",
      customerId: (context.customerId as string) ?? null,
      saleId: (context.saleId as string) ?? null,
      jobIds: [],
      startedAt: now,
      completedAt: null,
      error: null,
      companyId,
      createdAt: now,
      updatedAt: now,
    })

  const executionId = execRef.id
  const jobIds: string[] = []

  const sorted = [...(auto.actions ?? [])].sort((a, b) => a.order - b.order)

  for (const action of sorted) {
    const group = isMessagingAction(action.type)
    const jobId = await createJob({
      companyId,
      type: action.type,
      payload: { ...action.config, ...context },
      automationId,
      group,
      tags: [`automation:${automationId}`, `execution:${executionId}`],
    })
    jobIds.push(jobId)
  }

  await execRef.update({ jobIds })

  await doc.ref.update({
      executionCount: FieldValue.increment(1),
    lastTriggeredAt: now,
  })

  return executionId
}

function isMessagingAction(type: string): string | undefined {
  if (type === "send_whatsapp") return "whatsapp"
  if (type === "send_email") return "email"
  if (type === "send_sms") return "sms"
  return undefined
}
