import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { adminDb } from "@/lib/firebase-admin"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { companyId } = await getAuthContext(req)
    const { id } = await params
    const body = await req.json()

    const ref = adminDb
      .collection("companies")
      .doc(companyId)
      .collection("citas")
      .doc(id)

    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) clean[k] = v
    }
    delete clean.id

    await ref.update(clean)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { companyId } = await getAuthContext(req)
    const { id } = await params

    await adminDb
      .collection("companies")
      .doc(companyId)
      .collection("citas")
      .doc(id)
      .delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
