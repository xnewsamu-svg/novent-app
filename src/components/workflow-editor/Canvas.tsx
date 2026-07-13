"use client"

import { useCallback, useRef, type DragEvent } from "react"
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type ReactFlowInstance,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type { EditorNode, EditorEdge } from "./types"
import { TriggerNode, ActionNode, ConditionNode, EndNode } from "./nodes"
import { RF_DEFAULT_EDGE_OPTIONS, RF_DEFAULT_VIEWPORT } from "./constants"

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  end: EndNode,
}

interface CanvasProps {
  nodes: EditorNode[]
  edges: EditorEdge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  onAddNode: (type: string, position: { x: number; y: number }, config?: Record<string, unknown>) => void
  onSelectNode: (node: EditorNode | null) => void
}

export function Canvas({ nodes, edges, onNodesChange, onEdgesChange, onConnect, onAddNode, onSelectNode }: CanvasProps) {
  const rfInstance = useRef<ReactFlowInstance<EditorNode, EditorEdge> | null>(null)

  const onInit = useCallback((instance: ReactFlowInstance<EditorNode, EditorEdge>) => {
    rfInstance.current = instance
  }, [])

  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const type = event.dataTransfer.getData("application/reactflow")
    if (!type || !rfInstance.current) return

    const position = rfInstance.current.screenToFlowPosition(
      { x: event.clientX, y: event.clientY },
    )

    onAddNode(type, position)
  }, [onAddNode])

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  return (
    <div className="flex-1 h-full" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onSelectNode(node as EditorNode)}
        onPaneClick={() => onSelectNode(null)}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={RF_DEFAULT_EDGE_OPTIONS}
        defaultViewport={RF_DEFAULT_VIEWPORT}
        onInit={onInit}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        className="bg-zinc-950"
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#27272a" />
        <Controls className="!bg-zinc-900 !border-zinc-800 !rounded-xl !shadow-xl [&>button]:!border-zinc-800 [&>button]:!bg-zinc-900 [&>button]:!text-zinc-400 [&>button]:hover:!bg-zinc-800 [&>button]:hover:!text-white" />
        <MiniMap
          className="!bg-zinc-900 !border-zinc-800 !rounded-xl !shadow-xl"
          nodeColor="#3b82f6"
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>
    </div>
  )
}
