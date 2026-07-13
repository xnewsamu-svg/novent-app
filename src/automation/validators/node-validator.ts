import type { WorkflowNode } from "../types/workflow"

export interface NodeValidationError {
  nodeId: string
  message: string
}

export function validateNodes(nodes: WorkflowNode[]): NodeValidationError[] {
  const errors: NodeValidationError[] = []

  if (nodes.length === 0) {
    errors.push({ nodeId: "", message: "Workflow must have at least one node" })
    return errors
  }

  const ids = new Set<string>()
  const triggerCount = nodes.filter((n) => n.type === "trigger").length
  const endCount = nodes.filter((n) => n.type === "end").length

  for (const node of nodes) {
    if (!node.id) {
      errors.push({ nodeId: "", message: "Node missing id" })
      continue
    }

    if (ids.has(node.id)) {
      errors.push({ nodeId: node.id, message: `Duplicate node id: ${node.id}` })
    }
    ids.add(node.id)

    if (!node.type) {
      errors.push({ nodeId: node.id, message: `Node ${node.id} missing type` })
    }

    if (node.config === undefined || node.config === null) {
      errors.push({ nodeId: node.id, message: `Node ${node.id} missing config` })
    }

    if (node.type === "condition") {
      const hasExpression = node.config.expression !== undefined
      if (!hasExpression) {
        errors.push({
          nodeId: node.id,
          message: `Condition node ${node.id} missing expression in config`,
        })
      }
    }

    if (node.type === "action" || node.type?.startsWith("action.")) {
      const hasActionType =
        typeof node.config.actionType === "string" &&
        node.config.actionType.length > 0
      if (!hasActionType) {
        errors.push({
          nodeId: node.id,
          message: `Action node ${node.id} missing actionType in config`,
        })
      }
    }
  }

  if (triggerCount === 0) {
    errors.push({ nodeId: "", message: "Workflow must have exactly one trigger node" })
  } else if (triggerCount > 1) {
    errors.push({ nodeId: "", message: `Workflow has ${triggerCount} trigger nodes, expected 1` })
  }

  if (endCount === 0) {
    errors.push({ nodeId: "", message: "Workflow must have at least one end node" })
  }

  return errors
}
