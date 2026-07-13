import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { createJob } from "@/lib/automations/jobs"

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await getAuthContext(req)

    const body = await req.json()
    const { type, payload, scheduledAt, priority, maxAttempts, group, tags } = body

    if (!type || typeof type !== "string") {
      return NextResponse.json(
        { error: "Falta campo requerido: type (string)" },
        { status: 400 }
      )
    }
    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { error: "Falta campo requerido: payload (object)" },
        { status: 400 }
      )
    }

    const jobId = await createJob({
      companyId,
      type,
      payload,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      priority,
      maxAttempts,
      group,
      tags,
    })

    return NextResponse.json({ jobId, companyId, status: "pending" })
  } catch (error) {
    return handleError(error)
  }
}
