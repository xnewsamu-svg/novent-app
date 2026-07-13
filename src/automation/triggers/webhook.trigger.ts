import { triggerRegistry } from "../registry/trigger-registry"
import type { TriggerMatcher } from "../types/trigger"

const webhookTrigger: TriggerMatcher = {
  type: "webhook.received",
  label: "Webhook entrante",
  description: "Se dispara cuando se recibe una petición en el webhook público",
  match(event) {
    return event.type === "webhook.received"
  },
  extractContext(event) {
    return { eventPayload: event.data }
  },
}

triggerRegistry.register(webhookTrigger)

export default webhookTrigger
