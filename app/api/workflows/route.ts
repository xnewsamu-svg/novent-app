import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { workflowService } from "@/src/automation"

export async function GET(req: NextRequest) {
  try {
    const { companyId } = await getAuthContext(req)
    const workflows = await workflowService.listWorkflows(companyId)
    return NextResponse.json({ workflows })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await getAuthContext(req)
    const body = await req.json()
    const { name, description, trigger, nodes, edges } = body

    const workflowId = await workflowService.createDraft(companyId, {
      name: name ?? "Nuevo workflow",
      description: description ?? null,
      trigger: trigger ?? { eventType: "", filters: null, schedule: null },
      nodes: nodes ?? [],
      edges: edges ?? [],
    })

    return NextResponse.json({ workflowId, companyId })
  } catch (error) {
    return handleError(error)
  }
}
