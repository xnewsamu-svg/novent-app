import { actionRegistry } from "../registry/action-registry"
import type { ActionExecutor } from "../types/action"
import type { ExecutionContext } from "../types/execution"
import { resolveValue } from "../engine/variable-resolver"

const WEBHOOK_TIMEOUT_MS = 15_000

function resolveBody(body: unknown, context: ExecutionContext): unknown {
  if (typeof body === "object" && body !== null && !Array.isArray(body)) {
    return resolveValue(body as Record<string, unknown>, context)
  }
  return body
}

const webhookAction: ActionExecutor = {
  type: "action.webhook.call",
  label: "Llamar Webhook",
  description: "Realiza una petición HTTP a una URL externa",
  configSchema: {},

  async execute(config, context, _deps) {
    try {
      const url = config.url as string | undefined
      if (!url) {
        return {
          success: false,
          output: null,
          error: "webhook.call: url requerida en config",
          retryable: false,
        }
      }

      const method = (config.method as string)?.toUpperCase() ?? "POST"
      const headers = (config.headers as Record<string, string>) ?? {}
      const body = resolveBody(config.body, context) as Record<string, unknown> | undefined

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)

      let response: Response
      try {
        response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }

      const responseBody = await response.text().catch(() => null)

      if (!response.ok) {
        return {
          success: false,
          output: { url, method, statusCode: response.status, response: responseBody },
          error: `webhook.call: HTTP ${response.status} — ${response.statusText}`,
          retryable: response.status >= 500,
        }
      }

      return {
        success: true,
        output: { url, method, statusCode: response.status, response: responseBody },
        error: null,
        retryable: false,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      const isTimeout = error instanceof DOMException && error.name === "AbortError"
      return {
        success: false,
        output: null,
        error: `webhook.call: ${isTimeout ? "timeout" : message}`,
        retryable: !isTimeout,
      }
    }
  },
}

actionRegistry.register(webhookAction)

export default webhookAction
