export interface WhatsAppCredentials {
  token: string
  phoneNumberId: string
  apiVersion: string
}

import { adminDb } from "@/lib/firebase-admin"

export async function resolveWhatsAppConfig(companyId: string): Promise<WhatsAppCredentials> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (companyId) {
    try {
      const companySnap = await adminDb.collection("companies").doc(companyId).get()
      if (companySnap.exists) {
        const settings = companySnap.data()?.settings as Record<string, string> | undefined
        phoneNumberId = settings?.whatsappPhoneNumberId ?? phoneNumberId
      }
    } catch {
      // fallback to env vars on error
    }
  }

  if (!token || !phoneNumberId) {
    throw new Error(
      `WhatsApp no configurado para la empresa ${companyId}. ` +
      "Faltan WHATSAPP_ACCESS_TOKEN y/o WHATSAPP_PHONE_NUMBER_ID."
    )
  }

  return {
    token,
    phoneNumberId,
    apiVersion: process.env.WHATSAPP_API_VERSION ?? "v21.0",
  }
}