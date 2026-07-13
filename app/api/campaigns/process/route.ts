import { NextRequest, NextResponse } from "next/server"
import { verifyCronSecret, handleError } from "@/app/api/_lib/auth"
import { processCampaigns } from "@/src/services/campaign.service"

export async function GET(req: NextRequest) {
  try {
    verifyCronSecret(req)

    const result = await processCampaigns()
    return NextResponse.json({ cron: true, ...result })
  } catch (error) {
    return handleError(error)
  }
}
