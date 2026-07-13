import { triggerRegistry } from "../registry/trigger-registry"
import type { TriggerMatcher } from "../types/trigger"
import type { AutomationEvent } from "../types/events"
import type { WhatsAppStatus } from "../providers/whatsapp/types"

const STATUS_TRIGGERS: Array<{ type: string; label: string; description: string }> = [
  {
    type: "whatsapp.message.sent",
    label: "Mensaje enviado",
    description: "Se dispara cuando un mensaje enviado llega al servidor de Meta",
  },
  {
    type: "whatsapp.message.delivered",
    label: "Mensaje entregado",
    description: "Se dispara cuando un mensaje es entregado al teléfono del cliente",
  },
  {
    type: "whatsapp.message.read",
    label: "Mensaje leído",
    description: "Se dispara cuando el cliente lee el mensaje",
  },
  {
    type: "whatsapp.message.failed",
    label: "Mensaje fallido",
    description: "Se dispara cuando falla la entrega de un mensaje",
  },
]

function extractStatusContext(event: AutomationEvent) {
  const status = event.data?.status as WhatsAppStatus | undefined
  return {
    eventPayload: {
      ...event.data,
      statusId: status?.id ?? null,
      statusValue: status?.status ?? null,
      recipientId: status?.recipient_id ?? null,
      statusTimestamp: status?.timestamp ?? null,
    },
  }
}

for (const st of STATUS_TRIGGERS) {
  const matcher: TriggerMatcher = {
    type: st.type,
    label: st.label,
    description: st.description,
    match(event: AutomationEvent): boolean {
      return event.type === st.type
    },
    extractContext(event: AutomationEvent) {
      return extractStatusContext(event)
    },
  }
  triggerRegistry.register(matcher)
}

export {}
