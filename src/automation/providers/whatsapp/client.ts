import type {
  WhatsAppApiResponse,
  WhatsAppTextRequest,
  WhatsAppTemplateRequest,
  WhatsAppInteractiveRequest,
  WhatsAppMediaRequest,
  WhatsAppApiError as WhatsAppApiErrorResponse,
} from "./types"
import {
  classifyMetaError,
  classifyNetworkError,
} from "./errors"
import { logger } from "@/src/lib/logger"

const WHATSAPP_API_BASE = "https://graph.facebook.com"

const REQUEST_TIMEOUT_MS = 15_000

export interface WhatsAppClientConfig {
  phoneNumberId: string
  token: string
  apiVersion?: string
}

export class WhatsAppClient {
  private readonly baseUrl: string
  private readonly token: string
  private readonly phoneNumberId: string

  constructor(config: WhatsAppClientConfig) {
    this.phoneNumberId = config.phoneNumberId
    this.token = config.token
    const version = config.apiVersion ?? "v21.0"
    this.baseUrl = `${WHATSAPP_API_BASE}/${version}/${config.phoneNumberId}`
  }

  private get authHeader(): string {
    return `Bearer ${this.token}`
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const startTime = Date.now()

    logger.info("WhatsApp request", { method, url })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
    } catch (error) {
      clearTimeout(timeoutId)
      const elapsed = Date.now() - startTime
      logger.error("WhatsApp network error", { method, url, elapsedMs: elapsed }, error)
      throw classifyNetworkError(error)
    }

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorBody: WhatsAppApiErrorResponse = await response.json().catch(() => ({
        error: { message: "Unknown error", type: "Unknown", code: response.status },
      }))

      const err = errorBody.error
      const elapsed = Date.now() - startTime
      logger.error("WhatsApp API error", { method, url, elapsedMs: elapsed, code: err.code, message: err.message })

      throw classifyMetaError(err.code, err.message, err.error_subcode, err.fbtrace_id)
    }

    const data: T = await response.json()
    const elapsed = Date.now() - startTime

    const messageId = (data as WhatsAppApiResponse)?.messages?.[0]?.id
    const waId = (data as WhatsAppApiResponse)?.contacts?.[0]?.wa_id

    logger.info("WhatsApp response", { method, url, elapsedMs: elapsed, messageId, waId })

    return data
  }

  async sendText(data: WhatsAppTextRequest): Promise<WhatsAppApiResponse> {
    return this.request<WhatsAppApiResponse>("POST", "/messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: data.to,
      type: "text",
      text: { body: data.body, preview_url: data.previewUrl ?? false },
    })
  }

  async sendTemplate(data: WhatsAppTemplateRequest): Promise<WhatsAppApiResponse> {
    return this.request<WhatsAppApiResponse>("POST", "/messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: data.to,
      type: "template",
      template: {
        name: data.templateName,
        language: { code: data.languageCode },
        components: data.components,
      },
    })
  }

  async sendImage(data: WhatsAppMediaRequest): Promise<WhatsAppApiResponse> {
    return this.request<WhatsAppApiResponse>("POST", "/messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: data.to,
      type: "image",
      image: { id: data.mediaId, caption: data.caption },
    })
  }

  async sendDocument(data: WhatsAppMediaRequest): Promise<WhatsAppApiResponse> {
    return this.request<WhatsAppApiResponse>("POST", "/messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: data.to,
      type: "document",
      document: {
        id: data.mediaId,
        caption: data.caption,
        filename: data.filename,
      },
    })
  }

  async sendInteractive(data: WhatsAppInteractiveRequest): Promise<WhatsAppApiResponse> {
    return this.request<WhatsAppApiResponse>("POST", "/messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: data.to,
      type: "interactive",
      interactive: {
        type: data.type,
        header: data.header,
        body: data.body,
        footer: data.footer,
        action: data.action,
      },
    })
  }

  async markAsRead(messageId: string): Promise<void> {
    await this.request("POST", "/messages", {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    })
  }
}
