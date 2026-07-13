import { adminDb } from "@/lib/firebase-admin"
import { actionRegistry } from "../registry/action-registry"
import type { ActionExecutor } from "../types/action"
import { logger } from "@/src/lib/logger"

const customerCreateAction: ActionExecutor = {
  type: "action.customer.create",
  label: "Crear Cliente",
  description: "Crea un nuevo cliente en el CRM",
  configSchema: {},

  async execute(config, context, _deps) {
    try {
      const companyId = (context.eventPayload?.companyId ??
        config.companyId) as string | undefined
      if (!companyId) {
        return {
          success: false,
          output: null,
          error: "customer.create: companyId no encontrado en contexto ni config",
          retryable: false,
        }
      }

      const now = new Date()
      const phone = (config.phone as string) ??
        (context.eventPayload?.customerPhone as string) ??
        (context.eventPayload?.phone as string) ??
        ""

      // Duplicate check: skip if customer with same phone already exists
      if (phone) {
        const existingSnap = await adminDb
          .collection("companies")
          .doc(companyId)
          .collection("clientes")
          .where("phone", "==", phone)
          .limit(1)
          .get()

        if (!existingSnap.empty) {
          const existingId = existingSnap.docs[0].id
          logger.info("customer.create: duplicado detectado, saltando creación", {
            companyId,
            customerId: existingId,
            phone,
          })
          return {
            success: true,
            output: { customerId: existingId, skipped: true },
            error: null,
            retryable: false,
          }
        }
      }

      const customerData = {
        name: (config.name as string) ??
          (context.eventPayload?.customerName as string) ??
          (context.eventPayload?.name as string) ??
          "Sin nombre",
        phone,
        email: (config.email as string) ??
          (context.eventPayload?.customerEmail as string) ??
          (context.eventPayload?.email as string) ??
          null,
        status: "active",
        tags: (config.tags as string[]) ?? [],
        source: (config.source as string) ??
          (context.eventPayload?.source as string) ??
          "automation",
        totalSpent: 0,
        visitCount: 0,
        averageTicket: 0,
        lifetimeValue: 0,
        notes: (config.notes as string) ?? "",
        companyId,
        createdAt: now,
        updatedAt: now,
      }

      const ref = await adminDb
        .collection("companies")
        .doc(companyId)
        .collection("clientes")
        .add(customerData)

      logger.info("customer.create: cliente creado", {
        companyId,
        customerId: ref.id,
        phone,
      })

      return {
        success: true,
        output: { customerId: ref.id, name: customerData.name, phone: customerData.phone },
        error: null,
        retryable: false,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      logger.error("customer.create: error", { companyId: context.eventPayload?.companyId as string }, error)
      return {
        success: false,
        output: null,
        error: `customer.create: ${message}`,
        retryable: true,
      }
    }
  },
}

actionRegistry.register(customerCreateAction)

export default customerCreateAction
