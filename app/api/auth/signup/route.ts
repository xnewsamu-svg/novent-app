import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { handleError } from "@/app/api/_lib/auth"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { uid, companyName, businessType, email } = body as {
      uid: string
      companyName: string
      businessType: string
      email: string
    }

    if (!uid || !companyName || !businessType || !email) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: uid, companyName, businessType, email" },
        { status: 400 },
      )
    }

    // Verify the auth user exists
    try {
      await adminAuth.getUser(uid)
    } catch {
      return NextResponse.json(
        { error: "Usuario de autenticación no encontrado" },
        { status: 400 },
      )
    }

    const companyRef = adminDb.collection("companies").doc()
    const companyId = companyRef.id

    // Create company document
    await companyRef.set({
      name: companyName,
      businessType,
      owner: uid,
      createdAt: new Date(),
    })

    // Create global user document
    await adminDb.collection("users").doc(uid).set({
      email,
      companyId,
      role: "admin",
      createdAt: new Date(),
    })

    // Create user in company subcollection
    await companyRef.collection("users").doc(uid).set({
      email,
      role: "admin",
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true, companyId })
  } catch (error) {
    return handleError(error)
  }
}
