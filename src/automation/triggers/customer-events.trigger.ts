import { triggerRegistry } from "../registry/trigger-registry"
import type { TriggerMatcher } from "../types/trigger"

const customerCreatedTrigger: TriggerMatcher = {
  type: "customer.created",
  label: "Cliente creado",
  description: "Se dispara cuando se crea un nuevo cliente",
  match(event) {
    return event.type === "customer.created"
  },
  extractContext(event) {
    return { eventPayload: event.data }
  },
}

const customerUpdatedTrigger: TriggerMatcher = {
  type: "customer.updated",
  label: "Cliente actualizado",
  description: "Se dispara cuando se actualiza un cliente existente",
  match(event) {
    return event.type === "customer.updated"
  },
  extractContext(event) {
    return { eventPayload: event.data }
  },
}

triggerRegistry.register(customerCreatedTrigger)
triggerRegistry.register(customerUpdatedTrigger)

export { customerCreatedTrigger, customerUpdatedTrigger }
