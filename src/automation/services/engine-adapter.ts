import type { EngineServices } from "../engine/workflow-engine"
import type { AutomationEvent } from "../types/events"
import type { Execution, ExecutionLog, ExecutionContext } from "../types/execution"
import type { Workflow } from "../types/workflow"
import { workflowService } from "./workflow.service"
import { executionService } from "./execution.service"
import { schedulerService } from "./scheduler.service"

export function createEngineAdapter(companyId: string): EngineServices {
  return {
    async findWorkflowsByEvent(event: AutomationEvent): Promise<Workflow[]> {
      return workflowService.findWorkflowsByEvent(event.companyId, event)
    },

    async loadWorkflowVersion(workflowId: string, version: number): Promise<Workflow> {
      return workflowService.loadWorkflowVersion(companyId, workflowId, version)
    },

    async createExecution(data: {
      workflowId: string
      workflowVersion: number
      companyId: string
      triggerEvent: string
      context: ExecutionContext
    }): Promise<string> {
      return executionService.create(data)
    },

    async getExecution(_companyId: string, executionId: string): Promise<Execution | null> {
      return executionService.getById(companyId, executionId)
    },

    async updateExecution(
      _companyId: string,
      executionId: string,
      updates: Partial<Execution>,
    ): Promise<void> {
      return executionService.update(companyId, executionId, updates)
    },

    async writeLog(
      _companyId: string,
      executionId: string,
      log: Omit<ExecutionLog, "id">,
    ): Promise<string> {
      return executionService.writeLog(companyId, executionId, log)
    },

    async scheduleExecution(
      _companyId: string,
      executionId: string,
      scheduledAt?: Date | null,
    ): Promise<string> {
      return schedulerService.scheduleExecution(companyId, executionId, scheduledAt)
    },

    async scheduleRetry(
      _companyId: string,
      executionId: string,
      attempt: number,
    ): Promise<string> {
      return schedulerService.scheduleRetry(companyId, executionId, attempt)
    },

    async scheduleResume(
      _companyId: string,
      executionId: string,
      scheduledAt: Date,
    ): Promise<string> {
      return schedulerService.scheduleResume(companyId, executionId, scheduledAt)
    },
  }
}
