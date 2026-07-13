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
    const version = await workflowService.publish(companyId, workflowId)
    return NextResponse.json({ success: true, workflowId, version })
  } catch (error) {
    return handleError(error)
  }
}
