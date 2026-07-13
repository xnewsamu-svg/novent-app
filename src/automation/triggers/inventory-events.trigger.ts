import { triggerRegistry } from "../registry/trigger-registry"
import type { TriggerMatcher } from "../types/trigger"

const lowStockTrigger: TriggerMatcher = {
  type: "inventory.low_stock",
  label: "Stock bajo",
  description: "Se dispara cuando el stock de un producto está por debajo del mínimo",
  match(event) {
    return event.type === "inventory.low_stock"
  },
  extractContext(event) {
    return { eventPayload: event.data }
  },
}

const outOfStockTrigger: TriggerMatcher = {
  type: "inventory.out_of_stock",
  label: "Sin stock",
  description: "Se dispara cuando un producto se queda sin stock",
  match(event) {
    return event.type === "inventory.out_of_stock"
  },
  extractContext(event) {
    return { eventPayload: event.data }
  },
}

const productCreatedTrigger: TriggerMatcher = {
  type: "inventory.product_created",
  label: "Producto creado",
  description: "Se dispara cuando se crea un nuevo producto",
  match(event) {
    return event.type === "inventory.product_created"
  },
  extractContext(event) {
    return { eventPayload: event.data }
  },
}

triggerRegistry.register(lowStockTrigger)
triggerRegistry.register(outOfStockTrigger)
triggerRegistry.register(productCreatedTrigger)

export { lowStockTrigger, outOfStockTrigger, productCreatedTrigger }
