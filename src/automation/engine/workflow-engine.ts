import type { Workflow, WorkflowNode } from "../types/workflow"
import type { AutomationEvent } from "../types/events"
import type { Execution, ExecutionContext, ExecutionLog } from "../types/execution"
import type { ActionResult } from "../types/action"
import { executeNode } from "./node-executor"
import { buildContext } from "./context-builder"
import { automationEventBus } from "./event-bus"
import { sanitizePII } from "./pii-sanitizer"
import { logger } from "@/src/lib/logger"

export const MAX_NODE_VISITS = 200
export const MAX_RETRIES = 5
export const MAX_DURATION_MS = 30 * 60 * 1000

export interface EngineServices {
  findWorkflowsByEvent(event: AutomationEvent): Promise<Workflow[]>
  loadWorkflowVersion(workflowId: string, version: number): Promise<Workflow>
  createExecution(data: {
    workflowId: string
    workflowVersion: number
    companyId: string
    triggerEvent: string
    context: ExecutionContext
  }): Promise<string>
  getExecution(companyId: string, executionId: string): Promise<Execution | null>
  updateExecution(companyId: string, executionId: string, updates: Partial<Execution>): Promise<void>
  writeLog(companyId: string, executionId: string, log: Omit<ExecutionLog, "id">): Promise<string>
  scheduleExecution(companyId: string, executionId: string, scheduledAt?: Date | null): Promise<string>
  scheduleRetry(companyId: string, executionId: string, attempt: number): Promise<string>
  scheduleResume(companyId: string, executionId: string, scheduledAt: Date): Promise<string>
}

export async function run(
  event: AutomationEvent,
  services: EngineServices,
): Promise<string[]> {
  const workflows = await services.findWorkflowsByEvent(event)
  const executionIds: string[] = []

  for (const workflow of workflows) {
    const context = buildContext(event)

    const executionId = await services.createExecution({
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      companyId: event.companyId,
      triggerEvent: event.type,
      context,
    })

    executionIds.push(executionId)

    await services.scheduleExecution(event.companyId, executionId)
  }

  return executionIds
}

export async function runExecution(
  executionId: string,
  companyId: string,
  services: EngineServices,
): Promise<void> {
  const execution = await services.getExecution(companyId, executionId)
  if (!execution) throw new Error(`Execution not found: ${executionId}`)
  if (execution.status !== "pending" && execution.status !== "running") return

  const workflow = await services.loadWorkflowVersion(
    execution.workflowId,
    execution.workflowVersion,
  )

  await services.updateExecution(companyId, executionId, {
    status: "running",
    startedAt: new Date(),
  })

  try {
    await executeLoop(execution, workflow, services)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected execution error"
    logger.error(`runExecution threw`, { executionId, companyId }, err)
    await failExecution(executionId, companyId, services, msg)
  }
}

export async function resumeExecution(
  executionId: string,
  companyId: string,
  services: EngineServices,
): Promise<void> {
  const execution = await services.getExecution(companyId, executionId)
  if (!execution) throw new Error(`Execution not found: ${executionId}`)
  if (execution.status !== "paused") return

  const workflow = await services.loadWorkflowVersion(
    execution.workflowId,
    execution.workflowVersion,
  )

  execution.status = "running"
  execution.context.delayedUntil = null
  await services.updateExecution(companyId, executionId, {
    status: "running",
    context: execution.context,
  })

  const currentNodeId = execution.currentNodeId
  if (!currentNodeId) {
    await failExecution(executionId, companyId, services, "Missing currentNodeId on resume")
    return
  }

  const startNode = findNextNode(workflow, currentNodeId, null)
  if (!startNode) {
    await completeExecution(executionId, companyId, services, null)
    return
  }

  const tempExecution: Execution = {
    ...execution,
    context: { ...execution.context },
  }

  try {
    await executeNodeAndContinue(startNode, tempExecution, workflow, services)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected resume error"
    logger.error(`resumeExecution threw`, { executionId, companyId }, err)
    await failExecution(executionId, companyId, services, msg)
  }
}

async function executeLoop(
  execution: Execution,
  workflow: Workflow,
  services: EngineServices,
): Promise<void> {
  const ctx: ExecutionContext = { ...execution.context }
  let nodeVisitCount = 0

  let currentNode = findFirstNode(workflow)

  while (currentNode) {
    nodeVisitCount++
    if (nodeVisitCount > MAX_NODE_VISITS) {
      await failExecution(
        execution.id,
        execution.companyId,
        services,
        `Execution exceeded max node visits (${MAX_NODE_VISITS})`,
      )
      return
    }

    const duration = execution.startedAt
      ? Date.now() - execution.startedAt.getTime()
      : 0
    if (duration > MAX_DURATION_MS) {
      await failExecution(
        execution.id,
        execution.companyId,
        services,
        `Execution exceeded max duration (${MAX_DURATION_MS / 60000} min)`,
      )
      return
    }

    if (currentNode.type === "delay") {
      ctx.visitedNodes.push(currentNode.id)
      const handled = await handleDelayNode(
        currentNode,
        execution,
        workflow,
        services,
        ctx,
      )
      if (handled) return
      currentNode = findNextNode(workflow, currentNode.id, null)
      continue
    }

    const result = await executeNodeAndLog(
      currentNode,
      ctx,
      execution,
      workflow,
      services,
    )

    if (!result) return

    ctx.visitedNodes.push(currentNode.id)

    const branch = extractBranch(result)
    currentNode = findNextNode(workflow, currentNode.id, branch)

    if (currentNode?.type === "end") {
      await executeEndNode(currentNode, ctx, execution, workflow, services)
      break
    }
  }

  await completeExecution(execution.id, execution.companyId, services, null)
}

async function executeNodeAndLog(
  node: WorkflowNode,
  ctx: ExecutionContext,
  execution: Execution,
  workflow: Workflow,
  services: EngineServices,
): Promise<ActionResult | null> {
  const logBase = buildLogBase(execution, node)

  await services.writeLog(execution.companyId, execution.id, {
    ...logBase,
    status: "pending",
    duration: null,
    input: null,
    output: null,
    error: null,
    timestamp: new Date(),
  })

  let result: ActionResult
  try {
    result = await executeNode(node, ctx, {})
  } catch (err) {
    await services.writeLog(execution.companyId, execution.id, {
    ...logBase,
    status: "error",
    duration: null,
    input: sanitizePII(node.config),
    output: null,
    error: err instanceof Error ? err.message : "Node execution threw",
    timestamp: new Date(),
  })
    await failExecution(
      execution.id,
      execution.companyId,
      services,
      err instanceof Error ? err.message : "Node execution threw",
    )
    return null
  }

    await services.writeLog(execution.companyId, execution.id, {
      ...logBase,
      status: result.success ? "success" : "error",
      duration: null,
      input: sanitizePII(node.config),
      output: sanitizePII(result.output),
      error: result.error,
      timestamp: new Date(),
    })

  if (!result.success) {
    const maxRetries = execution.maxRetries ?? MAX_RETRIES
  if (result.retryable && execution.retryCount < maxRetries) {
      const nextAttempt = execution.retryCount + 1
      await services.scheduleRetry(execution.companyId, execution.id, nextAttempt)
      return null
    }

    await failExecution(
      execution.id,
      execution.companyId,
      services,
      result.error ?? "Node execution failed",
    )
    return null
  }

  if (result.output) {
    ctx.variables = {
      ...ctx.variables,
      outputs: {
        ...((ctx.variables.outputs ?? {}) as Record<string, unknown>),
        [node.id]: result.output,
      },
    }
  }

  return result
}

async function handleDelayNode(
  node: WorkflowNode,
  execution: Execution,
  _workflow: Workflow,
  services: EngineServices,
  ctx: ExecutionContext,
): Promise<boolean> {
  const logBase = buildLogBase(execution, node)

  await services.writeLog(execution.companyId, execution.id, {
    ...logBase,
    status: "pending",
    duration: null,
    input: null,
    output: null,
    error: null,
    timestamp: new Date(),
  })

  const result = await executeNode(node, ctx, {})

  await services.writeLog(execution.companyId, execution.id, {
    ...logBase,
    status: "success",
    duration: null,
    input: sanitizePII(node.config),
    output: sanitizePII(result.output),
    error: null,
    timestamp: new Date(),
  })

  const delayedUntilStr = result.output?.delayedUntil as string | undefined
  if (!delayedUntilStr) return false

  const delayedUntil = new Date(delayedUntilStr)
  const now = Date.now()

  if (delayedUntil.getTime() <= now) {
    return false
  }

  ctx.delayedUntil = delayedUntil

  await services.updateExecution(execution.companyId, execution.id, {
    status: "paused",
    currentNodeId: node.id,
    context: ctx,
  })

  await services.scheduleResume(execution.companyId, execution.id, delayedUntil)

  return true
}

async function executeEndNode(
  node: WorkflowNode,
  ctx: ExecutionContext,
  execution: Execution,
  _workflow: Workflow,
  services: EngineServices,
): Promise<void> {
  const logBase = buildLogBase(execution, node)

  const result = await executeNode(node, ctx, {})

  await services.writeLog(execution.companyId, execution.id, {
    ...logBase,
    status: "success",
    duration: null,
    input: sanitizePII(node.config),
    output: sanitizePII(result.output),
    error: null,
    timestamp: new Date(),
  })
}

async function executeNodeAndContinue(
  node: WorkflowNode,
  execution: Execution,
  workflow: Workflow,
  services: EngineServices,
): Promise<void> {
  const ctx: ExecutionContext = { ...execution.context }
  let nodeVisitCount = execution.context.visitedNodes.length
  let currentNode: WorkflowNode | null = node

  while (currentNode) {
    nodeVisitCount++
    if (nodeVisitCount > MAX_NODE_VISITS) {
      await failExecution(
        execution.id,
        execution.companyId,
        services,
        `Execution exceeded max node visits (${MAX_NODE_VISITS})`,
      )
      return
    }

    if (currentNode.type === "delay") {
      ctx.visitedNodes.push(currentNode.id)
      const handled = await handleDelayNode(
        currentNode,
        execution,
        workflow,
        services,
        ctx,
      )
      if (handled) return
      currentNode = findNextNode(workflow, currentNode.id, null)
      continue
    }

    const result = await executeNodeAndLog(
      currentNode,
      ctx,
      execution,
      workflow,
      services,
    )

    if (!result) return

    ctx.visitedNodes.push(currentNode.id)

    const branch = extractBranch(result)
    currentNode = findNextNode(workflow, currentNode.id, branch)

    if (currentNode?.type === "end") {
      await executeEndNode(currentNode, ctx, execution, workflow, services)
      break
    }
  }

  await completeExecution(execution.id, execution.companyId, services, null)
}

export async function retryExecution(
  executionId: string,
  companyId: string,
  attempt: number,
  services: EngineServices,
): Promise<void> {
  const execution = await services.getExecution(companyId, executionId)
  if (!execution) throw new Error(`Execution not found: ${executionId}`)
  if (execution.status !== "pending") return
  const maxRetries = execution.maxRetries ?? MAX_RETRIES
  if (execution.retryCount > maxRetries) {
    await failExecution(
      executionId,
      companyId,
      services,
      `Max retries exceeded (${maxRetries})`,
    )
    return
  }

  await runExecution(executionId, companyId, services)
}

export function findFirstNode(workflow: Workflow): WorkflowNode | null {
  const triggerNode = workflow.nodes.find((n) => n.type === "trigger")
  if (!triggerNode) return null

  return findNextNode(workflow, triggerNode.id, null)
}

export function findNextNode(
  workflow: Workflow,
  currentNodeId: string,
  branch: boolean | null,
): WorkflowNode | null {
  const edge = workflow.edges.find((e) => {
    if (e.from !== currentNodeId) return false
    if (branch !== null && e.branch !== branch) return false
    if (branch === null && e.branch !== null) return false
    return true
  })

  if (!edge) return null

  return workflow.nodes.find((n) => n.id === edge.to) ?? null
}

export async function completeExecution(
  executionId: string,
  companyId: string,
  services: EngineServices,
  error: string | null,
): Promise<void> {
  const execution = await services.getExecution(companyId, executionId)
  if (!execution) return

  const now = new Date()
  const startedAt = execution.startedAt ?? now
  const durationMs = now.getTime() - startedAt.getTime()

  await services.updateExecution(companyId, executionId, {
    status: error ? "failed" : "completed",
    finishedAt: now,
    duration: durationMs,
    error,
  })

  if (!error) {
    const completedEvent: AutomationEvent = {
      id: executionId,
      companyId,
      type: "automation.completed",
      data: {
        executionId,
        workflowId: execution.workflowId,
        duration: durationMs,
        nodeCount: execution.context.visitedNodes.length,
      },
      source: "automation-engine",
      timestamp: now,
      correlationId: null,
    }
    await automationEventBus.emit(completedEvent)
  }
}

async function failExecution(
  executionId: string,
  companyId: string,
  services: EngineServices,
  errorMessage: string,
): Promise<void> {
  const execution = await services.getExecution(companyId, executionId)
  if (!execution) return

  const now = new Date()
  const startedAt = execution.startedAt ?? now
  const durationMs = now.getTime() - startedAt.getTime()

  await services.updateExecution(companyId, executionId, {
    status: "failed",
    finishedAt: now,
    duration: durationMs,
    error: errorMessage,
  })

  const failedEvent: AutomationEvent = {
    id: executionId,
    companyId,
    type: "automation.failed",
    data: {
      executionId,
      workflowId: execution.workflowId,
      error: errorMessage,
      nodeCount: execution.context.visitedNodes.length,
    },
    source: "automation-engine",
    timestamp: now,
    correlationId: null,
  }
  await automationEventBus.emit(failedEvent)
}

function buildLogBase(
  execution: Execution,
  node: WorkflowNode,
): Omit<ExecutionLog, "id" | "status" | "timestamp" | "duration" | "input" | "output" | "error"> {
  return {
    executionId: execution.id,
    companyId: execution.companyId,
    nodeId: node.id,
    nodeType: node.type,
    retryAttempt: execution.retryCount,
  }
}

function extractBranch(result: ActionResult): boolean | null {
  const branchStr = result.output?.branch as string | undefined
  if (branchStr === "true") return true
  if (branchStr === "false") return false
  return null
}

export { failExecution }
