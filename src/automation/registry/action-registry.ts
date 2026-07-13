import type { ActionExecutor } from "../types/action"

export class ActionRegistry {
  private executors = new Map<string, ActionExecutor>()

  register(executor: ActionExecutor): void {
    if (this.executors.has(executor.type)) {
      return
    }
    this.executors.set(executor.type, executor)
  }

  get(type: string): ActionExecutor {
    const executor = this.executors.get(type)
    if (!executor) {
      throw new Error(`Action not registered: ${type}`)
    }
    return executor
  }

  getAll(): ActionExecutor[] {
    return Array.from(this.executors.values())
  }

  has(type: string): boolean {
    return this.executors.has(type)
  }
}

export const actionRegistry = new ActionRegistry()
