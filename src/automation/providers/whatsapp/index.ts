export { WhatsAppClient } from "./client"
export type { WhatsAppClientConfig } from "./client"
export { createSender } from "./sender"
export type { WhatsAppSender, SendTextParams, SendTemplateParams, SendResult } from "./sender"
export { resolveWhatsAppConfig } from "./config"
export type { WhatsAppCredentials } from "./config"
export { verifyWebhookToken, verifySignature, parseHubSignature } from "./verifier"
export { normalizeWebhookPayload, toAutomationEvent } from "./normalizer"
export type { NormalizedWhatsAppEvent } from "./normalizer"
export { handleWebhookPayload } from "./webhook"
export type { WebhookHandlerResult } from "./webhook"

export type {
  WhatsAppMessageType,
  WhatsAppMessageStatus,
  WhatsAppContactProfile,
  WhatsAppContact,
  WhatsAppTextMessage,
  WhatsAppMediaMessage,
  WhatsAppLocationMessage,
  WhatsAppMessage,
  WhatsAppStatus,
  WhatsAppWebhookValue,
  WhatsAppWebhookChange,
  WhatsAppWebhookEntry,
  WhatsAppWebhookPayload,
  WhatsAppTextRequest,
  WhatsAppTemplateRequest,
  WhatsAppTemplateComponent,
  WhatsAppTemplateParameter,
  WhatsAppInteractiveRequest,
  WhatsAppMediaRequest,
  WhatsAppApiResponse,
  NormalizedWhatsAppEventType,
} from "./types"

export {
  WhatsAppError,
  WhatsAppApiError,
  WhatsAppAuthError,
  WhatsAppVerificationError,
  WhatsAppTemplateError,
  WhatsAppRateLimitError,
  WhatsAppMediaError,
  WhatsAppNetworkError,
  WhatsAppTimeoutError,
  WhatsAppInvalidPhoneError,
  isRetryableError,
  classifyMetaError,
  classifyNetworkError,
} from "./errors"
