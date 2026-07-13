import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { adminDb } from "@/lib/firebase-admin"
import { evaluateAutomationEvent } from "@/lib/automations/engine"
import { createEngineAdapter } from "@/src/automation/services/engine-adapter"
import { run, runExecution } from "@/src/automation/engine/workflow-engine"
import { logger } from "@/src/lib/logger"

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await getAuthContext(req)

    const body = await req.json()
    const { type, data, source, correlationId } = body

    if (!type || typeof type !== "string") {
      return NextResponse.json(
        { error: "Falta campo requerido: type (string)" },
        { status: 400 }
      )
    }
    if (!data || data === null || typeof data !== "object") {
      return NextResponse.json(
        { error: "Falta campo requerido: data (object)" },
        { status: 400 }
      )
    }

    const now = new Date()
    const eventRef = await adminDb
      .collection("companies")
      .doc(companyId)
      .collection("events")
      .add({
        type,
        data,
        source: source ?? "api",
        correlationId: correlationId ?? null,
        timestamp: now,
        companyId,
        createdAt: now,
      })

    const eventId = eventRef.id

    // ── V1 Engine ──────────────────────────────────
    const v1Result = await evaluateAutomationEvent(companyId, type, data)

    // ── V2 Engine (corre independientemente de V1) ──
    const v2Event = {
      id: eventId,
      companyId,
      type,
      data: data as Record<string, unknown>,
      source: (source as string) ?? "api",
      timestamp: now,
      correlationId: (correlationId as string) ?? null,
    }

    const services = createEngineAdapter(companyId)
    const v2ExecutionIds = await run(v2Event, services)

    await Promise.allSettled(
      v2ExecutionIds.map((executionId) =>
        runExecution(executionId, companyId, services).catch((err) => {
          logger.error("V2 execution failed", { companyId, executionId }, err)
        }),
      ),
    )

    return NextResponse.json({
      eventId,
      type,
      companyId,
      v1: {
        automationMatches: v1Result.matched,
        executionIds: v1Result.executions,
      },
      v2: {
        executionIds: v2ExecutionIds,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
