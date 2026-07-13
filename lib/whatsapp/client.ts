import { adminDb } from '@/lib/firebase-admin'

interface WhatsAppComponent {
  type: string
  parameters: { type: string; text: string }[]
}

export interface WhatsAppMessage {
  to: string
  type: 'template' | 'text' | 'interactive'
  template?: { name: string; language: { code: string }; components?: WhatsAppComponent[] }
  text?: { body: string; preview_url?: boolean }
  interactive?: Record<string, unknown>
}

export interface WhatsAppResponse {
  messaging_product: 'whatsapp'
  contacts: Array<{ input: string; wa_id: string }>
  messages: Array<{ id: string }>
}

export class WhatsAppClient {
  private phoneNumberId: string
  private accessToken: string
  private apiVersion = 'v21.0'

  constructor(phoneNumberId: string, accessToken: string) {
    this.phoneNumberId = phoneNumberId
    this.accessToken = accessToken
  }

  private get baseUrl() {
    return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`
  }

  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.to,
        type: message.type,
        [message.type]: message.type === 'template' ? message.template : message.text,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`WhatsApp API error (${res.status}): ${err}`)
    }

    return res.json()
  }

  async markAsRead(messageId: string): Promise<void> {
    await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    })
  }
}

export function createWhatsAppClient(): WhatsAppClient | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) return null

  return new WhatsAppClient(phoneNumberId, accessToken)
}

export async function getCompanyWhatsAppClient(companyId: string): Promise<WhatsAppClient | null> {
  const companySnap = await adminDb.collection('companies').doc(companyId).get()
  if (!companySnap.exists) return null

  const data = companySnap.data()
  const phoneNumberId = data?.settings?.whatsappBusinessId
  const accessToken = data?.settings?.whatsappToken

  if (!phoneNumberId || !accessToken) return null

  return new WhatsAppClient(phoneNumberId, accessToken)
}
