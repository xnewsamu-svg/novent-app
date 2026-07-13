import { NextResponse } from "next/server"

export async function GET() {
  try {
    const hasB64 = !!process.env.FIREBASE_ADMIN_KEY_B64
    const hasRaw = !!process.env.FIREBASE_ADMIN_KEY
    const b64Len = process.env.FIREBASE_ADMIN_KEY_B64?.length ?? 0
    return NextResponse.json({
      hasB64,
      hasRaw,
      b64Len,
      node: process.version,
      envKeys: Object.keys(process.env).filter(k => k.includes("FIREBASE") || k.includes("NEXT_PUBLIC")).sort(),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
