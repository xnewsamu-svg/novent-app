import type { Workflow, ValidationResult } from "../types/workflow"
import { validateNodes } from "./node-validator"
import { validateEdges } from "./edge-validator"

export const MAX_WORKFLOW_NODES = 100
export const MAX_WORKFLOW_DEPTH = 50

export function validateWorkflow(workflow: Workflow): ValidationResult {
  const allErrors: string[] = []
  const warnings: string[] = []

  if (!workflow.name || workflow.name.trim().length === 0) {
    allErrors.push("Workflow must have a name")
  }

  if (!workflow.companyId) {
    allErrors.push("Workflow must have a companyId")
  }

  if (!workflow.trigger || !workflow.trigger.eventType) {
    allErrors.push("Workflow must have a trigger with an eventType")
  }

  if (!Array.isArray(workflow.nodes)) {
    allErrors.push("Workflow must have a nodes array")
    return { valid: false, errors: allErrors, warnings }
  }

  if (!Array.isArray(workflow.edges)) {
    allErrors.push("Workflow must have an edges array")
    return { valid: false, errors: allErrors, warnings }
  }

  if (workflow.nodes.length > MAX_WORKFLOW_NODES) {
    allErrors.push(
      `Workflow exceeds maximum nodes (${workflow.nodes.length} > ${MAX_WORKFLOW_NODES})`,
    )
  }

  const nodeErrors = validateNodes(workflow.nodes)
  for (const err of nodeErrors) {
    allErrors.push(`[Node ${err.nodeId || "global"}]: ${err.message}`)
  }

  const edgeErrors = validateEdges(workflow.nodes, workflow.edges)
  for (const err of edgeErrors) {
    allErrors.push(`[Edge ${err.edgeId || "global"}]: ${err.message}`)
  }

  const orphanNodes = workflow.nodes.filter(
    (n) =>
      n.type !== "trigger" &&
      !workflow.edges.some((e) => e.to === n.id),
  )
  for (const node of orphanNodes) {
    warnings.push(`Node ${node.id} (${node.type}) is unreachable: no incoming edges`)
  }

  const deadEndNodes = workflow.nodes.filter((n) => {
    if (n.type === "end") return false
    return !workflow.edges.some((e) => e.from === n.id)
  })
  for (const node of deadEndNodes) {
    warnings.push(`Node ${node.id} (${node.type}) has no outgoing edges`)
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings,
  }
}
