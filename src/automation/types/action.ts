import type { ExecutionContext } from "./execution"

export interface ActionDependencies {
  [key: string]: unknown
}

export interface ActionResult {
  success: boolean
  output: Record<string, unknown> | null
  error: string | null
  retryable: boolean
  jobId?: string
}

export interface ActionExecutor<C = Record<string, unknown>> {
  type: string
  label: string
  description: string
  configSchema: Record<string, unknown>
  execute(
    config: C,
    context: ExecutionContext,
    deps: ActionDependencies,
  ): Promise<ActionResult>
}
