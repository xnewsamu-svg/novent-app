import { WhatsAppClient } from "./client"
import type {
  WhatsAppTextRequest,
  WhatsAppTemplateRequest,
  WhatsAppInteractiveRequest,
  WhatsAppMediaRequest,
  WhatsAppApiResponse,
} from "./types"

export interface SendTextParams {
  to: string
  body: string
  previewUrl?: boolean
}

export interface SendTemplateParams {
  to: string
  templateName: string
  languageCode: string
  bodyParameters?: string[]
  headerParameters?: string[]
}

export interface SendResult {
  success: boolean
  messageId: string | null
  waId: string | null
  error: string | null
}

export function createSender(client: WhatsAppClient) {
  async function sendText(params: SendTextParams): Promise<SendResult> {
    try {
      const request: WhatsAppTextRequest = {
        to: params.to,
        body: params.body,
        previewUrl: params.previewUrl,
      }

      const response = await client.sendText(request)

      return {
        success: true,
        messageId: response.messages?.[0]?.id ?? null,
        waId: response.contacts?.[0]?.wa_id ?? null,
        error: null,
      }
    } catch (error) {
      return {
        success: false,
        messageId: null,
        waId: null,
        error: error instanceof Error ? error.message : "Error desconocido",
      }
    }
  }

  async function sendTemplate(params: SendTemplateParams): Promise<SendResult> {
    try {
      const components: WhatsAppTemplateRequest["components"] = []

      if (params.headerParameters?.length) {
        components.push({
          type: "header",
          parameters: params.headerParameters.map((text) => ({
            type: "text" as const,
            text,
          })),
        })
      }

      if (params.bodyParameters?.length) {
        components.push({
          type: "body",
          parameters: params.bodyParameters.map((text) => ({
            type: "text" as const,
            text,
          })),
        })
      }

      const request: WhatsAppTemplateRequest = {
        to: params.to,
        templateName: params.templateName,
        languageCode: params.languageCode,
        components: components.length > 0 ? components : undefined,
      }

      const response = await client.sendTemplate(request)

      return {
        success: true,
        messageId: response.messages?.[0]?.id ?? null,
        waId: response.contacts?.[0]?.wa_id ?? null,
        error: null,
      }
    } catch (error) {
      return {
        success: false,
        messageId: null,
        waId: null,
        error: error instanceof Error ? error.message : "Error desconocido",
      }
    }
  }

  return { sendText, sendTemplate }
}

export type WhatsAppSender = ReturnType<typeof createSender>
