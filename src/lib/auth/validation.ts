export interface PasswordRequirement {
  key: string
  label: string
  validate: (password: string) => boolean
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { key: "minLength", label: "Al menos 8 caracteres", validate: (p) => p.length >= 8 },
  { key: "lowercase", label: "Una letra minúscula", validate: (p) => /[a-z]/.test(p) },
  { key: "uppercase", label: "Una letra mayúscula", validate: (p) => /[A-Z]/.test(p) },
  { key: "number", label: "Un número", validate: (p) => /\d/.test(p) },
  { key: "special", label: "Un carácter especial", validate: (p) => /[^a-zA-Z0-9\s]/.test(p) },
]

export interface RequirementStatus {
  key: string
  label: string
  valid: boolean
}

export function getPasswordRequirements(password: string): RequirementStatus[] {
  return PASSWORD_REQUIREMENTS.map((req) => ({
    key: req.key,
    label: req.label,
    valid: req.validate(password),
  }))
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((req) => req.validate(password))
}

export function validateEmail(email: string): string | null {
  if (!email) return null
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return "El correo no tiene un formato válido."
  return null
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return null
  if (password !== confirm) return "Las contraseñas no coinciden."
  return null
}
