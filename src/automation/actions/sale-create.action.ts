import { adminDb } from "@/lib/firebase-admin"
import { actionRegistry } from "../registry/action-registry"
import type { ActionExecutor } from "../types/action"

const saleCreateAction: ActionExecutor = {
  type: "action.sale.create",
  label: "Crear Venta",
  description: "Crea una nueva venta en el POS",
  configSchema: {},

  async execute(config, context, _deps) {
    try {
      const companyId = (context.eventPayload?.companyId ??
        config.companyId) as string | undefined
      if (!companyId) {
        return {
          success: false,
          output: null,
          error: "sale.create: companyId no encontrado",
          retryable: false,
        }
      }

      const now = new Date()
      const saleData = {
        customerId: (config.customerId as string) ??
          (context.eventPayload?.customerId as string) ??
          null,
        customerName: (config.customerName as string) ??
          (context.eventPayload?.customerName as string) ??
          null,
        customerPhone: (config.customerPhone as string) ??
          (context.eventPayload?.customerPhone as string) ??
          null,
        items: (config.items as unknown[]) ?? [],
        subtotal: (config.subtotal as number) ?? 0,
        discountTotal: (config.discountTotal as number) ?? 0,
        taxTotal: (config.taxTotal as number) ?? 0,
        total: (config.total as number) ?? 0,
        paymentMethod: (config.paymentMethod as string) ?? "other",
        paymentStatus: "pending",
        paidAt: null,
        status: "completed",
        cancelledAt: null,
        cancellationReason: null,
        refundedAt: null,
        sellerId: null,
        notes: (config.notes as string) ?? null,
        companyId,
        createdAt: now,
        updatedAt: now,
      }

      const ref = await adminDb
        .collection("companies")
        .doc(companyId)
        .collection("ventas")
        .add(saleData)

      return {
        success: true,
        output: { saleId: ref.id, total: saleData.total },
        error: null,
        retryable: false,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      return {
        success: false,
        output: null,
        error: `sale.create: ${message}`,
        retryable: true,
      }
    }
  },
}

actionRegistry.register(saleCreateAction)

export default saleCreateAction
