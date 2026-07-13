import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { adminDb } from "@/lib/firebase-admin"

function campaignsPath(companyId: string) {
  return adminDb.collection("companies").doc(companyId).collection("campaigns")
}

export async function GET(req: NextRequest) {
  try {
    const { companyId } = await getAuthContext(req)
    const snap = await campaignsPath(companyId).orderBy("createdAt", "desc").get()
    const campaigns = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ campaigns })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await getAuthContext(req)
    const body = await req.json()

    const campaign = {
      name: body.name ?? "",
      message: body.message ?? "",
      templateId: body.templateId ?? null,
      audience: body.audience ?? "all",
      status: body.schedule ? "scheduled" : "draft",
      scheduledFor: body.schedule && body.scheduledFor
        ? Timestamp.fromDate(new Date(body.scheduledFor))
        : null,
      total: 0,
      sent: 0,
      companyId,
      createdAt: Timestamp.now(),
    }

    const ref = await campaignsPath(companyId).add(campaign)

    return NextResponse.json({ campaignId: ref.id, companyId })
  } catch (error) {
    return handleError(error)
  }
}
