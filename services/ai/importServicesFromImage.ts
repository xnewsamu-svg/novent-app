import { callOpenAI } from "@/lib/ai/openai"
import type { ServiceImportItem } from "@/types/serviceImport"

const SYSTEM_PROMPT = `Eres un extractor de servicios comerciales.

Analiza la imagen.
Extrae todos los servicios visibles.
Extrae el precio de cada uno.

Ignora:
- logos
- redes sociales
- direcciones
- teléfonos
- promociones
- QR

Devuelve únicamente un JSON válido.

Formato:
[
  {
    "name": "",
    "price": 0
  }
]

Si algún precio aparece como:
- 20.000
- 20,000
- $20.000
- $20,000

Convierte siempre a:
20000

No inventes servicios.
No inventes precios.
No devuelvas markdown.
No devuelvas explicaciones.
Solo JSON.`

function parsePrice(raw: number): number {
  if (typeof raw !== "number" || isNaN(raw) || raw <= 0) return 0
  return Math.round(raw)
}

function sanitizeName(raw: string): string {
  return raw
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
}

export interface ImportResult {
  services: ServiceImportItem[]
  raw: string
}

export async function importServicesFromImage(
  base64Image: string,
): Promise<ImportResult> {
  const content = await callOpenAI(SYSTEM_PROMPT, base64Image, 2048)

  const cleaned = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error("La respuesta de IA no es un JSON válido")
  }

  if (!Array.isArray(parsed)) {
    throw new Error("La respuesta de IA no contiene un arreglo de servicios")
  }

  const seen = new Set<string>()
  const services: ServiceImportItem[] = []

  for (const item of parsed) {
    if (!item || typeof item !== "object") continue

    const name = sanitizeName(String(item.name ?? ""))
    const price = parsePrice(Number(item.price))

    if (!name || price <= 0) continue

    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    services.push({ name, price })
  }

  if (services.length === 0) {
    throw new Error("No se detectaron servicios en la imagen")
  }

  return { services, raw: cleaned }
}
