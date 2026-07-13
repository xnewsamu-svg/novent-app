import { triggerRegistry } from "../registry/trigger-registry"
import type { TriggerMatcher } from "../types/trigger"

const leadReceivedTrigger: TriggerMatcher = {
  type: "whatsapp.lead.received",
  label: "Lead recibido",
  description: "Se dispara cuando se recibe un nuevo lead por WhatsApp",
  match(event) {
    return event.type === "whatsapp.lead.received"
  },
  extractContext(event) {
    return { eventPayload: event.data }
  },
}

triggerRegistry.register(leadReceivedTrigger)

export default leadReceivedTrigger
