import type { Workflow, WorkflowTrigger, WorkflowNode, WorkflowEdge } from "@/src/automation/types/workflow"

interface ApiResponse<T> {
  error?: string
  [key: string]: unknown
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  })

  const data: ApiResponse<T> & T = await res.json()

  if (!res.ok || data.error) {
    throw new Error(data.error ?? `Error ${res.status}`)
  }

  return data
}

export interface WorkflowListResponse {
  workflows: Workflow[]
}

export interface WorkflowCreateResponse {
  workflowId: string
  companyId: string
}

export interface WorkflowGetResponse {
  workflow: Workflow
}

export interface WorkflowUpdateResponse {
  success: true
  workflowId: string
}

export interface WorkflowPublishResponse {
  success: true
  workflowId: string
  version: number
}

export const workflowApi = {
  list(): Promise<WorkflowListResponse> {
    return apiFetch<WorkflowListResponse>("/api/workflows")
  },

  create(data: {
    name?: string
    description?: string | null
    trigger?: WorkflowTrigger
    nodes?: WorkflowNode[]
    edges?: WorkflowEdge[]
  }): Promise<WorkflowCreateResponse> {
    return apiFetch<WorkflowCreateResponse>("/api/workflows", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  get(workflowId: string): Promise<WorkflowGetResponse> {
    return apiFetch<WorkflowGetResponse>(`/api/workflows/${workflowId}`)
  },

  update(
    workflowId: string,
    data: Partial<{
      name: string
      description: string | null
      trigger: WorkflowTrigger
      nodes: WorkflowNode[]
      edges: WorkflowEdge[]
      enabled: boolean
    }>,
  ): Promise<WorkflowUpdateResponse> {
    return apiFetch<WorkflowUpdateResponse>(`/api/workflows/${workflowId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  delete(workflowId: string): Promise<{ success: true }> {
    return apiFetch<{ success: true }>(`/api/workflows/${workflowId}`, {
      method: "DELETE",
    })
  },

  publish(workflowId: string): Promise<WorkflowPublishResponse> {
    return apiFetch<WorkflowPublishResponse>(`/api/workflows/${workflowId}/publish`, {
      method: "POST",
    })
  },

  unpublish(workflowId: string): Promise<{ success: true; workflowId: string }> {
    return apiFetch<{ success: true; workflowId: string }>(`/api/workflows/${workflowId}/unpublish`, {
      method: "POST",
    })
  },
}
