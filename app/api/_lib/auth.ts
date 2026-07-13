import { NextRequest } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/src/lib/logger"

export interface AuthContext {
  uid: string
  companyId: string
  email: string | undefined
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number = 401
  ) {
    super(message)
    this.name = "AuthError"
  }
}

interface FirebaseTokenPayload {
  sub: string
  email?: string
  [key: string]: unknown
}

async function verifyFirebaseToken(token: string): Promise<FirebaseTokenPayload> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) throw new AuthError("Firebase API key no configurada", 500)

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    },
  )

  if (!res.ok) {
    throw new AuthError("Token inválido o expirado", 401)
  }

  const data = await res.json()
  const user = data?.users?.[0]
  if (!user) throw new AuthError("Usuario no encontrado en Firebase Auth", 401)

  return {
    sub: user.localId,
    email: user.email,
  }
}

export async function getAuthContext(req: NextRequest): Promise<AuthContext> {
  const token = req.cookies.get("firebase-auth-token")?.value
  if (!token) throw new AuthError("No autorizado", 401)

  let decoded
  try {
    decoded = await verifyFirebaseToken(token)
  } catch {
    throw new AuthError("Token inválido o expirado", 401)
  }

  const userDoc = await adminDb.collection("users").doc(decoded.sub).get()
  if (!userDoc.exists) throw new AuthError("Usuario no encontrado", 403)

  const data = userDoc.data()
  const companyId = data?.companyId as string | undefined
  if (!companyId) throw new AuthError("Usuario sin empresa asignada", 403)

  return {
    uid: decoded.sub,
    companyId,
    email: decoded.email,
  }
}

export function verifyCronSecret(req: NextRequest): void {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    throw new AuthError("CRON_SECRET no configurado en el servidor. Los endpoints cron no pueden operar sin esta variable de entorno.", 500)
  }
  const authHeader = req.headers.get("authorization") ?? ""
  if (authHeader !== `Bearer ${cronSecret}`) {
    throw new AuthError("No autorizado — CRON_SECRET inválido", 401)
  }
}

export function handleError(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  const message = error instanceof Error ? error.message : "Error interno del servidor"
  logger.error("API Error", undefined, error)
  return Response.json({ error: message }, { status: 500 })
}
