import { triggerRegistry } from "../registry/trigger-registry"
import type { TriggerMatcher } from "../types/trigger"

const scheduledTrigger: TriggerMatcher = {
  type: "scheduled.time",
  label: "Programado",
  description: "Se dispara según una expresión cron o intervalo definido",
  match(event) {
    return event.type === "scheduled.time"
  },
  extractContext(event) {
    return { eventPayload: event.data }
  },
}

triggerRegistry.register(scheduledTrigger)

export default scheduledTrigger
