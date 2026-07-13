import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { workflowService } from "@/src/automation"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  try {
    const { companyId } = await getAuthContext(req)
    const { workflowId } = await params
    await workflowService.updateDraft(companyId, workflowId, {
      enabled: false,
    })
    return NextResponse.json({ success: true, workflowId })
  } catch (error) {
    return handleError(error)
  }
}
