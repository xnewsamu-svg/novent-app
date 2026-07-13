import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

const ADMIN_INIT_ERROR = "Firebase Admin SDK no se pudo inicializar. Verifica la variable FIREBASE_ADMIN_KEY en las variables de entorno del servidor."

let adminDbInstance: ReturnType<typeof getFirestore> | null = null
let appInstance: ReturnType<typeof initializeApp> | null = null
let initError: string | null = null

function getKey(): string {
  return process.env.FIREBASE_ADMIN_KEY_B64
    ? Buffer.from(process.env.FIREBASE_ADMIN_KEY_B64, "base64").toString("utf-8")
    : process.env.FIREBASE_ADMIN_KEY || ""
}

function ensureApp(): void {
  if (appInstance) return
  if (initError) throw new Error(initError)

  const apps = getApps()
  if (apps.length > 0) {
    appInstance = apps[0]
    return
  }

  const key = getKey()
  if (!key) {
    initError = `${ADMIN_INIT_ERROR} Motivo: FIREBASE_ADMIN_KEY no está configurada.`
    throw new Error(initError)
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(key)
  } catch {
    initError = `${ADMIN_INIT_ERROR} Motivo: FIREBASE_ADMIN_KEY contiene un JSON inválido.`
    throw new Error(initError)
  }

  if (!parsed.private_key || parsed.private_key === "\n") {
    initError = `${ADMIN_INIT_ERROR} Motivo: private_key inválida o vacía en FIREBASE_ADMIN_KEY.`
    throw new Error(initError)
  }

  try {
    appInstance = initializeApp({
      credential: cert(parsed),
    })
  } catch (err) {
    initError = `${ADMIN_INIT_ERROR} Motivo: ${err instanceof Error ? err.message : String(err)}`
    throw new Error(initError)
  }
}

export function getAdminDb() {
  ensureApp()
  if (!adminDbInstance) {
    adminDbInstance = getFirestore(appInstance!)
  }
  return adminDbInstance
}

export async function getAdminAuth() {
  ensureApp()
  const { getAuth } = await import("firebase-admin/auth")
  return getAuth(appInstance!)
}

export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_target, prop) {
    ensureApp()
    if (!adminDbInstance) {
      adminDbInstance = getFirestore(appInstance!)
    }
    const val = (adminDbInstance as unknown as Record<string, unknown>)[prop as string]
    return typeof val === "function" ? (val as (...args: unknown[]) => unknown).bind(adminDbInstance) : val
  },
})
