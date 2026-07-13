import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { actionRegistry } from "../registry/action-registry"
import type { ActionExecutor } from "../types/action"

const inventoryUpdateAction: ActionExecutor = {
  type: "action.inventory.update",
  label: "Actualizar Inventario",
  description: "Actualiza el stock de un producto",
  configSchema: {},

  async execute(config, context, _deps) {
    try {
      const companyId = (context.eventPayload?.companyId ??
        config.companyId) as string | undefined
      if (!companyId) {
        return {
          success: false,
          output: null,
          error: "inventory.update: companyId no encontrado",
          retryable: false,
        }
      }

      const productId = (config.productId as string) ??
        (context.eventPayload?.productId as string) ??
        (context.eventPayload?.id as string)
      if (!productId) {
        return {
          success: false,
          output: null,
          error: "inventory.update: productId requerido en config o eventPayload.id",
          retryable: false,
        }
      }

      const quantity = config.quantity as number | undefined
      const setStock = config.stock as number | undefined
      const movementType = (config.movementType as string) ?? "adjustment"

      const productRef = adminDb
        .collection("companies")
        .doc(companyId)
        .collection("inventario")
        .doc(productId)

      if (setStock !== undefined) {
        await productRef.update({
          stock: setStock,
          updatedAt: new Date(),
        })
      } else if (quantity !== undefined) {
        const delta = movementType === "out" || movementType === "return"
          ? -Math.abs(quantity)
          : Math.abs(quantity)
        await productRef.update({
          stock: FieldValue.increment(delta),
          updatedAt: new Date(),
        })
      } else {
        return {
          success: false,
          output: null,
          error: "inventory.update: requiere quantity o stock en config",
          retryable: false,
        }
      }

      return {
        success: true,
        output: { productId, quantity: quantity ?? setStock, movementType },
        error: null,
        retryable: false,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      return {
        success: false,
        output: null,
        error: `inventory.update: ${message}`,
        retryable: true,
      }
    }
  },
}

actionRegistry.register(inventoryUpdateAction)

export default inventoryUpdateAction
