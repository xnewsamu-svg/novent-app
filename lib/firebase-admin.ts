import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

const ADMIN_INIT_ERROR = "Firebase Admin SDK no se pudo inicializar. Verifica la variable FIREBASE_ADMIN_KEY en las variables de entorno del servidor."

let adminDbInstance: ReturnType<typeof getFirestore> | null = null
let adminAuthInstance: ReturnType<typeof getAuth> | null = null
let initError: string | null = null

function ensureAdmin(): void {
  if (adminDbInstance && adminAuthInstance) return
  if (initError) throw new Error(initError)

  const apps = getApps()
  if (apps.length > 0) {
    const app = apps[0]
    adminDbInstance = getFirestore(app)
    adminAuthInstance = getAuth(app)
    return
  }

  const key = process.env.FIREBASE_ADMIN_KEY
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
    const app = initializeApp({
      credential: cert(parsed),
    })
    adminDbInstance = getFirestore(app)
    adminAuthInstance = getAuth(app)
  } catch (err) {
    initError = `${ADMIN_INIT_ERROR} Motivo: ${err instanceof Error ? err.message : String(err)}`
    throw new Error(initError)
  }
}

export function getAdminDb() {
  ensureAdmin()
  return adminDbInstance!
}

export function getAdminAuth() {
  ensureAdmin()
  return adminAuthInstance!
}

export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_target, prop) {
    ensureAdmin()
    const val = (adminDbInstance as unknown as Record<string, unknown>)[prop as string]
    return typeof val === "function" ? (val as (...args: unknown[]) => unknown).bind(adminDbInstance) : val
  },
})

export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_target, prop) {
    ensureAdmin()
    const val = (adminAuthInstance as unknown as Record<string, unknown>)[prop as string]
    return typeof val === "function" ? (val as (...args: unknown[]) => unknown).bind(adminAuthInstance) : val
  },
})
