import { NextRequest, NextResponse } from "next/server"
import { verifyCronSecret, handleError } from "@/app/api/_lib/auth"
import { processPendingJobsGlobal } from "@/lib/jobs/process-global"
import { processCampaigns } from "@/src/services/campaign.service"
import { fireScheduledEvents } from "@/src/services/scheduler-cron.service"

export async function GET(req: NextRequest) {
  try {
    verifyCronSecret(req)

    const [jobsResult, campaignResult, scheduledResult] = await Promise.allSettled([
      processPendingJobsGlobal({ limit: 20 }),
      processCampaigns(),
      fireScheduledEvents(),
    ])

    return NextResponse.json({
      cron: true,
      jobs: jobsResult.status === "fulfilled" ? jobsResult.value : { error: String(jobsResult.reason) },
      campaigns: campaignResult.status === "fulfilled" ? campaignResult.value : { error: String(campaignResult.reason) },
      scheduled: scheduledResult.status === "fulfilled" ? scheduledResult.value : { error: String(scheduledResult.reason) },
    })
  } catch (error) {
    return handleError(error)
  }
}
