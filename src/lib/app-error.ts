export interface ErrorPayload {
  code: string
  message: string
  retryable: boolean
  details: Record<string, unknown> | null
  timestamp: string
}

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "WORKFLOW_INVALID"
  | "WORKFLOW_NOT_FOUND"
  | "WORKFLOW_PUBLISH_FAILED"
  | "EXECUTION_FAILED"
  | "EXECUTION_NOT_FOUND"
  | "ACTION_FAILED"
  | "ACTION_NOT_REGISTERED"
  | "TRIGGER_NOT_REGISTERED"
  | "CONDITION_EVALUATION_FAILED"
  | "VARIABLE_RESOLUTION_FAILED"
  | "CYCLE_DETECTED"
  | "NODE_LIMIT_EXCEEDED"
  | "DEPTH_LIMIT_EXCEEDED"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "WHATSAPP_ERROR"
  | "WHATSAPP_CONFIG_MISSING"
  | "WEBHOOK_ERROR"
  | "INTERNAL_ERROR"
  | "NOT_IMPLEMENTED"

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly retryable: boolean
  public readonly details: Record<string, unknown> | null
  public readonly timestamp: string

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      retryable?: boolean
      details?: Record<string, unknown> | null
      cause?: unknown
    },
  ) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.retryable = options?.retryable ?? false
    this.details = options?.details ?? null
    this.timestamp = new Date().toISOString()

    if (options?.cause instanceof Error) {
      this.stack = options.cause.stack
    }
  }

  toPayload(): ErrorPayload {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      details: this.details,
      timestamp: this.timestamp,
    }
  }

  toResponse(status?: number): Response {
    return Response.json(this.toPayload(), {
      status: status ?? errorStatusMap[this.code] ?? 500,
    })
  }

  static notFound(entity: string, id?: string): AppError {
    return new AppError("NOT_FOUND", `${entity} no encontrado${id ? `: ${id}` : ""}`)
  }

  static validation(message: string, details?: Record<string, unknown>): AppError {
    return new AppError("VALIDATION_ERROR", message, { details })
  }

  static unauthorized(message = "No autorizado"): AppError {
    return new AppError("UNAUTHORIZED", message)
  }

  static forbidden(message = "Acceso denegado"): AppError {
    return new AppError("FORBIDDEN", message)
  }

  static internal(message = "Error interno del servidor", cause?: unknown): AppError {
    return new AppError("INTERNAL_ERROR", message, { cause })
  }
}

const errorStatusMap: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  WORKFLOW_INVALID: 400,
  RATE_LIMITED: 429,
  TIMEOUT: 504,
  WHATSAPP_CONFIG_MISSING: 503,
  INTERNAL_ERROR: 500,
}

export function handleApiError(error: unknown): Response {
  if (error instanceof AppError) {
    return error.toResponse()
  }

  if (error instanceof Error) {
    const appError = AppError.internal(error.message, error)
    return appError.toResponse(500)
  }

  return AppError.internal("Error desconocido").toResponse(500)
}
