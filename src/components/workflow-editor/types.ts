import type { Node, Edge } from "@xyflow/react"
import type { WorkflowNode, WorkflowEdge, Workflow } from "@/src/automation/types/workflow"

export type EditorNodeType = "trigger" | "condition" | "action" | "end"

export interface EditorNodeData {
  label: string
  nodeType: string
  actionType?: string
  config: Record<string, unknown>
  [key: string]: unknown
}

export type EditorNode = Node<EditorNodeData, EditorNodeType>

export type EditorEdge = Edge<{ label: string | null; branch: boolean | null }>

export type EditorMode = "create" | "edit"

export interface EditorState {
  workflowId: string | null
  workflow: Partial<Workflow> | null
  mode: EditorMode
  isDirty: boolean
  isValidating: boolean
  validationErrors: string[]
  isSaving: boolean
  isPublishing: boolean
}

export function engineNodeToEditorNode(node: WorkflowNode): EditorNode {
  const editorType = getEditorNodeType(node.type)
  const label = getNodeDefaultLabel(node)
  const config = { ...node.config }

  if (node.type.startsWith("action.") && !config.actionType) {
    config.actionType = node.type.replace("action.", "")
  }

  if (editorType === "trigger" && !config.eventType) {
    config.eventType = node.type
  }

  return {
    id: node.id,
    type: editorType,
    position: node.position,
    data: {
      label,
      nodeType: node.type,
      actionType: node.type.startsWith("action.") ? node.type.replace("action.", "") : undefined,
      config,
    },
  }
}

export function editorNodeToEngineNode(node: EditorNode): WorkflowNode {
  const config = { ...node.data.config }

  if (node.data.nodeType.startsWith("action.") && !config.actionType) {
    config.actionType = node.data.nodeType.replace("action.", "")
  }

  if (node.type === "trigger" && !config.eventType) {
    config.eventType = node.data.nodeType
  }

  return {
    id: node.id,
    type: node.data.nodeType,
    position: node.position,
    config,
  }
}

export function engineEdgeToEditorEdge(edge: WorkflowEdge): EditorEdge {
  return {
    id: edge.id,
    source: edge.from,
    target: edge.to,
    sourceHandle: edge.branch === true ? "true" : edge.branch === false ? "false" : undefined,
    data: { label: edge.label, branch: edge.branch },
  }
}

export function editorEdgeToEngineEdge(edge: EditorEdge): WorkflowEdge {
  return {
    id: edge.id,
    from: edge.source,
    to: edge.target,
    label: edge.data?.label ?? null,
    branch: edge.sourceHandle === "true" ? true : edge.sourceHandle === "false" ? false : null,
  }
}

function getEditorNodeType(engineType: string): EditorNodeType {
  switch (engineType) {
    case "condition":
      return "condition"
    case "end":
      return "end"
    default:
      if (engineType.startsWith("action.") || engineType === "delay") return "action"
      return "trigger"
  }
}

function getNodeDefaultLabel(node: WorkflowNode): string {
  const engineType = node.type
  if (TRIGGER_LABELS[engineType]) return TRIGGER_LABELS[engineType]
  if (ACTION_LABELS[engineType]) return ACTION_LABELS[engineType]
  if (engineType === "condition") return "Si"
  if (engineType === "end") return "Finalizar"
  return engineType
}

export const TRIGGER_LABELS: Record<string, string> = {
  "whatsapp.message.received": "WhatsApp recibido",
  "customer.created": "Cliente creado",
  "sale.created": "Venta creada",
}

export const ACTION_LABELS: Record<string, string> = {
  "action.whatsapp.send": "Enviar WhatsApp",
  "action.customer.create": "Crear Cliente",
  "action.customer.update": "Actualizar Cliente",
  "action.delay": "Esperar",
}
