import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"
import type { AutomationAction } from "@/lib/types"
import { createWhatsAppClient, WhatsAppMessage, WhatsAppResponse } from "@/lib/whatsapp/client"
import { checkRateLimit, incrementRateLimit } from "@/lib/whatsapp/rateLimiter"

export type ActionHandler = (
  companyId: string,
  action: AutomationAction,
  context: Record<string, unknown>
) => Promise<Record<string, unknown>>

const handlers: Record<string, ActionHandler> = {
  send_whatsapp: async (companyId, action, context) => {
    const to = (context.phone || context.customerPhone) as string | undefined
    if (!to) throw new Error("send_whatsapp: no hay destinatario (phone/customerPhone)")

    const rateCheck = await checkRateLimit(companyId, to)
    if (!rateCheck.allowed) {
      return {
        to,
        status: "rate_limited",
        remaining: rateCheck.remaining,
        resetTime: rateCheck.resetTime.toISOString(),
        message: `Rate limit excedido. Reinicia en ${rateCheck.resetTime.toISOString()}`,
      }
    }

    const client = createWhatsAppClient()
    if (!client) {
      return {
        to,
        template: action.config.template,
        status: "skipped",
        message: "WhatsApp no configurado � faltan WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN",
      }
    }

    const templateName = action.config.template as string
    const messageText = action.config.message as string

    const messagePayload: Record<string, unknown> = { to }

    if (templateName) {
      const variables = (action.config.variables as Record<string, string>) ?? {}
      const components: { type: string; parameters: { type: string; text: string }[] }[] = []

      if (Object.keys(variables).length > 0) {
        components.push({
          type: "body",
          parameters: Object.values(variables).map((v) => ({ type: "text", text: v })),
        })
      }

      messagePayload.type = "template"
      messagePayload.template = {
        name: templateName,
        language: { code: "es" },
        ...(components.length > 0 ? { components } : {}),
      }
    } else if (messageText) {
      messagePayload.type = "text"
      messagePayload.text = { body: messageText, preview_url: false }
    } else {
      throw new Error("send_whatsapp: config requiere template (string) o message (string)")
    }

    const result: WhatsAppResponse = await client.sendMessage(messagePayload as unknown as WhatsAppMessage)
    const messageId = result.messages?.[0]?.id ?? null

    await incrementRateLimit(companyId, to)

    const now = Timestamp.now()
    await adminDb
      .collection("companies")
      .doc(companyId)
      .collection("messages")
      .add({
        to,
        type: "whatsapp",
        status: "sent",
        messageId,
        template: templateName || null,
        text: messageText || null,
        automationId: context.automationId ?? null,
        campaignId: context.campaignId ?? null,
        customerId: context.customerId ?? null,
        companyId,
        createdAt: now,
      })

    const customerId = context.customerId as string | undefined
    if (customerId) {
      await adminDb
        .collection("companies")
        .doc(companyId)
      .collection("clientes")
      .doc(customerId)
      .update({ lastWhatsAppAt: now.toDate() })
    }

    return {
      to,
      template: templateName || null,
      messageId,
      status: "sent",
    }
  },

  send_email: async (_companyId, action, context) => {
    const to = (context.email || context.customerEmail) as string | undefined
    if (!to) throw new Error("send_email: no hay destinatario (email/customerEmail)")

    const subject = (action.config.subject as string) ?? "Mensaje de Novent"
    const html = (action.config.html as string) ?? (action.config.message as string) ?? ""

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return {
        to,
        subject,
        status: "skipped",
        message: "RESEND_API_KEY no configurada en variables de entorno",
      }
    }

    const { Resend } = await import("resend")
    const resend = new Resend(apiKey)

    const from = (action.config.from as string) ?? "Novent <onboarding@resend.dev>"

    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      html: html || `<p>Mensaje de Novent</p>`,
    })

    if (error) {
      return {
        to,
        subject,
        status: "failed",
        message: error.message,
      }
    }

    return {
      to,
      subject,
      status: "sent",
    }
  },

  add_tag: async (companyId, action, context) => {
    const customerId = context.customerId as string | undefined
    if (!customerId) throw new Error("add_tag: customerId requerido")

    const tag = action.config.tag as string
    if (!tag) throw new Error("add_tag: tag requerido en action.config")

    await adminDb
      .collection("companies")
      .doc(companyId)
      .collection("clientes")
      .doc(customerId)
      .update({ tags: FieldValue.arrayUnion(tag) })

    return { tag, added: true }
  },

  remove_tag: async (companyId, action, context) => {
    const customerId = context.customerId as string | undefined
    if (!customerId) throw new Error("remove_tag: customerId requerido")

    const tag = action.config.tag as string
    if (!tag) throw new Error("remove_tag: tag requerido en action.config")

    await adminDb
      .collection("companies")
      .doc(companyId)
      .collection("clientes")
      .doc(customerId)
      .update({ tags: FieldValue.arrayRemove(tag) })

    return { tag, removed: true }
  },

  change_status: async (companyId, action, context) => {
    const customerId = context.customerId as string | undefined
    if (!customerId) throw new Error("change_status: customerId requerido")

    const status = action.config.status as string
    if (!status) throw new Error("change_status: status requerido en action.config")

    await adminDb
      .collection("companies")
      .doc(companyId)
      .collection("clientes")
      .doc(customerId)
      .update({ status })

    return { status, changed: true }
  },

  create_sale: async (companyId, action, context) => {
    const now = new Date()
    const saleData = {
      customerId: context.customerId ?? null,
      customerName: (context.customerName as string) ?? null,
      customerPhone: (context.customerPhone as string) ?? null,
      items: action.config.items ?? [],
      subtotal: action.config.subtotal ?? 0,
      discountTotal: action.config.discountTotal ?? 0,
      taxTotal: action.config.taxTotal ?? 0,
      total: action.config.total ?? 0,
      paymentMethod: action.config.paymentMethod ?? "other",
      paymentStatus: "pending" as const,
      paidAt: null,
      status: "completed" as const,
      cancelledAt: null,
      cancellationReason: null,
      refundedAt: null,
      sellerId: null,
      notes: (action.config.notes as string) ?? null,
      companyId,
      createdAt: now,
      updatedAt: now,
    }

    const ref = await adminDb
      .collection("companies")
      .doc(companyId)
      .collection("ventas")
      .add(saleData)

    return { saleId: ref.id, total: saleData.total }
  },

  update_customer: async (companyId, action, context) => {
    const customerId = context.customerId as string | undefined
    if (!customerId) throw new Error("update_customer: customerId requerido")

    const updates = action.config.updates as Record<string, unknown> | undefined
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error("update_customer: config.updates vac�o")
    }

    await adminDb
      .collection("companies")
      .doc(companyId)
      .collection("clientes")
      .doc(customerId)
      .update({ ...updates, updatedAt: new Date() })

    return { updated: Object.keys(updates) }
  },

  webhook: async (_companyId, action, _context) => {
    const url = action.config.url as string | undefined
    if (!url) throw new Error("webhook: url requerida en action.config")

    const method = (action.config.method as string) ?? "POST"
    const headers = (action.config.headers as Record<string, string>) ?? {}
    const body = action.config.body as Record<string, unknown> | undefined

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`webhook: HTTP ${response.status} � ${text}`)
    }

    return { status: response.status, url }
  },

  create_lead: async (companyId, action, context) => {
    const phone = (context.customerPhone || context.from || context.phone) as string | undefined
    if (!phone) throw new Error("create_lead: phone requerido")

    const now = new Date()
    const leadDate = now.toISOString().split("T")[0]
    const leadTime = now.toTimeString().split(" ")[0]

    const leadData = {
      name: (context.customerName as string) || phone,
      phone,
      message: (context.text as string) ?? null,
      source: "whatsapp",
      status: "new",
      customerId: (context.customerId as string) ?? null,
      whatsappMessageId: (context.messageId as string) ?? null,
      leadDate,
      leadTime,
      companyId,
      createdAt: now,
      updatedAt: now,
    }

    const ref = await adminDb
      .collection("companies")
      .doc(companyId)
      .collection("leads")
      .add(leadData)

    return { leadId: ref.id, leadDate }
  },

  delay: async () => {
    return { delayed: true }
  },
}

export async function executeAction(
  companyId: string,
  action: AutomationAction,
  context: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const handler = handlers[action.type]
  if (!handler) throw new Error(`Tipo de acci�n no soportado: ${action.type}`)
  return handler(companyId, action, context)
}
