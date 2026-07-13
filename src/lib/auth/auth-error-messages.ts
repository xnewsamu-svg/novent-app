export interface AuthErrorMessage {
  title: string
  message: string
}

const ERROR_MAP: Record<string, AuthErrorMessage> = {
  // ── Signup ─────────────────────────────────────────
  "auth/email-already-in-use": {
    title: "Correo ya registrado",
    message:
      "Ya existe una cuenta con este correo electrónico.",
  },
  "auth/invalid-email": {
    title: "Correo electrónico inválido",
    message: "El correo ingresado no tiene un formato válido.",
  },
  "auth/network-request-failed": {
    title: "Sin conexión",
    message:
      "No pudimos conectarnos. Revisa tu conexión a internet e inténtalo nuevamente.",
  },

  // ── Login ──────────────────────────────────────────
  "auth/invalid-credential": {
    title: "Credenciales inválidas",
    message: "Correo o contraseña incorrectos.",
  },
  "auth/user-disabled": {
    title: "Cuenta deshabilitada",
    message: "Esta cuenta fue deshabilitada.",
  },
  "auth/too-many-requests": {
    title: "Demasiados intentos",
    message:
      "Se detectaron muchos intentos de inicio de sesión. Espera unos minutos antes de volver a intentarlo.",
  },

  // ── Password recovery ──────────────────────────────
  "auth/user-not-found": {
    title: "Usuario no encontrado",
    message:
      "No encontramos una cuenta asociada a ese correo.",
  },

  // ── Custom app errors ──────────────────────────────
  "company/name-taken": {
    title: "Nombre de empresa no disponible",
    message:
      "Ya existe una empresa registrada con ese nombre. Elige otro nombre.",
  },

  // ── Fallback ───────────────────────────────────────
  unknown: {
    title: "Ocurrió un error",
    message:
      "No pudimos completar la operación. Inténtalo nuevamente en unos minutos.",
  },
}

function parseWeakPasswordMessage(firebaseMessage: string): string {
  const match = firebaseMessage.match(/(\d+)\s*(?:character|caracter)/i)
  const minLength = match ? Math.max(parseInt(match[1], 10), 6) : 8

  return [
    "La contraseña debe tener al menos:",
    `• ${minLength} caracteres`,
    "• Una letra mayúscula",
    "• Una letra minúscula",
    "• Un número",
  ].join("\n")
}

/**
 * Centralized Firebase auth error translator.
 *
 * Usage:
 *   const { title, message } = translateAuthError(error)
 *   toast.error(title, { description: message })
 */
export function translateAuthError(error: unknown): AuthErrorMessage {
  if (!error || typeof error !== "object") {
    return ERROR_MAP.unknown
  }

  const err = error as Record<string, unknown>

  // Handle Firebase auth errors
  if (typeof err.code === "string") {
    // auth/weak-password — parse dynamic requirements if possible
    if (
      err.code === "auth/weak-password" &&
      typeof err.message === "string"
    ) {
      return {
        title: "Contraseña débil",
        message: parseWeakPasswordMessage(err.message),
      }
    }

    const mapped = ERROR_MAP[err.code]
    if (mapped) return mapped
  }

  // Handle custom app errors (company/name-taken, etc.)
  if (typeof err.customCode === "string") {
    const mapped = ERROR_MAP[err.customCode]
    if (mapped) return mapped
  }

  return ERROR_MAP.unknown
}
