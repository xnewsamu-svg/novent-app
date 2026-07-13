import { nodeRegistry } from "../registry/node-registry"
import type { WorkflowNode } from "../types/workflow"
import type { ExecutionContext } from "../types/execution"
import type { ActionResult } from "../types/action"

export async function executeNode(
  node: WorkflowNode,
  context: ExecutionContext,
  deps: Record<string, unknown>,
): Promise<ActionResult> {
  const handler = nodeRegistry.get(node.type)
  return handler.execute(node, context, deps)
}
