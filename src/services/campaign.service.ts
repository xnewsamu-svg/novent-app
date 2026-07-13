import { adminDb } from "@/lib/firebase-admin"
import { resolveWhatsAppConfig } from "@/src/automation/providers/whatsapp/config"
import { WhatsAppClient } from "@/src/automation/providers/whatsapp/client"
import { createSender } from "@/src/automation/providers/whatsapp/sender"
import { isRetryableError } from "@/src/automation/providers/whatsapp/errors"
import { Timestamp } from "firebase-admin/firestore"

interface PendingCampaign {
  id: string
  companyId: string
  name: string
  message: string
  audience: "all" | "active" | "inactive" | "vip"
  status: string
  scheduledFor: Timestamp | null
  total: number
  sent: number
}

export async function processCampaigns(): Promise<{ processed: number; sent: number; failed: number }> {
  const now = Timestamp.now()
  let processed = 0
  let totalSent = 0
  let totalFailed = 0

  const companiesSnap = await adminDb.collectionGroup("campaigns")
    .where("status", "==", "scheduled")
    .where("scheduledFor", "<=", now)
    .get()

  const campaignMap = new Map<string, PendingCampaign[]>()
  for (const doc of companiesSnap.docs) {
    const campaign = { id: doc.id, ...doc.data() } as PendingCampaign
    const companyId = campaign.companyId
    if (!campaignMap.has(companyId)) campaignMap.set(companyId, [])
    campaignMap.get(companyId)!.push(campaign)
  }

  for (const [companyId, campaigns] of campaignMap) {
    let config
    try {
      config = await resolveWhatsAppConfig(companyId)
    } catch {
      continue
    }

    const client = new WhatsAppClient(config)
    const sender = createSender(client)

    for (const campaign of campaigns) {
      processed++
      await adminDb
        .collection("companies")
        .doc(companyId)
        .collection("campaigns")
        .doc(campaign.id)
        .update({ status: "sending" })

      const customersSnap = await adminDb
        .collection("companies")
        .doc(companyId)
        .collection("clientes")
        .get()

      let recipients = customersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{
        id: string
        phone?: string
        name?: string
        status?: string
        tags?: string[]
      }>

      if (campaign.audience === "active") {
        recipients = recipients.filter((c) => c.status === "active")
      } else if (campaign.audience === "inactive") {
        recipients = recipients.filter((c) => c.status === "inactive")
      } else if (campaign.audience === "vip") {
        recipients = recipients.filter((c) => c.tags?.includes("vip"))
      }

      const phoneRecipients = recipients.filter((c) => c.phone)
      let sentCount = 0
      let failCount = 0

      for (const customer of phoneRecipients) {
        try {
          const result = await sender.sendText({
            to: customer.phone!,
            body: campaign.message.replace(/\{nombre\}/g, customer.name ?? ""),
          })
          if (result.success) {
            sentCount++
          } else {
            failCount++
          }
        } catch {
          failCount++
        }
      }

      await adminDb
        .collection("companies")
        .doc(companyId)
        .collection("campaigns")
        .doc(campaign.id)
        .update({
          status: "completed",
          total: phoneRecipients.length,
          sent: sentCount,
          sentAt: Timestamp.now(),
        })

      totalSent += sentCount
      totalFailed += failCount
    }
  }

  return { processed, sent: totalSent, failed: totalFailed }
}
