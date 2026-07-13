import { actionRegistry } from "../registry/action-registry"
import type { ActionExecutor } from "../types/action"

const emailAction: ActionExecutor = {
  type: "action.email.send",
  label: "Enviar Email",
  description: "Envía un correo electrónico usando Resend",
  configSchema: {},

  async execute(config, context, _deps) {
    try {
      const to = (config.to as string) ??
        (context.eventPayload?.email as string) ??
        (context.eventPayload?.customerEmail as string)
      if (!to) {
        return {
          success: false,
          output: null,
          error: "email.send: no hay destinatario (config.to, eventPayload.email o customerEmail)",
          retryable: false,
        }
      }

      const subject = (config.subject as string) ?? "Mensaje de Novent"
      const html = (config.html as string) ?? (config.message as string) ?? ""
      const apiKey = process.env.RESEND_API_KEY
      const from = (config.from as string) ?? "Novent <onboarding@resend.dev>"

      if (!apiKey) {
        return {
          success: false,
          output: { to, subject, status: "skipped" },
          error: "email.send: RESEND_API_KEY no configurada",
          retryable: false,
        }
      }

      const { Resend } = await import("resend")
      const resend = new Resend(apiKey)
      const { error } = await resend.emails.send({
        from,
        to,
        subject,
        html: html || `<p>Mensaje de Novent</p>`,
      })

      if (error) {
        return {
          success: false,
          output: { to, subject },
          error: `email.send: ${error.message}`,
          retryable: true,
        }
      }

      return {
        success: true,
        output: { to, subject, status: "sent" },
        error: null,
        retryable: false,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      return {
        success: false,
        output: null,
        error: `email.send: ${message}`,
        retryable: true,
      }
    }
  },
}

actionRegistry.register(emailAction)

export default emailAction
