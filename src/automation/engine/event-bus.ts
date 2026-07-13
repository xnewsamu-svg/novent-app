import type { AutomationEvent } from "../types/events"
import { logger } from "@/src/lib/logger"

type EventHandler = (event: AutomationEvent) => void | Promise<void>

export class AutomationEventBus {
  private subscribers = new Map<string, Set<EventHandler>>()
  private wildcardSubscribers = new Set<EventHandler>()

  subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set())
    }
    this.subscribers.get(eventType)!.add(handler)

    return () => {
      this.subscribers.get(eventType)?.delete(handler)
    }
  }

  subscribeAll(handler: EventHandler): () => void {
    this.wildcardSubscribers.add(handler)
    return () => {
      this.wildcardSubscribers.delete(handler)
    }
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    this.subscribers.get(eventType)?.delete(handler)
  }

  async emit(event: AutomationEvent): Promise<void> {
    const handlers = this.subscribers.get(event.type)
    const promises: Promise<void>[] = []

    if (handlers) {
      for (const handler of handlers) {
        const result = handler(event)
        if (result instanceof Promise) promises.push(result)
      }
    }

    for (const handler of this.wildcardSubscribers) {
      const result = handler(event)
      if (result instanceof Promise) promises.push(result)
    }

    const results = await Promise.allSettled(promises)
    for (const result of results) {
      if (result.status === "rejected") {
        logger.error("EventBus: subscriber error", { eventType: event.type }, result.reason)
      }
    }
  }

  clear(): void {
    this.subscribers.clear()
    this.wildcardSubscribers.clear()
  }

  subscriberCount(): number {
    let count = this.wildcardSubscribers.size
    for (const handlers of this.subscribers.values()) {
      count += handlers.size
    }
    return count
  }
}

export const automationEventBus = new AutomationEventBus()
