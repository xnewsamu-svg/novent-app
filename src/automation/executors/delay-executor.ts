import { nodeRegistry } from "../registry/node-registry"
import type { WorkflowNode } from "../types/workflow"
import type { ExecutionContext } from "../types/execution"

const delayExecutor = {
  type: "delay",
  async execute(
    node: WorkflowNode,
    _context: ExecutionContext,
    _deps: Record<string, unknown>,
  ) {
    const duration = Number(node.config.duration) || undefined
    const unit = node.config.unit as string | undefined

    if (!duration || !unit) {
      return {
        success: false,
        output: null,
        error: "Delay node requires duration and unit in config",
        retryable: false,
      }
    }

    let delayMs = 0
    switch (unit) {
      case "seconds":
        delayMs = duration * 1000
        break
      case "minutes":
        delayMs = duration * 60 * 1000
        break
      case "hours":
        delayMs = duration * 60 * 60 * 1000
        break
      case "days":
        delayMs = duration * 24 * 60 * 60 * 1000
        break
      default:
        return {
          success: false,
          output: null,
          error: `Unknown delay unit: ${unit}`,
          retryable: false,
        }
    }

    if (delayMs <= 0) {
      return {
        success: true,
        output: { delayed: false, reason: "Duration is zero or negative" },
        error: null,
        retryable: false,
      }
    }

    const delayedUntil = new Date(Date.now() + delayMs)

    return {
      success: true,
      output: {
        delayed: true,
        duration,
        unit,
        delayMs,
        delayedUntil: delayedUntil.toISOString(),
      },
      error: null,
      retryable: false,
    }
  },
}

nodeRegistry.register(delayExecutor)

export default delayExecutor
