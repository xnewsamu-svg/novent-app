import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const AUTH_COOKIE = "firebase-auth-token"

const publicRoutes = [
  "/login",
  "/signup",
  "/",
  "/api/webhooks/whatsapp",
  "/api/cron/process-jobs",
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  )
  if (isPublic) return NextResponse.next()

  const token = request.cookies.get(AUTH_COOKIE)?.value
  if (!token) {
    const url = new URL("/login", request.url)
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$).*)",
  ],
}
