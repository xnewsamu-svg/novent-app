import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { adminDb } from "@/lib/firebase-admin"

function campaignDoc(companyId: string, campaignId: string) {
  return adminDb.collection("companies").doc(companyId).collection("campaigns").doc(campaignId)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { companyId } = await getAuthContext(req)
    const { id } = await params
    await campaignDoc(companyId, id).delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
