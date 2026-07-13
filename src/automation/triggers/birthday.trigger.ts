import { triggerRegistry } from "../registry/trigger-registry"
import type { TriggerMatcher } from "../types/trigger"

const birthdayTrigger: TriggerMatcher = {
  type: "customer.birthday",
  label: "Cumpleaños",
  description: "Se dispara cuando un cliente cumple años (evaluado por schedule diario)",
  match(event) {
    return event.type === "customer.birthday"
  },
  extractContext(event) {
    return { eventPayload: event.data }
  },
}

triggerRegistry.register(birthdayTrigger)

export default birthdayTrigger
