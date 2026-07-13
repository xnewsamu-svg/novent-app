import type { AutomationEvent } from "../../types/events"
import type {
  WhatsAppWebhookPayload,
  WhatsAppMessage,
  WhatsAppStatus,
  NormalizedWhatsAppEventType,
} from "./types"
import { logger } from "@/src/lib/logger"

export interface NormalizedWhatsAppEvent {
  type: NormalizedWhatsAppEventType
  companyId: string
  phoneNumberId: string
  customerPhone: string
  customerName: string | null
  message: WhatsAppMessage | null
  status: WhatsAppStatus | null
  raw: WhatsAppWebhookPayload
}

export function normalizeWebhookPayload(
  companyId: string,
  payload: WhatsAppWebhookPayload,
): NormalizedWhatsAppEvent[] {
  const events: NormalizedWhatsAppEvent[] = []

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const value = change.value
      const metadata = value.metadata

      const customerName = value.contacts?.[0]?.profile?.name ?? null
      const customerPhone = value.contacts?.[0]?.wa_id ?? ""

      for (const msg of value.messages ?? []) {
        events.push({
          type: "whatsapp.lead.received",
          companyId,
          phoneNumberId: metadata.phone_number_id,
          customerPhone,
          customerName,
          message: msg,
          status: null,
          raw: payload,
        })
      }

      for (const status of value.statuses ?? []) {
        const eventType = mapStatusToEventType(status.status)
        events.push({
          type: eventType,
          companyId,
          phoneNumberId: metadata.phone_number_id,
          customerPhone: status.recipient_id,
          customerName: null,
          message: null,
          status,
          raw: payload,
        })
      }
    }
  }

  return events
}

export function toAutomationEvent(normalized: NormalizedWhatsAppEvent): AutomationEvent {
  const text = extractMessageText(normalized.message)
  const ts = normalized.message?.timestamp ?? normalized.status?.timestamp ?? null
  const timestamp = ts ? new Date(parseInt(ts, 10) * 1000) : new Date()

  return {
    id: "",
    companyId: normalized.companyId,
    type: normalized.type,
    source: "whatsapp",
    timestamp,
    correlationId: normalized.message?.id ?? normalized.status?.id ?? null,
    data: {
      companyId: normalized.companyId,
      phoneNumberId: normalized.phoneNumberId,
      customerPhone: normalized.customerPhone,
      customerName: normalized.customerName,
      message: normalized.message,
      text,
      messageBody: text,
      from: normalized.message?.from ?? null,
      status: normalized.status,
      raw: normalized.raw,
    },
  }
}

function extractMessageText(message: WhatsAppMessage | null): string {
  if (!message) return ""
  if (message.text?.body) return message.text.body
  return ""
}

function mapStatusToEventType(
  status: string,
): NormalizedWhatsAppEventType {
  switch (status) {
    case "sent":
      return "whatsapp.message.sent"
    case "delivered":
      return "whatsapp.message.delivered"
    case "read":
      return "whatsapp.message.read"
    case "failed":
      return "whatsapp.message.failed"
    default:
      logger.debug("Unknown WhatsApp status mapped to failed", { status })
      return "whatsapp.message.failed"
  }
}
