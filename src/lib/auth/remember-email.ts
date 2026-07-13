const STORAGE_KEY = "novent-remembered-email"

export const rememberEmail = {
  save(email: string) {
    try {
      localStorage.setItem(STORAGE_KEY, email.trim())
    } catch {
      /* localStorage may be unavailable */
    }
  },

  load(): string {
    try {
      return localStorage.getItem(STORAGE_KEY) || ""
    } catch {
      return ""
    }
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* localStorage may be unavailable */
    }
  },
}
