export type WhatsAppMessageType =
  | "text"
  | "image"
  | "document"
  | "audio"
  | "video"
  | "sticker"
  | "location"
  | "contacts"
  | "interactive"
  | "order"
  | "system"
  | "button"
  | "reaction"

export type WhatsAppMessageStatus =
  | "sent"
  | "delivered"
  | "read"
  | "failed"

export interface WhatsAppContactProfile {
  name: string
}

export interface WhatsAppContact {
  profile: WhatsAppContactProfile
  wa_id: string
}

export interface WhatsAppTextMessage {
  body: string
}

export interface WhatsAppMediaMessage {
  id: string
  caption?: string
  filename?: string
  mime_type?: string
  sha256?: string
}

export interface WhatsAppLocationMessage {
  latitude: number
  longitude: number
  name?: string
  address?: string
}

export interface WhatsAppMessage {
  from: string
  id: string
  timestamp: string
  type: WhatsAppMessageType
  text?: WhatsAppTextMessage
  image?: WhatsAppMediaMessage
  document?: WhatsAppMediaMessage
  audio?: WhatsAppMediaMessage
  video?: WhatsAppMediaMessage
  sticker?: WhatsAppMediaMessage
  location?: WhatsAppLocationMessage
}

export interface WhatsAppStatus {
  id: string
  status: WhatsAppMessageStatus
  timestamp: string
  recipient_id: string
  conversation?: {
    id: string
    expiration_timestamp?: string
  }
  pricing?: {
    billable: boolean
    pricing_model: string
    category: string
  }
}

export interface WhatsAppWebhookValue {
  messaging_product: "whatsapp"
  metadata: {
    display_phone_number: string
    phone_number_id: string
  }
  contacts?: WhatsAppContact[]
  messages?: WhatsAppMessage[]
  statuses?: WhatsAppStatus[]
}

export interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue
  field: "messages"
}

export interface WhatsAppWebhookEntry {
  id: string
  changes: WhatsAppWebhookChange[]
}

export interface WhatsAppWebhookPayload {
  object: "whatsapp_business_account"
  entry: WhatsAppWebhookEntry[]
}

export interface WhatsAppTextRequest {
  to: string
  body: string
  previewUrl?: boolean
}

export interface WhatsAppTemplateRequest {
  to: string
  templateName: string
  languageCode: string
  components?: WhatsAppTemplateComponent[]
}

export interface WhatsAppTemplateComponent {
  type: "header" | "body" | "footer" | "buttons"
  parameters: WhatsAppTemplateParameter[]
}

export interface WhatsAppTemplateParameter {
  type: "text" | "image" | "document" | "video"
  text?: string
  image?: { id: string }
  document?: { id: string }
  video?: { id: string }
}

export interface WhatsAppInteractiveRequest {
  to: string
  type: "button" | "list" | "product"
  header?: { type: "text" | "image" | "document" | "video"; text?: string }
  body: { text: string }
  footer?: { text: string }
  action: Record<string, unknown>
}

export interface WhatsAppMediaRequest {
  to: string
  type: "image" | "document" | "audio" | "video" | "sticker"
  mediaId: string
  caption?: string
  filename?: string
}

export interface WhatsAppApiResponse {
  messaging_product: "whatsapp"
  contacts: Array<{ input: string; wa_id: string }>
  messages: Array<{ id: string }>
}

export interface WhatsAppApiError {
  error: {
    message: string
    type: string
    code: number
    error_subcode?: number
    fbtrace_id: string
  }
}

export type NormalizedWhatsAppEventType =
  | "whatsapp.message.received"
  | "whatsapp.message.sent"
  | "whatsapp.message.delivered"
  | "whatsapp.message.read"
  | "whatsapp.message.failed"
  | "whatsapp.lead.received"
