import { adminDb } from "@/lib/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"
import type { AutomationEvent } from "@/src/automation/types/events"
import { run, runExecution } from "@/src/automation/engine/workflow-engine"
import { createEngineAdapter } from "@/src/automation/services/engine-adapter"

export async function fireScheduledEvents(): Promise<{ fired: number }> {
  let fired = 0
  const now = new Date()
  const currentMinute = now.getUTCMinutes()
  const currentHour = now.getUTCHours()
  const currentDay = now.getUTCDate()
  const currentMonth = now.getUTCMonth() + 1
  const currentDayOfWeek = now.getUTCDay()

  const companiesSnap = await adminDb.collection("companies").limit(500).get()

  for (const companyDoc of companiesSnap.docs) {
    const companyId = companyDoc.id
    const workflowsSnap = await adminDb
      .collection("companies")
      .doc(companyId)
      .collection("workflows")
      .where("enabled", "==", true)
      .get()

    for (const wfDoc of workflowsSnap.docs) {
      const wf = wfDoc.data()
      const schedule = wf.trigger?.schedule as string | undefined
      if (!schedule) continue

      try {
        const parts = schedule.trim().split(/\s+/)
        if (parts.length < 5) continue

        const matchesMinute = cronPartMatches(parts[0], currentMinute, 0, 59)
        const matchesHour = cronPartMatches(parts[1], currentHour, 0, 23)
        const matchesDay = cronPartMatches(parts[2], currentDay, 1, 31)
        const matchesMonth = cronPartMatches(parts[3], currentMonth, 1, 12)
        const matchesWeekday = cronPartMatches(parts[4], currentDayOfWeek, 0, 6)

        if (matchesMinute && matchesHour && matchesDay && matchesMonth && matchesWeekday) {
          const eventRef = await adminDb
            .collection("companies")
            .doc(companyId)
            .collection("events")
            .add({
              type: "scheduled.time",
              data: {
                workflowId: wfDoc.id,
                companyId,
                schedule,
              },
              source: "scheduler",
              correlationId: null,
              timestamp: now,
              companyId,
              createdAt: now,
            })

          const v2Event: AutomationEvent = {
            id: eventRef.id,
            companyId,
            type: "scheduled.time",
            data: { workflowId: wfDoc.id, companyId, schedule },
            source: "scheduler",
            timestamp: now,
            correlationId: null,
          }

          const services = createEngineAdapter(companyId)
          const executionIds = await run(v2Event, services)
          await Promise.allSettled(
            executionIds.map((eid) =>
              runExecution(eid, companyId, services).catch(() => {}),
            ),
          )

          fired++
        }
      } catch {
        // skip invalid schedule expressions
      }
    }
  }

  return { fired }
}

function cronPartMatches(part: string, value: number, min: number, max: number): boolean {
  if (part === "*") return true

  if (part.includes("/")) {
    const [base, step] = part.split("/")
    const start = base === "*" ? min : parseInt(base, 10)
    return !isNaN(start) && !isNaN(parseInt(step, 10)) && value >= start && (value - start) % parseInt(step, 10) === 0
  }

  if (part.includes(",")) {
    return part.split(",").some((p) => cronPartMatches(p.trim(), value, min, max))
  }

  if (part.includes("-")) {
    const [from, to] = part.split("-").map(Number)
    return !isNaN(from) && !isNaN(to) && value >= from && value <= to
  }

  const num = parseInt(part, 10)
  return !isNaN(num) && num === value
}
