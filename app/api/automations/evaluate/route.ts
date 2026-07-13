import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { evaluateAutomationEvent } from "@/lib/automations/engine"

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await getAuthContext(req)

    const body = await req.json()
    const { eventType, eventData } = body

    if (!eventType || typeof eventType !== "string") {
      return NextResponse.json(
        { error: "Falta campo requerido: eventType (string)" },
        { status: 400 }
      )
    }
    if (!eventData || typeof eventData !== "object") {
      return NextResponse.json(
        { error: "Falta campo requerido: eventData (object)" },
        { status: 400 }
      )
    }

    const result = await evaluateAutomationEvent(companyId, eventType, eventData)

    return NextResponse.json({
      companyId,
      ...result,
    })
  } catch (error) {
    return handleError(error)
  }
}
