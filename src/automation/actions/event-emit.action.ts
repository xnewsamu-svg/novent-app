import { actionRegistry } from "../registry/action-registry"
import type { ActionExecutor } from "../types/action"
import type { AutomationEvent } from "../types/events"
import { adminDb } from "@/lib/firebase-admin"
import { run, runExecution } from "../engine/workflow-engine"
import { createEngineAdapter } from "../services/engine-adapter"

const eventEmitAction: ActionExecutor = {
  type: "action.event.emit",
  label: "Emitir Evento",
  description: "Emite un nuevo evento al sistema de automatizaciones",
  configSchema: {},

  async execute(config, context, _deps) {
    try {
      const eventType = config.eventType as string | undefined
      if (!eventType) {
        return {
          success: false,
          output: null,
          error: "event.emit: eventType requerido en config",
          retryable: false,
        }
      }

      const companyId = (context.eventPayload?.companyId as string) ?? ""
      if (!companyId) {
        return {
          success: false,
          output: null,
          error: "event.emit: companyId no encontrado en context",
          retryable: false,
        }
      }

      const eventData = (config.data as Record<string, unknown>) ?? {}
      const source = (config.source as string) ?? "automation-engine"
      const now = new Date()

      const eventRef = await adminDb
        .collection("companies")
        .doc(companyId)
        .collection("events")
        .add({
          type: eventType,
          data: { ...eventData, triggeredBy: "automation" },
          source,
          correlationId: context.eventPayload?.correlationId ?? null,
          timestamp: now,
          companyId,
          createdAt: now,
        })

      const eventId = eventRef.id

      const v2Event: AutomationEvent = {
        id: eventId,
        companyId,
        type: eventType,
        data: { ...eventData, triggeredBy: "automation" } as Record<string, unknown>,
        source,
        timestamp: now,
        correlationId: (context.eventPayload?.correlationId as string) ?? null,
      }

      const services = createEngineAdapter(companyId)
      const executionIds = await run(v2Event, services)

      for (const executionId of executionIds) {
        runExecution(executionId, companyId, services).catch(() => {})
      }

      return {
        success: true,
        output: { emitted: true, eventId, eventType, executions: executionIds.length },
        error: null,
        retryable: false,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      return {
        success: false,
        output: null,
        error: `event.emit: ${message}`,
        retryable: true,
      }
    }
  },
}

actionRegistry.register(eventEmitAction)

export default eventEmitAction
