import { adminDb } from "@/lib/firebase-admin"
import { actionRegistry } from "../registry/action-registry"
import type { ActionExecutor } from "../types/action"

const customerUpdateAction: ActionExecutor = {
  type: "action.customer.update",
  label: "Actualizar Cliente",
  description: "Actualiza los campos de un cliente en CRM",
  configSchema: {},

  async execute(config, context, _deps) {
    try {
      const companyId = (context.eventPayload?.companyId ??
        config.companyId) as string | undefined
      if (!companyId) {
        return {
          success: false,
          output: null,
          error: "customer.update: companyId no encontrado",
          retryable: false,
        }
      }

      const customerId = (config.customerId as string) ??
        (context.eventPayload?.customerId as string) ??
        (context.eventPayload?.id as string)
      if (!customerId) {
        return {
          success: false,
          output: null,
          error: "customer.update: customerId requerido en config o eventPayload.id",
          retryable: false,
        }
      }

      const updates = config.updates as Record<string, unknown> | undefined
      if (!updates || Object.keys(updates).length === 0) {
        return {
          success: false,
          output: null,
          error: "customer.update: config.updates vacío",
          retryable: false,
        }
      }

      await adminDb
        .collection("companies")
        .doc(companyId)
        .collection("clientes")
        .doc(customerId)
        .update({ ...updates, updatedAt: new Date() })

      return {
        success: true,
        output: { customerId, updated: Object.keys(updates) },
        error: null,
        retryable: false,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      return {
        success: false,
        output: null,
        error: `customer.update: ${message}`,
        retryable: true,
      }
    }
  },
}

actionRegistry.register(customerUpdateAction)

export default customerUpdateAction
