import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { executionService, runExecution, createEngineAdapter } from "@/src/automation"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ executionId: string }> },
) {
  try {
    const { companyId } = await getAuthContext(req)
    const { executionId } = await params

    const execution = await executionService.getById(companyId, executionId)
    if (!execution) {
      return NextResponse.json({ error: "Ejecución no encontrada" }, { status: 404 })
    }
    if (execution.status !== "failed") {
      return NextResponse.json(
        { error: "Solo se pueden reintentar ejecuciones fallidas" },
        { status: 400 },
      )
    }

    await executionService.update(companyId, executionId, {
      status: "pending",
      retryCount: 0,
      error: null,
    })

    const services = createEngineAdapter(companyId)

    runExecution(executionId, companyId, services).catch(() => {
      /* errors handled inside runExecution */
    })

    return NextResponse.json({ success: true, executionId })
  } catch (error) {
    return handleError(error)
  }
}
