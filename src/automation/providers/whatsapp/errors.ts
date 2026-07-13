export class WhatsAppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown,
  ) {
    super(message)
    this.name = "WhatsAppError"
  }
}

export class WhatsAppApiError extends WhatsAppError {
  constructor(
    message: string,
    public readonly apiCode: number,
    public readonly apiSubcode?: number,
    public readonly fbtraceId?: string,
  ) {
    super(message, `API_${apiCode}`)
    this.name = "WhatsAppApiError"
  }
}

export class WhatsAppAuthError extends WhatsAppError {
  constructor(message = "WhatsApp token inválido o expirado") {
    super(message, "AUTH_ERROR")
    this.name = "WhatsAppAuthError"
  }
}

export class WhatsAppVerificationError extends WhatsAppError {
  constructor(message = "Firma X-Hub-Signature inválida") {
    super(message, "VERIFICATION_ERROR")
    this.name = "WhatsAppVerificationError"
  }
}

export class WhatsAppTemplateError extends WhatsAppError {
  constructor(
    message: string,
    public readonly templateName: string,
  ) {
    super(message, "TEMPLATE_ERROR")
    this.name = "WhatsAppTemplateError"
  }
}

export class WhatsAppRateLimitError extends WhatsAppError {
  constructor(message = "Rate limit excedido para WhatsApp Cloud API") {
    super(message, "RATE_LIMIT")
    this.name = "WhatsAppRateLimitError"
  }
}

export class WhatsAppMediaError extends WhatsAppError {
  constructor(message: string, public readonly mediaId?: string) {
    super(message, "MEDIA_ERROR")
    this.name = "WhatsAppMediaError"
  }
}

export class WhatsAppNetworkError extends WhatsAppError {
  constructor(message = "Error de red al conectar con WhatsApp Cloud API") {
    super(message, "NETWORK_ERROR")
    this.name = "WhatsAppNetworkError"
  }
}

export class WhatsAppTimeoutError extends WhatsAppError {
  constructor(message = "Timeout al conectar con WhatsApp Cloud API") {
    super(message, "TIMEOUT_ERROR")
    this.name = "WhatsAppTimeoutError"
  }
}

export class WhatsAppInvalidPhoneError extends WhatsAppError {
  constructor(phone: string) {
    super(`Número inválido: ${phone}`, "INVALID_PHONE")
    this.name = "WhatsAppInvalidPhoneError"
  }
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof WhatsAppRateLimitError) return true
  if (error instanceof WhatsAppNetworkError) return true
  if (error instanceof WhatsAppTimeoutError) return true

  if (error instanceof WhatsAppApiError) {
    const retryableCodes = [429, 500, 502, 503, 504]
    return retryableCodes.includes(error.apiCode)
  }

  return false
}

export function classifyMetaError(
  apiCode: number,
  message: string,
  subcode?: number,
  fbtraceId?: string,
): WhatsAppError {
  if (apiCode === 401 || apiCode === 403) {
    return new WhatsAppAuthError(message)
  }

  if (apiCode === 429) {
    return new WhatsAppRateLimitError(message)
  }

  if (apiCode === 100 && subcode === 1002001) {
    return new WhatsAppTemplateError(message, "unknown")
  }

  if (subcode === 1002002 || subcode === 1002003) {
    return new WhatsAppInvalidPhoneError("unknown")
  }

  return new WhatsAppApiError(message, apiCode, subcode, fbtraceId)
}

export function classifyNetworkError(error: unknown): WhatsAppError {
  if (error instanceof TypeError && error.message === "fetch failed") {
    return new WhatsAppNetworkError()
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new WhatsAppTimeoutError()
  }

  return new WhatsAppNetworkError(
    error instanceof Error ? error.message : "Error de red desconocido",
  )
}
