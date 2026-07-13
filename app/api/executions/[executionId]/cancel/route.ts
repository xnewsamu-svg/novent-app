import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { executionService } from "@/src/automation"

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

    const cancellable: string[] = ["pending", "running", "paused"]
    if (!cancellable.includes(execution.status)) {
      return NextResponse.json(
        { error: `No se puede cancelar una ejecución en estado "${execution.status}"` },
        { status: 400 },
      )
    }

    await executionService.update(companyId, executionId, {
      status: "cancelled",
      finishedAt: new Date(),
    })

    return NextResponse.json({ success: true, executionId })
  } catch (error) {
    return handleError(error)
  }
}
