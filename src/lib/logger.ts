export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogContext {
  companyId?: string
  userId?: string
  executionId?: string
  workflowId?: string
  [key: string]: unknown
}

const SENSITIVE_KEYS = new Set([
  "token", "tokens", "secret", "secrets", "password", "passwords",
  "key", "keys", "authorization", "cookie", "accessToken", "refreshToken",
  "apiKey", "privateKey", "WHATSAPP_ACCESS_TOKEN", "WHATSAPP_TOKEN",
  "FIREBASE_ADMIN_KEY", "RESEND_API_KEY", "CRON_SECRET",
])

const SENSITIVE_PATTERNS = [
  /(?<=token["']?\s*[:=]\s*["']).{8,}(?=["'])/gi,
  /(?<=secret["']?\s*[:=]\s*["']).{8,}(?=["'])/gi,
  /(?<=password["']?\s*[:=]\s*["']).+?(?=["'])/gi,
  /EAAT\w+/g,
  /re_\w+/g,
]

function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 5) return "[MAX_DEPTH]"
  if (obj === null || obj === undefined) return obj
  if (typeof obj === "string") {
    let sanitized = obj
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, "[REDACTED]")
    }
    return sanitized
  }
  if (typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map((item) => sanitize(item, depth + 1))

  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      cleaned[key] = "[REDACTED]"
    } else if (typeof value === "object" && value !== null) {
      cleaned[key] = sanitize(value, depth + 1)
    } else {
      cleaned[key] = value
    }
  }
  return cleaned
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown,
) {
  const entry: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
  }

  if (context) {
    const { companyId, userId, executionId, workflowId, ...rest } = context
    if (companyId) entry.companyId = companyId
    if (userId) entry.userId = userId
    if (executionId) entry.executionId = executionId
    if (workflowId) entry.workflowId = workflowId
    if (Object.keys(rest).length > 0) entry.context = sanitize(rest)
  }

  if (error) {
    entry.error = formatError(error)
  }

  return entry
}

function formatError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    }
  }
  return { message: String(error) }
}

function shouldLog(level: LogLevel): boolean {
  const levels: LogLevel[] = ["debug", "info", "warn", "error"]
  const configured = (process.env.LOG_LEVEL as LogLevel) ?? "info"
  return levels.indexOf(level) >= levels.indexOf(configured)
}

function write(entry: Record<string, unknown>): void {
  const line = JSON.stringify(entry)
  switch (entry.level) {
    case "error":
      console.error(line)
      break
    case "warn":
      console.warn(line)
      break
    case "debug":
      if (process.env.NODE_ENV !== "production") console.debug(line)
      break
    default:
      console.log(line)
  }
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (!shouldLog("debug")) return
    write(createLogEntry("debug", message, context))
  },

  info(message: string, context?: LogContext): void {
    if (!shouldLog("info")) return
    write(createLogEntry("info", message, context))
  },

  warn(message: string, context?: LogContext, error?: unknown): void {
    if (!shouldLog("warn")) return
    write(createLogEntry("warn", message, context, error))
  },

  error(message: string, context?: LogContext, error?: unknown): void {
    if (!shouldLog("error")) return
    write(createLogEntry("error", message, context, error))
  },
}
