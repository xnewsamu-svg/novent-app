import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyWebhookToken, verifySignature } from "@/src/automation/providers/whatsapp/verifier"
import { handleWebhookPayload } from "@/src/automation/providers/whatsapp/webhook"
import { createEngineAdapter } from "@/src/automation/services/engine-adapter"
import { run, runExecution } from "@/src/automation/engine/workflow-engine"
import { logger } from "@/src/lib/logger"
import type { WhatsAppWebhookPayload } from "@/src/automation/providers/whatsapp/types"
import type { AutomationEvent } from "@/src/automation/types/events"

async function resolveCompanyByPhoneNumberId(phoneNumberId: string): Promise<string | null> {
  const snap = await adminDb
    .collection("companies")
    .where("settings.whatsappBusinessId", "==", phoneNumberId)
    .limit(1)
    .get()
  return snap.empty ? null : snap.docs[0].id
}

async function persistEvent(event: AutomationEvent): Promise<void> {
  const now = new Date()
  const ref = await adminDb
    .collection("companies")
    .doc(event.companyId)
    .collection("events")
    .add({
      type: event.type,
      data: event.data,
      source: "whatsapp",
      correlationId: event.correlationId,
      timestamp: now,
      companyId: event.companyId,
      createdAt: now,
    })
  event.id = ref.id
  event.timestamp = now
}

async function processWhatsAppEvent(
  companyId: string,
  payload: WhatsAppWebhookPayload,
): Promise<{ events: number; executions: string[] }> {
  const { events } = handleWebhookPayload(companyId, payload)
  const allExecutions: string[] = []

  for (const event of events) {
    await persistEvent(event)

    const phone = event.data?.customerPhone as string ?? "unknown"
    const text = event.data?.messageBody as string ?? ""
    logger.info("WhatsApp event received", {
      companyId,
      eventId: event.id,
      phone,
      messageBody: text,
      eventType: event.type,
    })

    const services = createEngineAdapter(event.companyId)
    const executionIds = await run(event, services)

    logger.info("WhatsApp event processed", {
      companyId,
      eventId: event.id,
      phone,
      messageBody: text,
      executionsFound: executionIds.length,
      executionIds,
    })

    for (const executionId of executionIds) {
      await runExecution(executionId, event.companyId, services).catch((err) => {
        logger.error("Webhook execution failed", { companyId: event.companyId, executionId }, err)
      })
    }

    allExecutions.push(...executionIds)
  }

  return { events: events.length, executions: allExecutions }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const params = {
    mode: searchParams.get("hub.mode") ?? "",
    token: searchParams.get("hub.verify_token") ?? "",
    challenge: searchParams.get("hub.challenge") ?? "",
  }

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN ?? ""
  if (!expectedToken) {
    return new NextResponse("WHATSAPP_VERIFY_TOKEN no configurado", { status: 500 })
  }

  const challenge = verifyWebhookToken(params, expectedToken)
  if (challenge) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse("Verificación fallida", { status: 403 })
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    const signatureHeader = req.headers.get("x-hub-signature-256")
    const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET ?? ""

    const signatureValid = await verifySignature(rawBody, signatureHeader, webhookSecret)
    if (!signatureValid) {
      return NextResponse.json({ error: "Firma X-Hub-Signature inválida" }, { status: 401 })
    }

    let payload: WhatsAppWebhookPayload
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: "JSON inválido en el body" }, { status: 400 })
    }

    if (payload.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Payload no es de WhatsApp Business" }, { status: 400 })
    }

    if (!payload.entry?.length) {
      return NextResponse.json({ error: "Payload sin entries" }, { status: 400 })
    }

    const results: { events: number; executions: string[] }[] = []

    for (const entry of payload.entry) {
      for (const change of entry.changes ?? []) {
        const phoneNumberId = change.value?.metadata?.phone_number_id
        if (!phoneNumberId) continue

        const companyId = await resolveCompanyByPhoneNumberId(phoneNumberId)
        if (!companyId) continue

        const partialPayload: WhatsAppWebhookPayload = {
          object: payload.object,
          entry: [{ id: entry.id, changes: [change] }],
        }

        const result = await processWhatsAppEvent(companyId, partialPayload)
        results.push(result)
      }
    }

    const totalEvents = results.reduce((s, r) => s + r.events, 0)
    const totalExecutions = results.reduce((s, r) => s + r.executions.length, 0)

    return NextResponse.json({
      ok: true,
      entries: payload.entry.length,
      events: totalEvents,
      executions: totalExecutions,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno"
    logger.error("WhatsApp webhook error", undefined, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
