import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, handleError } from "@/app/api/_lib/auth"
import { importServicesFromImage } from "@/services/ai/importServicesFromImage"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    await getAuthContext(req)

    const formData = await req.formData()
    const file = formData.get("image")

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió ninguna imagen" },
        { status: 400 },
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato de imagen no válido. Usa JPEG, PNG o WebP" },
        { status: 400 },
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "La imagen es demasiado grande. Máximo 10 MB" },
        { status: 400 },
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString("base64")

    const result = await importServicesFromImage(base64)

    return NextResponse.json(result)
  } catch (error) {
    return handleError(error)
  }
}
