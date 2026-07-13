import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { logger } from "../../lib/logger"

describe("Logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "debug").mockImplementation(() => {})
    process.env.LOG_LEVEL = "debug"
    vi.stubEnv("NODE_ENV", "test")
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.LOG_LEVEL
  })

  it("logs info messages", () => {
    logger.info("Workflow started", { workflowId: "wf1" })
    expect(console.log).toHaveBeenCalled()
    const call = (console.log as any).mock.calls[0][0]
    const parsed = JSON.parse(call)
    expect(parsed.level).toBe("info")
    expect(parsed.message).toBe("Workflow started")
    expect(parsed.workflowId).toBe("wf1")
    expect(parsed.timestamp).toBeDefined()
  })

  it("logs error messages with error object", () => {
    logger.error("Execution failed", { executionId: "ex1" }, new Error("timeout"))
    expect(console.error).toHaveBeenCalled()
    const call = (console.error as any).mock.calls[0][0]
    const parsed = JSON.parse(call)
    expect(parsed.level).toBe("error")
    expect(parsed.executionId).toBe("ex1")
    expect(parsed.error.name).toBe("Error")
    expect(parsed.error.message).toBe("timeout")
  })

  it("logs warn messages", () => {
    logger.warn("Rate limit approaching", { companyId: "comp1" })
    expect(console.warn).toHaveBeenCalled()
  })

  it("logs debug messages only when LOG_LEVEL=debug", () => {
    logger.debug("Debug info", {})
    expect(console.debug).toHaveBeenCalled()
  })

  it("respects LOG_LEVEL filtering", () => {
    process.env.LOG_LEVEL = "error"
    logger.info("This should not appear", {})
    expect(console.log).not.toHaveBeenCalled()
  })

  it("includes companyId, userId, executionId, workflowId in context", () => {
    logger.info("Test", { companyId: "c1", userId: "u1", executionId: "e1", workflowId: "w1" })
    const call = (console.log as any).mock.calls[0][0]
    const parsed = JSON.parse(call)
    expect(parsed.companyId).toBe("c1")
    expect(parsed.userId).toBe("u1")
    expect(parsed.executionId).toBe("e1")
    expect(parsed.workflowId).toBe("w1")
  })

  it("does not log debug in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    logger.debug("Debug info", {})
    expect(console.debug).not.toHaveBeenCalled()
  })
})
