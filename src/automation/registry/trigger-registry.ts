import type { TriggerMatcher } from "../types/trigger"
import type { AutomationEvent } from "../types/events"
import type { Workflow } from "../types/workflow"

export class TriggerRegistry {
  private matchers = new Map<string, TriggerMatcher>()

  register(matcher: TriggerMatcher): void {
    if (this.matchers.has(matcher.type)) return
    this.matchers.set(matcher.type, matcher)
  }

  get(type: string): TriggerMatcher {
    const matcher = this.matchers.get(type)
    if (!matcher) {
      throw new Error(`Trigger not registered: ${type}`)
    }
    return matcher
  }

  getAll(): TriggerMatcher[] {
    return Array.from(this.matchers.values())
  }

  has(type: string): boolean {
    return this.matchers.has(type)
  }

  findMatch(event: AutomationEvent): TriggerMatcher | null {
    for (const matcher of this.matchers.values()) {
      if (matcher.match(event)) return matcher
    }
    return null
  }

  findMatchingWorkflows(
    event: AutomationEvent,
    workflows: Workflow[],
  ): Workflow[] {
    const results: Workflow[] = []
    for (const wf of workflows) {
      const matcher = this.matchers.get(wf.trigger.eventType)
      if (!matcher) continue
      if (matcher.match(event, wf)) {
        results.push(wf)
      }
    }
    return results
  }
}

export const triggerRegistry = new TriggerRegistry()
