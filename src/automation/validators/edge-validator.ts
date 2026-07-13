import type { WorkflowNode, WorkflowEdge } from "../types/workflow"

export interface EdgeValidationError {
  edgeId: string
  message: string
}

export function validateEdges(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): EdgeValidationError[] {
  const errors: EdgeValidationError[] = []
  const nodeIds = new Set(nodes.map((n) => n.id))
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  if (edges.length === 0 && nodes.length > 0) {
    errors.push({ edgeId: "", message: "Workflow has nodes but no edges" })
    return errors
  }

  for (const edge of edges) {
    if (!edge.id) {
      errors.push({ edgeId: "", message: "Edge missing id" })
      continue
    }

    if (!edge.from) {
      errors.push({ edgeId: edge.id, message: `Edge ${edge.id} missing "from"` })
    } else if (!nodeIds.has(edge.from)) {
      errors.push({
        edgeId: edge.id,
        message: `Edge ${edge.id} references non-existent from node: ${edge.from}`,
      })
    }

    if (!edge.to) {
      errors.push({ edgeId: edge.id, message: `Edge ${edge.id} missing "to"` })
    } else if (!nodeIds.has(edge.to)) {
      errors.push({
        edgeId: edge.id,
        message: `Edge ${edge.id} references non-existent to node: ${edge.to}`,
      })
    }

    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue

    const fromNode = nodeMap.get(edge.from)
    if (fromNode?.type === "trigger" && edge.branch !== null) {
      errors.push({
        edgeId: edge.id,
        message: `Trigger node edge ${edge.id} should not have a branch label`,
      })
    }

    if (fromNode?.type === "end") {
      errors.push({
        edgeId: edge.id,
        message: `End node ${edge.from} should not have outgoing edges`,
      })
    }
  }

  for (const node of nodes) {
    const outgoing = edges.filter((e) => e.from === node.id)

    if (node.type === "end" && outgoing.length > 0) {
      errors.push({
        edgeId: "",
        message: `End node ${node.id} should not have outgoing edges`,
      })
    }

    if (node.type !== "end" && node.type !== "trigger" && outgoing.length === 0) {
      errors.push({
        edgeId: "",
        message: `Node ${node.id} (${node.type}) has no outgoing edges`,
      })
    }

    if (node.type === "condition") {
      const trueBranches = outgoing.filter((e) => e.branch === true)
      const falseBranches = outgoing.filter((e) => e.branch === false)
      const unmarked = outgoing.filter((e) => e.branch === null)

      if (trueBranches.length !== 1 || falseBranches.length !== 1) {
        errors.push({
          edgeId: "",
          message: `Condition node ${node.id} must have exactly one true branch and one false branch`,
        })
      }

      if (unmarked.length > 0) {
        errors.push({
          edgeId: "",
          message: `Condition node ${node.id} has unmarked edges (all must be true/false)`,
        })
      }
    }

    if (node.type === "trigger" && outgoing.length > 1) {
      errors.push({
        edgeId: "",
        message: `Trigger node ${node.id} should have exactly one outgoing edge`,
      })
    }
  }

  const cycleErrors = detectCycles(nodes, edges)
  errors.push(...cycleErrors)

  return errors
}

function detectCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): EdgeValidationError[] {
  const errors: EdgeValidationError[] = []
  const adjacency = new Map<string, string[]>()
  for (const node of nodes) {
    adjacency.set(node.id, [])
  }
  for (const edge of edges) {
    const neighbors = adjacency.get(edge.from)
    if (neighbors) {
      neighbors.push(edge.to)
    }
  }

  const visited = new Set<string>()
  const inStack = new Set<string>()

  function dfs(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true
    if (visited.has(nodeId)) return false

    visited.add(nodeId)
    inStack.add(nodeId)

    const node = nodes.find((n) => n.id === nodeId)
    const isDelay = node?.type === "delay"
    const neighbors = adjacency.get(nodeId) ?? []

    for (const neighbor of neighbors) {
      if (isDelay) continue
      if (dfs(neighbor)) {
        return true
      }
    }

    inStack.delete(nodeId)
    return false
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        errors.push({
          edgeId: "",
          message: `Workflow contains a cycle without delay nodes`,
        })
        break
      }
    }
  }

  return errors
}
