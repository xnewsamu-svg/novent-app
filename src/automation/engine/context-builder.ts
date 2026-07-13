import type { AutomationEvent } from "../types/events"
import type { ExecutionContext } from "../types/execution"
import { resolvePath } from "./variable-resolver"

export function buildContext(event: AutomationEvent): ExecutionContext {
  return {
    eventPayload: event.data,
    variables: {},
    visitedNodes: [],
    delayedUntil: null,
  }
}

export function resolveFromContext(
  path: string,
  context: ExecutionContext,
): unknown {
  const merged: Record<string, unknown> = {
    event: context.eventPayload,
    variables: context.variables,
  }
  return resolvePath(merged, path)
}

export function setVariable(
  context: ExecutionContext,
  key: string,
  value: unknown,
): ExecutionContext {
  return {
    ...context,
    variables: {
      ...context.variables,
      [key]: value,
    },
  }
}

export function getOutputVariable(
  context: ExecutionContext,
  nodeId: string,
  fieldPath: string,
): unknown {
  const outputs = context.variables.outputs
  if (!outputs || typeof outputs !== "object") return undefined
  const nodeOutput = (outputs as Record<string, unknown>)[nodeId]
  if (!nodeOutput || typeof nodeOutput !== "object") return undefined
  return resolvePath(nodeOutput as Record<string, unknown>, fieldPath)
}
