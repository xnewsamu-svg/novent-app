import { NextResponse } from "next/server"

export async function GET() {
  try {
    const { getAdminDb } = await import("@/lib/firebase-admin")
    const db = getAdminDb()
    await db.collection("companies").limit(1).get()
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
  }
}
