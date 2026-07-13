import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { workflowService, validateWorkflow } from "@/src/automation"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  try {
    const { companyId } = await getAuthContext(req)
    const { workflowId } = await params
    const workflow = await workflowService.getWorkflow(companyId, workflowId)
    if (!workflow) {
      return NextResponse.json({ error: "Workflow no encontrado" }, { status: 404 })
    }
    return NextResponse.json({ workflow })
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  try {
    const { companyId } = await getAuthContext(req)
    const { workflowId } = await params
    const body = await req.json()
    const { name, description, trigger, nodes, edges, enabled } = body

    const partial: Record<string, unknown> = {}
    if (name !== undefined) partial.name = name
    if (description !== undefined) partial.description = description
    if (trigger !== undefined) partial.trigger = trigger
    if (nodes !== undefined) partial.nodes = nodes
    if (edges !== undefined) partial.edges = edges
    if (enabled !== undefined) partial.enabled = enabled

    await workflowService.updateDraft(companyId, workflowId, partial)

    return NextResponse.json({ success: true, workflowId })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  try {
    const { companyId } = await getAuthContext(req)
    const { workflowId } = await params
    await workflowService.deleteWorkflow(companyId, workflowId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
