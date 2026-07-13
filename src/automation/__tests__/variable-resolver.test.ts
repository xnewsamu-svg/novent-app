import { describe, it, expect } from "vitest"
import { resolvePath, resolveTemplate, resolveValue } from "../engine/variable-resolver"
import type { ExecutionContext } from "../types/execution"

const context: ExecutionContext = {
  eventPayload: { customerName: "Juan", phone: "521234567890", total: 150 },
  variables: { greeting: "Hola" },
  visitedNodes: ["n1"],
  delayedUntil: null,
}

describe("VariableResolver", () => {
  describe("resolvePath", () => {
    it("resolves simple nested path", () => {
      expect(resolvePath(context.eventPayload, "customerName")).toBe("Juan")
    })

    it("returns undefined for non-existent path", () => {
      expect(resolvePath(context.eventPayload, "nonexistent")).toBeUndefined()
    })

    it("returns undefined for empty path", () => {
      expect(resolvePath(context.eventPayload, "")).toBeUndefined()
    })

    it("returns undefined for null object", () => {
      expect(resolvePath(null as any, "customerName")).toBeUndefined()
    })
  })

  describe("resolveTemplate", () => {
    it("replaces {{dot.notation}} with resolved value", () => {
      const result = resolveTemplate("Hola {{event.customerName}}", context)
      expect(result).toBe("Hola Juan")
    })

    it("handles multiple variables in template", () => {
      const result = resolveTemplate(
        "{{event.customerName}} tiene {{event.total}}",
        context,
      )
      expect(result).toBe("Juan tiene 150")
    })

    it("leaves unresolvable variables as empty", () => {
      const result = resolveTemplate("Hola {{event.nonexistent}}", context)
      expect(result).toBe("Hola ")
    })

    it("returns empty string for null input", () => {
      expect(resolveTemplate(null, context)).toBe("")
    })

    it("returns string for non-string input", () => {
      expect(resolveTemplate(123, context)).toBe("123")
    })
  })

  describe("resolveValue", () => {
    it("resolves template strings in config", () => {
      const config = { to: "{{event.phone}}", body: "Hola {{event.customerName}}" }
      const resolved = resolveValue(config, context) as Record<string, unknown>
      expect(resolved.to).toBe("521234567890")
      expect(resolved.body).toBe("Hola Juan")
    })

    it("passes through non-string values", () => {
      const config = { amount: 150, enabled: true }
      const resolved = resolveValue(config, context) as Record<string, unknown>
      expect(resolved.amount).toBe(150)
      expect(resolved.enabled).toBe(true)
    })

    it("resolves nested objects", () => {
      const config = { nested: { name: "{{event.customerName}}" } }
      const resolved = resolveValue(config, context) as Record<string, unknown>
      expect((resolved.nested as Record<string, unknown>).name).toBe("Juan")
    })
  })
})
