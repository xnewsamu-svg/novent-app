import { describe, it, expect, vi } from "vitest"
import { WhatsAppClient } from "../providers/whatsapp/client"
import { createSender } from "../providers/whatsapp/sender"
import {
  WhatsAppError,
  WhatsAppApiError,
  WhatsAppAuthError,
  WhatsAppRateLimitError,
  WhatsAppNetworkError,
  WhatsAppTimeoutError,
  WhatsAppInvalidPhoneError,
  WhatsAppTemplateError,
  isRetryableError,
  classifyMetaError,
  classifyNetworkError,
} from "../providers/whatsapp/errors"
import { verifySignature } from "../providers/whatsapp/verifier"

describe("WhatsApp Errors", () => {
  it("WhatsAppError has correct name", () => {
    const err = new WhatsAppError("test", "CODE")
    expect(err.name).toBe("WhatsAppError")
    expect(err.code).toBe("CODE")
  })

  it("WhatsAppApiError has correct name and properties", () => {
    const err = new WhatsAppApiError("API error", 400, 1001)
    expect(err.name).toBe("WhatsAppApiError")
    expect(err.apiCode).toBe(400)
    expect(err.apiSubcode).toBe(1001)
  })

  it("WhatsAppAuthError is created with default message", () => {
    const err = new WhatsAppAuthError()
    expect(err.message).toContain("token inválido")
    expect(err.code).toBe("AUTH_ERROR")
  })

  it("WhatsAppRateLimitError is created with default message", () => {
    const err = new WhatsAppRateLimitError()
    expect(err.message).toContain("Rate limit")
    expect(err.code).toBe("RATE_LIMIT")
  })

  it("WhatsAppNetworkError is created with default message", () => {
    const err = new WhatsAppNetworkError()
    expect(err.message).toContain("Error de red")
    expect(err.code).toBe("NETWORK_ERROR")
  })

  it("WhatsAppTimeoutError is created with default message", () => {
    const err = new WhatsAppTimeoutError()
    expect(err.message).toContain("Timeout")
    expect(err.code).toBe("TIMEOUT_ERROR")
  })

  it("WhatsAppInvalidPhoneError includes phone number in message", () => {
    const err = new WhatsAppInvalidPhoneError("521234567890")
    expect(err.message).toContain("521234567890")
    expect(err.code).toBe("INVALID_PHONE")
  })

  it("WhatsAppTemplateError includes template name", () => {
    const err = new WhatsAppTemplateError("Template rejected", "welcome")
    expect(err.templateName).toBe("welcome")
    expect(err.code).toBe("TEMPLATE_ERROR")
  })
})

describe("isRetryableError", () => {
  it("returns true for rate limit errors", () => {
    expect(isRetryableError(new WhatsAppRateLimitError())).toBe(true)
  })

  it("returns true for network errors", () => {
    expect(isRetryableError(new WhatsAppNetworkError())).toBe(true)
  })

  it("returns true for timeout errors", () => {
    expect(isRetryableError(new WhatsAppTimeoutError())).toBe(true)
  })

  it("returns true for API 429", () => {
    expect(isRetryableError(new WhatsAppApiError("rate", 429))).toBe(true)
  })

  it("returns true for API 5xx", () => {
    expect(isRetryableError(new WhatsAppApiError("server", 500))).toBe(true)
    expect(isRetryableError(new WhatsAppApiError("server", 502))).toBe(true)
    expect(isRetryableError(new WhatsAppApiError("server", 503))).toBe(true)
    expect(isRetryableError(new WhatsAppApiError("server", 504))).toBe(true)
  })

  it("returns false for non-retryable API errors", () => {
    expect(isRetryableError(new WhatsAppApiError("bad", 400))).toBe(false)
    expect(isRetryableError(new WhatsAppApiError("auth", 401))).toBe(false)
    expect(isRetryableError(new WhatsAppApiError("forbid", 403))).toBe(false)
    expect(isRetryableError(new WhatsAppApiError("not found", 404))).toBe(false)
  })

  it("returns false for unknown errors", () => {
    expect(isRetryableError(new Error("generic"))).toBe(false)
  })

  it("returns false for non-error values", () => {
    expect(isRetryableError("string")).toBe(false)
  })
})

describe("classifyMetaError", () => {
  it("classifies 401 as auth error", () => {
    const err = classifyMetaError(401, "Unauthorized")
    expect(err).toBeInstanceOf(WhatsAppAuthError)
  })

  it("classifies 403 as auth error", () => {
    const err = classifyMetaError(403, "Forbidden")
    expect(err).toBeInstanceOf(WhatsAppAuthError)
  })

  it("classifies 429 as rate limit", () => {
    const err = classifyMetaError(429, "Too many")
    expect(err).toBeInstanceOf(WhatsAppRateLimitError)
  })

  it("classifies code 100 subcode 1002001 as template error", () => {
    const err = classifyMetaError(100, "template error", 1002001)
    expect(err).toBeInstanceOf(WhatsAppTemplateError)
  })

  it("classifies subcode 1002002 as invalid phone", () => {
    const err = classifyMetaError(100, "invalid", 1002002)
    expect(err).toBeInstanceOf(WhatsAppInvalidPhoneError)
  })

  it("classifies subcode 1002003 as invalid phone", () => {
    const err = classifyMetaError(100, "invalid", 1002003)
    expect(err).toBeInstanceOf(WhatsAppInvalidPhoneError)
  })

  it("defaults to WhatsAppApiError", () => {
    const err = classifyMetaError(400, "Bad request")
    expect(err).toBeInstanceOf(WhatsAppApiError)
    expect(err.code).toBe("API_400")
  })
})

describe("classifyNetworkError", () => {
  it("classifies fetch failed as network error", () => {
    const err = classifyNetworkError(new TypeError("fetch failed"))
    expect(err).toBeInstanceOf(WhatsAppNetworkError)
  })

  it("classifies AbortError as timeout", () => {
    const err = classifyNetworkError(new DOMException("aborted", "AbortError"))
    expect(err).toBeInstanceOf(WhatsAppTimeoutError)
  })
})

describe("WhatsApp Verifier", () => {
  it("verifySignature returns true when no secret configured", async () => {
    const result = await verifySignature("{}", "any-signature", "")
    expect(result).toBe(true)
  })

  it("verifySignature returns false for invalid signature", async () => {
    process.env.WHATSAPP_WEBHOOK_SECRET = "test-secret"
    const result = await verifySignature("sha256=invalid", '{"test":true}', "test-secret")
    expect(result).toBe(false)
    delete process.env.WHATSAPP_WEBHOOK_SECRET
  })
})

describe("WhatsApp Sender", () => {
  it("sendText returns error on network failure", async () => {
    const client = new WhatsAppClient({
      phoneNumberId: "123",
      token: "tok",
    })
    vi.spyOn(client, "sendText").mockRejectedValue(new WhatsAppNetworkError())
    const sender = createSender(client)
    const result = await sender.sendText({ to: "521234567890", body: "test" })
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })
})
