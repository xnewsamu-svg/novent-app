import type { ExecutionContext } from "../types/execution"

const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g

export function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined

  const parts = path.split(".")

  return parts.reduce((acc: unknown, key: string) => {
    if (acc === null || acc === undefined) return undefined
    if (typeof acc !== "object") return undefined
    return (acc as Record<string, unknown>)[key]
  }, obj as unknown)
}

export function resolveTemplate(
  template: unknown,
  context: ExecutionContext,
): string {
  if (template === null || template === undefined) return ""
  if (typeof template !== "string") return String(template)

  const merged: Record<string, unknown> = {
    event: context.eventPayload,
    variables: context.variables,
  }

  for (const [key, value] of Object.entries(context.variables)) {
    merged[key] = value
  }

  return template.replace(VARIABLE_PATTERN, (_match, variablePath: string) => {
    const trimmed = variablePath.trim()
    const value = resolvePath(merged, trimmed)
    if (value === null || value === undefined) return ""
    if (typeof value === "object") return JSON.stringify(value)
    return String(value)
  })
}

export function resolveValue(
  raw: unknown,
  context: ExecutionContext,
): unknown {
  if (typeof raw === "string") {
    if (raw.startsWith("{{") && raw.endsWith("}}") && !raw.includes("{{", 2)) {
      const path = raw.slice(2, -2).trim()
      const merged: Record<string, unknown> = {
        event: context.eventPayload,
        variables: context.variables,
      }
      return resolvePath(merged, path)
    }
    if (raw.includes("{{")) {
      return resolveTemplate(raw, context)
    }
    return raw
  }

  if (Array.isArray(raw)) {
    return raw.map((item) => resolveValue(item, context))
  }

  if (raw && typeof raw === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      result[key] = resolveValue(value, context)
    }
    return result
  }

  return raw
}
