"use client"

import { useState, useCallback, useMemo } from "react"
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react"
import { v4 as uuid } from "uuid"
import { PALETTE_ITEMS } from "../constants"
import type { EditorNode, EditorEdge, EditorNodeData } from "../types"

export function useWorkflowEditor() {
  const [nodes, setNodes] = useState<EditorNode[]>([])
  const [edges, setEdges] = useState<EditorEdge[]>([])
  const [selectedNode, setSelectedNode] = useState<EditorNode | null>(null)

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds) as EditorNode[])
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds) as EditorEdge[])
  }, [])

  const onConnect = useCallback((connection: Connection) => {
    const edgeId = uuid()
    setEdges((eds) =>
      addEdge(
        {
          ...connection,
          id: edgeId,
          data: {
            label: connection.sourceHandle === "true" ? "Sí" : connection.sourceHandle === "false" ? "No" : null,
            branch: connection.sourceHandle === "true" ? true : connection.sourceHandle === "false" ? false : null,
          },
        },
        eds,
      ) as EditorEdge[],
    )
  }, [])

  const onSelectNode = useCallback((node: EditorNode | null) => {
    setSelectedNode(node)
  }, [])

  const addNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const paletteItem = PALETTE_ITEMS.find((p) => p.type === type)
      if (!paletteItem) return

      const editorType = getRfType(type)
      const id = uuid()

      const defaultConfig = { ...(paletteItem.defaultConfig ?? {}) }

      if (type.startsWith("action.")) {
        defaultConfig.actionType = type.replace("action.", "")
      }

      if (type === "whatsapp.message.received" || type === "customer.created" || type === "sale.created") {
        defaultConfig.eventType = type
      }

      const newNode: EditorNode = {
        id,
        type: editorType,
        position,
        data: {
          label: paletteItem.label,
          nodeType: type,
          actionType: type.startsWith("action.") ? type.replace("action.", "") : undefined,
          config: defaultConfig,
        },
      }

      setNodes((nds) => [...nds, newNode])
      setSelectedNode(newNode)
    },
    [],
  )

  const updateNodeConfig = useCallback((nodeId: string, config: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n
        const updated: EditorNode = {
          ...n,
          data: { ...n.data, config },
        }
        return updated
      }),
    )
    setSelectedNode((prev) => {
      if (!prev || prev.id !== nodeId) return prev
      return {
        ...prev,
        data: { ...prev.data, config },
      }
    })
  }, [])

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    setSelectedNode((prev) => prev?.id === nodeId ? null : prev)
  }, [])

  const resetEditor = useCallback((newNodes: EditorNode[], newEdges: EditorEdge[]) => {
    setNodes(newNodes)
    setEdges(newEdges)
    setSelectedNode(null)
  }, [])

  const validate = useCallback((): string[] => {
    const errors: string[] = []

    if (nodes.length === 0) {
      errors.push("El workflow debe tener al menos un nodo")
      return errors
    }

    const triggerCount = nodes.filter((n) => n.type === "trigger").length
    if (triggerCount === 0) errors.push("Debe haber un nodo de disparador (trigger)")
    if (triggerCount > 1) errors.push("Solo puede haber un nodo de disparador")

    const endCount = nodes.filter((n) => n.type === "end").length
    if (endCount === 0) errors.push("Debe haber al menos un nodo de finalización")

    const nodeIds = new Set(nodes.map((n) => n.id))
    for (const edge of edges) {
      if (!nodeIds.has(edge.source)) errors.push(`El nodo origen "${edge.source}" no existe`)
      if (!nodeIds.has(edge.target)) errors.push(`El nodo destino "${edge.target}" no existe`)
    }

    const triggerNodes = nodes.filter((n) => n.type === "trigger")
    for (const tn of triggerNodes) {
      const hasOutgoing = edges.some((e) => e.source === tn.id)
      if (!hasOutgoing) errors.push("El trigger debe estar conectado a otro nodo")
    }

    const conditionNodes = nodes.filter((n) => n.type === "condition")
    for (const cn of conditionNodes) {
      const outgoing = edges.filter((e) => e.source === cn.id)
      const trueBranch = outgoing.find((e) => e.sourceHandle === "true")
      const falseBranch = outgoing.find((e) => e.sourceHandle === "false")
      if (!trueBranch) errors.push(`La condición "${cn.data.label}" necesita una rama "Sí"`)
      if (!falseBranch) errors.push(`La condición "${cn.data.label}" necesita una rama "No"`)
    }

    const visited = new Set<string>()
    const hasCycle = detectCycle(nodes, edges, visited)
    if (hasCycle) errors.push("El workflow contiene ciclos")

    const endNodes = nodes.filter((n) => n.type === "end")
    for (const en of endNodes) {
      const hasIncoming = edges.some((e) => e.target === en.id)
      if (!hasIncoming) errors.push(`El nodo "${en.data.label}" no está conectado a ningún nodo`)
    }

    return errors
  }, [nodes, edges])

  return {
    nodes,
    edges,
    selectedNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onSelectNode,
    addNode,
    updateNodeConfig,
    deleteNode,
    resetEditor,
    validate,
  }
}

function getRfType(engineType: string): EditorNode["type"] {
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

function detectCycle(nodes: EditorNode[], edges: EditorEdge[], visited: Set<string>): boolean {
  const adj = new Map<string, string[]>()
  for (const node of nodes) adj.set(node.id, [])
  for (const edge of edges) {
    const list = adj.get(edge.source)
    if (list) list.push(edge.target)
  }

  const recStack = new Set<string>()

  function dfs(id: string): boolean {
    if (recStack.has(id)) return true
    if (visited.has(id)) return false
    visited.add(id)
    recStack.add(id)
    for (const neighbor of adj.get(id) ?? []) {
      if (dfs(neighbor)) return true
    }
    recStack.delete(id)
    return false
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true
    }
  }
  return false
}
