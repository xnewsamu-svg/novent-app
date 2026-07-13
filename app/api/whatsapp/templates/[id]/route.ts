import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { adminDb } from "@/lib/firebase-admin"

function templateDoc(companyId: string, templateId: string) {
  return adminDb.collection("companies").doc(companyId).collection("templates").doc(templateId)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { companyId } = await getAuthContext(req)
    const { id } = await params
    const body = await req.json()

    const variables =
      (body.message as string)?.match(/\{([^}]+)\}/g)?.map((v: string) => v.slice(1, -1)) || []

    await templateDoc(companyId, id).update({
      name: body.name ?? "",
      message: body.message ?? "",
      variables,
      category: body.category ?? "marketing",
      updatedAt: Timestamp.now(),
    })

    return NextResponse.json({ success: true, templateId: id })
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
    await templateDoc(companyId, id).delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
