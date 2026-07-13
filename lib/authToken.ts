import { getIdToken, onIdTokenChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"

export const AUTH_COOKIE = "firebase-auth-token"
const TOKEN_MAX_AGE = 3600 // 1 hour (matches Firebase ID token expiry)

export const saveSession = async () => {
  const user = auth.currentUser
  if (!user) return

  const token = await getIdToken(user)

  document.cookie =
    `${AUTH_COOKIE}=${token}; path=/; max-age=${TOKEN_MAX_AGE}; Secure; SameSite=Lax`
}

export const clearSession = () => {
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`
}

/**
 * Listens for token refresh events and keeps the cookie in sync.
 * Call this once at app root. Returns unsubcribe function.
 */
export const startTokenRefresh = () => {
  return onIdTokenChanged(auth, async (user) => {
    if (user) {
      const token = await getIdToken(user)
      document.cookie =
        `${AUTH_COOKIE}=${token}; path=/; max-age=${TOKEN_MAX_AGE}; Secure; SameSite=Lax`
    } else {
      clearSession()
    }
  })
}