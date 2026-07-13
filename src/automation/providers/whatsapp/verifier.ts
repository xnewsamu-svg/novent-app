import { WhatsAppVerificationError } from "./errors"
import { logger } from "@/src/lib/logger"

export interface WebhookVerificationParams {
  mode: string
  token: string
  challenge: string
}

export function verifyWebhookToken(
  params: WebhookVerificationParams,
  expectedToken: string,
): string | null {
  if (params.mode === "subscribe" && params.token === expectedToken) {
    return params.challenge
  }
  return null
}

export async function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!secret) {
    logger.warn("WhatsApp webhook secret not configured — signature verification disabled")
    return true
  }

  if (!signature) {
    throw new WhatsAppVerificationError("Missing X-Hub-Signature-256 header")
  }

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody))
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  return signature === `sha256=${expected}`
}

export function parseHubSignature(signatureHeader: string | null): string | null {
  if (!signatureHeader) return null
  const parts = signatureHeader.split("=")
  return parts.length === 2 ? parts[1] : null
}
