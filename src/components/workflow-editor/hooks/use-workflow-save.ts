"use client"

import { useState, useCallback } from "react"
import { workflowApi } from "../services/workflow-api"
import type { Workflow, WorkflowTrigger } from "@/src/automation/types/workflow"
import type { EditorNode, EditorEdge } from "../types"
import { engineNodeToEditorNode, engineEdgeToEditorEdge, editorNodeToEngineNode, editorEdgeToEngineEdge } from "../types"
import { toast } from "sonner"

export function useWorkflowSave() {
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const loadWorkflow = useCallback(
    async (companyId: string, workflowId: string): Promise<{ nodes: EditorNode[]; edges: EditorEdge[]; workflow: Partial<Workflow> } | null> => {
      try {
        const { workflow } = await workflowApi.get(workflowId)

        const nodes: EditorNode[] = (workflow.nodes ?? []).map((n) =>
          engineNodeToEditorNode({
            id: n.id,
            type: n.type,
            position: n.position ?? { x: 0, y: 0 },
            config: n.config ?? {},
          }),
        )

        const edges: EditorEdge[] = (workflow.edges ?? []).map((e) =>
          engineEdgeToEditorEdge({
            id: e.id,
            from: e.from,
            to: e.to,
            label: e.label ?? null,
            branch: e.branch ?? null,
          }),
        )

        const partial: Partial<Workflow> = {
          id: workflow.id,
          companyId: workflow.companyId,
          name: workflow.name ?? "",
          description: workflow.description ?? null,
          enabled: workflow.enabled ?? false,
          version: workflow.version ?? 0,
          publishedAt: workflow.publishedAt ?? null,
          trigger: workflow.trigger,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt,
        }

        return { nodes, edges, workflow: partial }
      } catch (error: unknown) {
        toast.error("Error al cargar: " + ((error instanceof Error ? error.message : null) ?? "Error desconocido"))
        return null
      }
    },
    [],
  )

  const saveDraft = useCallback(
    async (
      companyId: string,
      workflowId: string | null,
      name: string,
      trigger: WorkflowTrigger,
      nodes: EditorNode[],
      edges: EditorEdge[],
    ): Promise<string | null> => {
      setIsSaving(true)
      try {
        const engineNodes = nodes.map(editorNodeToEngineNode)
        const engineEdges = edges.map(editorEdgeToEngineEdge)

        if (workflowId) {
          await workflowApi.update(workflowId, {
            name,
            trigger,
            nodes: engineNodes,
            edges: engineEdges,
          })
          toast.success("Borrador guardado")
          return workflowId
        } else {
          const { workflowId: newId } = await workflowApi.create({
            name,
            trigger,
            nodes: engineNodes,
            edges: engineEdges,
          })
          toast.success("Workflow creado")
          return newId
        }
      } catch (error: unknown) {
        toast.error("Error al guardar: " + ((error instanceof Error ? error.message : null) ?? "Error desconocido"))
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [],
  )

  const publish = useCallback(
    async (companyId: string, workflowId: string): Promise<boolean> => {
      setIsPublishing(true)
      try {
        const { version } = await workflowApi.publish(workflowId)
        toast.success(`Workflow publicado (v${version})`)
        return true
      } catch (error: unknown) {
        toast.error("Error al publicar: " + ((error instanceof Error ? error.message : null) ?? "Error desconocido"))
        return false
      } finally {
        setIsPublishing(false)
      }
    },
    [],
  )

  const unpublish = useCallback(
    async (companyId: string, workflowId: string): Promise<boolean> => {
      try {
        await workflowApi.unpublish(workflowId)
        toast.success("Workflow despublicado")
        return true
      } catch (error: unknown) {
        toast.error("Error al despublicar: " + ((error instanceof Error ? error.message : null) ?? "Error desconocido"))
        return false
      }
    },
    [],
  )

  return { loadWorkflow, saveDraft, publish, unpublish, isSaving, isPublishing }
}
