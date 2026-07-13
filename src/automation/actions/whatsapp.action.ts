import { actionRegistry } from "../registry/action-registry"
import type { ActionExecutor, ActionResult } from "../types/action"
import type { ExecutionContext } from "../types/execution"
import { resolveValue } from "../engine/variable-resolver"
import { WhatsAppClient } from "../providers/whatsapp/client"
import { createSender } from "../providers/whatsapp/sender"
import { resolveWhatsAppConfig } from "../providers/whatsapp/config"
import { isRetryableError } from "../providers/whatsapp/errors"

interface WhatsAppSendConfig {
  to: string
  messageType: "text" | "template"
  body?: string
  previewUrl?: boolean
  templateName?: string
  languageCode?: string
  bodyParameters?: string[]
  headerParameters?: string[]
}

function resolveConfig(
  raw: Record<string, unknown>,
  context: ExecutionContext,
): WhatsAppSendConfig {
  const resolved = resolveValue(raw, context) as Record<string, unknown>
  return {
    to: String(resolved.to ?? ""),
    messageType: (resolved.messageType as "text" | "template") ?? "text",
    body: resolved.body as string | undefined,
    previewUrl: resolved.previewUrl as boolean | undefined,
    templateName: resolved.templateName as string | undefined,
    languageCode: resolved.languageCode as string | undefined,
    bodyParameters: resolved.bodyParameters as string[] | undefined,
    headerParameters: resolved.headerParameters as string[] | undefined,
  }
}

const whatsappAction: ActionExecutor = {
  type: "action.whatsapp.send",
  label: "Enviar WhatsApp",
  description: "Envía un mensaje de WhatsApp usando texto o plantilla",
  configSchema: {},

  async execute(
    config: Record<string, unknown>,
    context: ExecutionContext,
    _deps: Record<string, unknown>,
  ): Promise<ActionResult> {
    try {
      const resolved = resolveConfig(config, context)

      if (!resolved.to) {
        return {
          success: false,
          output: null,
          error: "WhatsApp: número destino (to) no configurado",
          retryable: false,
        }
      }

      const companyId = (context.eventPayload?.companyId as string) ?? ""
      if (!companyId) {
        return {
          success: false,
          output: null,
          error: "WhatsApp: companyId no encontrado en el contexto del evento",
          retryable: false,
        }
      }

      const credentials = await resolveWhatsAppConfig(companyId)
      const client = new WhatsAppClient(credentials)
      const sender = createSender(client)

      let result: { success: boolean; messageId: string | null; waId: string | null; error: string | null }

      if (resolved.messageType === "template") {
        if (!resolved.templateName) {
          return {
            success: false,
            output: null,
            error: "WhatsApp: templateName requerido para mensaje tipo template",
            retryable: false,
          }
        }

        result = await sender.sendTemplate({
          to: resolved.to,
          templateName: resolved.templateName,
          languageCode: resolved.languageCode ?? "es",
          bodyParameters: resolved.bodyParameters,
          headerParameters: resolved.headerParameters,
        })
      } else {
        if (!resolved.body) {
          return {
            success: false,
            output: null,
            error: "WhatsApp: body requerido para mensaje tipo text",
            retryable: false,
          }
        }

        result = await sender.sendText({
          to: resolved.to,
          body: resolved.body,
          previewUrl: resolved.previewUrl,
        })
      }

      if (!result.success) {
        return {
          success: false,
          output: {
            to: resolved.to,
            messageType: resolved.messageType,
            error: result.error,
          },
          error: result.error,
          retryable: false,
        }
      }

      return {
        success: true,
        output: {
          to: resolved.to,
          messageType: resolved.messageType,
          messageId: result.messageId,
          waId: result.waId,
        },
        error: null,
        retryable: false,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      const retryable = isRetryableError(error)

      return {
        success: false,
        output: null,
        error: `WhatsApp: ${message}`,
        retryable,
      }
    }
  },
}

actionRegistry.register(whatsappAction)

export default whatsappAction
