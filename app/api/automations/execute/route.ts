import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { executeAutomationById } from "@/lib/automations/engine"

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await getAuthContext(req)

    const body = await req.json()
    const { automationId, context } = body

    if (!automationId || typeof automationId !== "string") {
      return NextResponse.json(
        { error: "Falta campo requerido: automationId (string)" },
        { status: 400 }
      )
    }

    const executionId = await executeAutomationById(
      companyId,
      automationId,
      (context ?? {}) as Record<string, unknown>
    )

    return NextResponse.json({
      executionId,
      automationId,
      companyId,
      status: "running",
    })
  } catch (error) {
    return handleError(error)
  }
}
