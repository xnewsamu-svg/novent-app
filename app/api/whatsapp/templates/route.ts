import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { adminDb } from "@/lib/firebase-admin"

function templatesPath(companyId: string) {
  return adminDb.collection("companies").doc(companyId).collection("templates")
}

export async function GET(req: NextRequest) {
  try {
    const { companyId } = await getAuthContext(req)
    const snap = await templatesPath(companyId).orderBy("createdAt", "desc").get()
    const templates = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ templates })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await getAuthContext(req)
    const body = await req.json()

    const variables =
      (body.message as string)?.match(/\{([^}]+)\}/g)?.map((v: string) => v.slice(1, -1)) || []

    const template = {
      name: body.name ?? "",
      message: body.message ?? "",
      variables,
      category: body.category ?? "marketing",
      status: "active",
      companyId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }

    const ref = await templatesPath(companyId).add(template)

    return NextResponse.json({ templateId: ref.id, companyId })
  } catch (error) {
    return handleError(error)
  }
}
