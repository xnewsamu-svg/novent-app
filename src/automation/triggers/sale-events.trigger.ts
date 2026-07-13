import { triggerRegistry } from "../registry/trigger-registry"
import type { TriggerMatcher } from "../types/trigger"

const saleCreatedTrigger: TriggerMatcher = {
  type: "sale.created",
  label: "Venta creada",
  description: "Se dispara cuando se registra una nueva venta",
  match(event) {
    return event.type === "sale.created"
  },
  extractContext(event) {
    return { eventPayload: event.data }
  },
}

const saleDeletedTrigger: TriggerMatcher = {
  type: "sale.deleted",
  label: "Venta eliminada",
  description: "Se dispara cuando se elimina una venta",
  match(event) {
    return event.type === "sale.deleted"
  },
  extractContext(event) {
    return { eventPayload: event.data }
  },
}

triggerRegistry.register(saleCreatedTrigger)
triggerRegistry.register(saleDeletedTrigger)

export { saleCreatedTrigger, saleDeletedTrigger }
