import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { executionService } from "@/src/automation"

export async function GET(
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

    return NextResponse.json({ execution })
  } catch (error) {
    return handleError(error)
  }
}
