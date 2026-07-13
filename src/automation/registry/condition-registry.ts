import type { ConditionEvaluator } from "../types/condition"

export class ConditionRegistry {
  private evaluators = new Map<string, ConditionEvaluator>()

  register(evaluator: ConditionEvaluator): void {
    if (this.evaluators.has(evaluator.type)) {
      return
    }
    this.evaluators.set(evaluator.type, evaluator)
  }

  get(type: string): ConditionEvaluator {
    const evaluator = this.evaluators.get(type)
    if (!evaluator) {
      throw new Error(`Condition evaluator not registered: ${type}`)
    }
    return evaluator
  }

  getAll(): ConditionEvaluator[] {
    return Array.from(this.evaluators.values())
  }

  has(type: string): boolean {
    return this.evaluators.has(type)
  }
}

export const conditionRegistry = new ConditionRegistry()
