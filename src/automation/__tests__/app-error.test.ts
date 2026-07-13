import { describe, it, expect } from "vitest"
import { AppError, handleApiError } from "../../lib/app-error"

describe("AppError", () => {
  it("creates an error with code and message", () => {
    const err = new AppError("NOT_FOUND", "Workflow no encontrado")
    expect(err.code).toBe("NOT_FOUND")
    expect(err.message).toBe("Workflow no encontrado")
    expect(err.retryable).toBe(false)
  })

  it("creates retryable error", () => {
    const err = new AppError("WHATSAPP_ERROR", "API rate limited", { retryable: true })
    expect(err.retryable).toBe(true)
  })

  it("includes details", () => {
    const err = AppError.validation("Campo requerido", { field: "name" })
    expect(err.details).toEqual({ field: "name" })
  })

  it("toPayload returns structured object", () => {
    const err = AppError.notFound("Workflow", "wf1")
    const payload = err.toPayload()
    expect(payload.code).toBe("NOT_FOUND")
    expect(payload.message).toContain("Workflow")
    expect(payload.timestamp).toBeDefined()
    expect(payload.retryable).toBe(false)
  })

  it("toResponse returns Response with correct status", () => {
    const err = AppError.unauthorized()
    const res = err.toResponse()
    expect(res.status).toBe(401)
  })

  it("static factory methods", () => {
    expect(AppError.notFound("X").code).toBe("NOT_FOUND")
    expect(AppError.validation("X").code).toBe("VALIDATION_ERROR")
    expect(AppError.unauthorized().code).toBe("UNAUTHORIZED")
    expect(AppError.forbidden().code).toBe("FORBIDDEN")
    expect(AppError.internal().code).toBe("INTERNAL_ERROR")
  })
})

describe("handleApiError", () => {
  it("returns structured response for AppError", async () => {
    const err = AppError.notFound("Workflow")
    const res = handleApiError(err)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.code).toBe("NOT_FOUND")
  })

  it("returns 500 for unknown errors", async () => {
    const res = handleApiError(new Error("algo salió mal"))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.code).toBe("INTERNAL_ERROR")
  })

  it("returns 500 for non-Error values", async () => {
    const res = handleApiError("string error")
    expect(res.status).toBe(500)
  })
})
