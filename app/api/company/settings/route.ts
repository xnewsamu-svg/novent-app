import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { adminDb } from "@/lib/firebase-admin"

export async function PUT(req: NextRequest) {
  try {
    const { companyId } = await getAuthContext(req)
    const body = await req.json()
    const { businessType } = body as { businessType?: string }

    if (businessType) {
      await adminDb.collection("companies").doc(companyId).update({
        businessType,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
