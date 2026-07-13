import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { executionService } from "@/src/automation"
import type { ExecutionStatus } from "@/src/automation"

export async function GET(req: NextRequest) {
  try {
    const { companyId } = await getAuthContext(req)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") as ExecutionStatus | null
    const max = Math.min(Number(searchParams.get("max")) || 50, 200)

    const executions = status
      ? await executionService.getByCompanyAndStatus(companyId, status, max)
      : await executionService.getByCompany(companyId, max)

    return NextResponse.json({ executions })
  } catch (error) {
    return handleError(error)
  }
}
