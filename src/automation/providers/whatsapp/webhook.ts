import type { AutomationEvent } from "../../types/events"
import type { WhatsAppWebhookPayload } from "./types"
import { normalizeWebhookPayload, toAutomationEvent } from "./normalizer"

export interface WebhookHandlerResult {
  events: AutomationEvent[]
  raw: WhatsAppWebhookPayload
}

export function handleWebhookPayload(
  companyId: string,
  payload: WhatsAppWebhookPayload,
): WebhookHandlerResult {
  const normalized = normalizeWebhookPayload(companyId, payload)
  const events = normalized.map(toAutomationEvent)

  return { events, raw: payload }
}
