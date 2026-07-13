const PII_FIELDS = new Set([
  "phone",
  "email",
  "to",
  "waId",
  "whatsappId",
  "name",
  "firstName",
  "lastName",
  "customerName",
  "customerEmail",
  "customerPhone",
  "address",
  "documentId",
  "body",
])

export function sanitizePII(data: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!data) return null
  if (typeof data !== "object") return data

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (PII_FIELDS.has(key)) {
      result[key] = "[REDACTED]"
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizePII(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item !== null && typeof item === "object"
          ? sanitizePII(item as Record<string, unknown>)
          : item,
      )
    } else {
      result[key] = value
    }
  }

  return result
}
