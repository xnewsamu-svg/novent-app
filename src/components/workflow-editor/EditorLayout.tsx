"use client"

import { useEffect, useCallback, useMemo, useReducer, useState } from "react"
import { Canvas } from "./Canvas"
import { Sidebar } from "./Sidebar"
import { Toolbar } from "./Toolbar"
import { Inspector } from "./Inspector"
import { useWorkflowEditor } from "./hooks/use-workflow-editor"
import { useWorkflowSave } from "./hooks/use-workflow-save"
import type { EditorState, EditorNode, EditorEdge } from "./types"
import { engineNodeToEditorNode, engineEdgeToEditorEdge, editorNodeToEngineNode, editorEdgeToEngineEdge } from "./types"
import type { Workflow, WorkflowTrigger } from "@/src/automation/types/workflow"
import { toast } from "sonner"

const TRIGGER_OPTIONS = [
  { value: "whatsapp.message.received", label: "WhatsApp recibido" },
  { value: "customer.created", label: "Cliente creado" },
  { value: "sale.created", label: "Venta creada" },
]

interface EditorLayoutProps {
  companyId: string
  workflowId: string | null
}

export function EditorLayout({ companyId, workflowId }: EditorLayoutProps) {
  const {
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
  } = useWorkflowEditor()

  const { loadWorkflow, saveDraft, publish, unpublish, isSaving, isPublishing } = useWorkflowSave()

  const [workflowName, setWorkflowName] = useState("Nuevo workflow")
  const [workflow, setWorkflow] = useState<Partial<Workflow> | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [trigger, dispatchTrigger] = useReducer(
    (prev: WorkflowTrigger, action: Partial<WorkflowTrigger>): WorkflowTrigger => {
      for (const k of Object.keys(action) as Array<keyof WorkflowTrigger>) {
        if (prev[k] !== action[k]) return { ...prev, ...action }
      }
      return prev
    },
    { eventType: "customer.created", filters: null, schedule: null },
  )
  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null)

  const isDirty = useMemo(() => {
    if (initialSnapshot === null) return false
    return JSON.stringify({ nodes, edges }) !== initialSnapshot
  }, [nodes, edges, initialSnapshot])

  useEffect(() => {
    if (!workflowId || isLoaded) return
    ;(async () => {
      const result = await loadWorkflow(companyId, workflowId)
      if (!result) return
      resetEditor(result.nodes, result.edges)
      setWorkflow(result.workflow)
      setWorkflowName(result.workflow.name ?? "Sin nombre")
      if (result.workflow.trigger) dispatchTrigger(result.workflow.trigger)
      setInitialSnapshot(JSON.stringify({ nodes: result.nodes, edges: result.edges }))
      setIsLoaded(true)
    })()
  }, [companyId, workflowId, loadWorkflow, resetEditor, isLoaded])

  // Sync trigger.eventType from the trigger node
  useEffect(() => {
    const triggerNode = nodes.find((n) => n.type === "trigger")
    if (triggerNode?.data?.nodeType) {
      dispatchTrigger({ eventType: triggerNode.data.nodeType })
    }
  }, [nodes])

  const editorState: EditorState = useMemo(() => ({
    workflowId,
    workflow,
    mode: workflowId ? "edit" : "create",
    isDirty,
    isValidating,
    validationErrors,
    isSaving,
    isPublishing,
  }), [workflowId, workflow, isDirty, isValidating, validationErrors, isSaving, isPublishing])

  const runValidation = useCallback(() => {
    setIsValidating(true)
    const errors = validate()
    setValidationErrors(errors)
    setIsValidating(false)
    return errors
  }, [validate])

  const handleValidate = useCallback(() => {
    const errors = runValidation()
    if (errors.length === 0) toast.success("Workflow válido")
  }, [runValidation])

  const handleSave = useCallback(async () => {
    const errors = runValidation()
    if (errors.length > 0) {
      toast.error("Corrige los errores antes de guardar")
      return
    }

    const newId = await saveDraft(companyId, workflowId, workflowName, trigger, nodes, edges)
    if (newId) {
      setInitialSnapshot(JSON.stringify({ nodes, edges }))
      if (!workflowId) {
        window.history.replaceState(null, "", `/automatizaciones/${newId}`)
      }
    }
  }, [companyId, workflowId, workflowName, trigger, nodes, edges, runValidation, saveDraft])

  const handlePublish = useCallback(async () => {
    const errors = runValidation()
    if (errors.length > 0) {
      toast.error("Corrige los errores antes de publicar")
      return
    }

    if (!workflowId) {
      const newId = await saveDraft(companyId, null, workflowName, trigger, nodes, edges)
      if (newId) {
        await publish(companyId, newId)
        window.history.replaceState(null, "", `/automatizaciones/${newId}`)
      }
      return
    }

    await handleSave()
    await publish(companyId, workflowId)
  }, [companyId, workflowId, workflowName, trigger, nodes, edges, runValidation, saveDraft, publish, handleSave])

  const handleUnpublish = useCallback(async () => {
    if (!workflowId) return
    await unpublish(companyId, workflowId)
    setWorkflow((prev) => prev ? { ...prev, enabled: false } : prev)
  }, [companyId, workflowId, unpublish])

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Cargando...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <Toolbar
        workflowName={workflowName}
        onNameChange={setWorkflowName}
        state={editorState}
        onSave={handleSave}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        onValidate={handleValidate}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <Canvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onAddNode={addNode}
          onSelectNode={onSelectNode}
        />
        <Inspector
          node={selectedNode}
          onUpdateConfig={updateNodeConfig}
          onDeleteNode={deleteNode}
        />
      </div>
    </div>
  )
}
