import { describe, it, expect } from "vitest"
import { sanitizePII } from "../engine/pii-sanitizer"

describe("sanitizePII", () => {
  it("returns null for null input", () => {
    expect(sanitizePII(null)).toBeNull()
  })

  it("redacts top-level PII fields", () => {
    const input = { phone: "521234567890", email: "test@test.com", name: "Juan" }
    const result = sanitizePII(input)
    expect(result).toEqual({
      phone: "[REDACTED]",
      email: "[REDACTED]",
      name: "[REDACTED]",
    })
  })

  it("redacts nested PII fields", () => {
    const input = {
      to: "521234567890",
      messageType: "text",
      customer: { name: "Maria", email: "maria@test.com" },
    }
    const result = sanitizePII(input)
    expect(result).toEqual({
      to: "[REDACTED]",
      messageType: "text",
      customer: { name: "[REDACTED]", email: "[REDACTED]" },
    })
  })

  it("redacts body field", () => {
    const input = { body: "Hola Juan, tu pedido está listo" }
    const result = sanitizePII(input)
    expect(result).toEqual({ body: "[REDACTED]" })
  })

  it("preserves non-PII fields", () => {
    const input = { messageType: "text", status: "sent", retryCount: 2 }
    const result = sanitizePII(input)
    expect(result).toEqual(input)
  })

  it("handles arrays with nested objects", () => {
    const input = {
      items: [
        { name: "Producto A", price: 100 },
        { name: "Producto B", price: 200 },
      ],
    }
    const result = sanitizePII(input)
    expect(result).toEqual({
      items: [
        { name: "[REDACTED]", price: 100 },
        { name: "[REDACTED]", price: 200 },
      ],
    })
  })

  it("handles mixed fields correctly", () => {
    const input = {
      customerId: "abc123",
      name: "Juan Pérez",
      phone: "521234567890",
      total: 1500,
      items: [{ product: "Zapatos", quantity: 2 }],
    }
    const result = sanitizePII(input)
    expect(result).toEqual({
      customerId: "abc123",
      name: "[REDACTED]",
      phone: "[REDACTED]",
      total: 1500,
      items: [{ product: "Zapatos", quantity: 2 }],
    })
  })

  it("does not mutate the original object", () => {
    const input = { phone: "521234567890" }
    const original = { ...input }
    sanitizePII(input)
    expect(input).toEqual(original)
  })
})
