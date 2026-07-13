import { NextRequest, NextResponse } from "next/server"

import { getAdminDb } from "@/lib/firebase-admin"

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20
const rateMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown"
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { available: false, error: "Demasiadas solicitudes. Intenta de nuevo en un minuto." },
      { status: 429 },
    )
  }

  const name = req.nextUrl.searchParams.get("name")

  if (!name || !name.trim()) {
    return NextResponse.json(
      { available: false, error: "Name is required" },
      { status: 400 },
    )
  }

  try {
    const db = getAdminDb()
    const snap = await db
      .collection("companies")
      .where("name", "==", name.trim())
      .get()

    return NextResponse.json({ available: snap.empty })
  } catch (error) {
    console.error("[Company Check]", error)
    return NextResponse.json(
      { available: false, error: "Internal error" },
      { status: 500 },
    )
  }
}
