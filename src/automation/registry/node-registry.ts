import type { WorkflowNode } from "../types/workflow"
import type { ExecutionContext } from "../types/execution"
import type { ActionResult } from "../types/action"

export interface NodeExecutorHandler {
  type: string
  execute(
    node: WorkflowNode,
    context: ExecutionContext,
    deps: Record<string, unknown>,
  ): Promise<ActionResult>
}

export class NodeRegistry {
  private exact = new Map<string, NodeExecutorHandler>()
  private prefixes = new Map<string, NodeExecutorHandler>()

  register(handler: NodeExecutorHandler): void {
    if (handler.type.endsWith(".*")) {
      const prefix = handler.type.slice(0, -1)
      this.prefixes.set(prefix, handler)
    } else {
      this.exact.set(handler.type, handler)
    }
  }

  get(type: string): NodeExecutorHandler {
    const exact = this.exact.get(type)
    if (exact) return exact

    for (const [prefix, handler] of this.prefixes) {
      if (type.startsWith(prefix)) return handler
    }

    throw new Error(`Node executor not registered: ${type}`)
  }

  getAll(): NodeExecutorHandler[] {
    return [
      ...Array.from(this.exact.values()),
      ...Array.from(this.prefixes.values()),
    ]
  }

  has(type: string): boolean {
    try {
      this.get(type)
      return true
    } catch {
      return false
    }
  }
}

export const nodeRegistry = new NodeRegistry()
