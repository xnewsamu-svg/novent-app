import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { adminDb } from "@/lib/firebase-admin"

export async function PUT(req: NextRequest) {
  try {
    const { uid } = await getAuthContext(req)
    const body = await req.json()
    const { nombre } = body as { nombre: string }

    if (!nombre?.trim()) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
    }

    await adminDb.collection("users").doc(uid).update({ nombre: nombre.trim() })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
