import { triggerRegistry } from "../registry/trigger-registry"
import type { TriggerMatcher } from "../types/trigger"
import type { AutomationEvent } from "../types/events"
import type { Workflow } from "../types/workflow"
import { logger } from "@/src/lib/logger"

export interface KeywordTriggerConfig {
  keyword: string
  matchMode: "exact" | "contains" | "startsWith"
}

function extractText(data: Record<string, unknown> | undefined): string {
  const msg = data?.message as Record<string, unknown> | undefined
  const msgText = msg?.text as Record<string, unknown> | undefined
  return (data?.messageBody as string) ||
    (data?.text as string) ||
    (data?.body as string) ||
    (msgText?.body as string) ||
    ""
}

const whatsappKeywordTrigger: TriggerMatcher = {
  type: "whatsapp.keyword_match",
  label: "Palabra clave en WhatsApp",
  description: "Se dispara cuando un mensaje de WhatsApp contiene una palabra clave configurada",

  match(event: AutomationEvent, workflow?: Workflow): boolean {
    if (event.type !== "whatsapp.lead.received") {
      return false
    }

    const messageBody = extractText(event.data)

    if (!messageBody) {
      logger.debug("Keyword trigger: mensaje vacío, ignorando", {
        companyId: event.companyId,
        eventType: event.type,
      })
      return false
    }

    const config = workflow?.trigger?.config as KeywordTriggerConfig | undefined
    if (!config?.keyword) {
      logger.debug("Keyword trigger: workflow sin keyword configurada", {
        companyId: event.companyId,
        workflowId: workflow?.id,
      })
      return false
    }

    const keyword = config.keyword.toLowerCase()
    const body = messageBody.toLowerCase()

    const matched = (() => {
      switch (config.matchMode || "contains") {
        case "exact": return body === keyword
        case "startsWith": return body.startsWith(keyword)
        case "contains":
        default: return body.includes(keyword)
      }
    })()

    logger.debug("Keyword trigger match result", {
      companyId: event.companyId,
      workflowId: workflow?.id,
      keyword: config.keyword,
      matchMode: config.matchMode,
      messageBody,
      matched,
    })

    return matched
  },

  extractContext(event: AutomationEvent, workflow?: Workflow) {
    const messageBody = extractText(event.data)

    const config = workflow?.trigger?.config as KeywordTriggerConfig | undefined

    return {
      eventPayload: {
        ...event.data,
        messageBody,
        keyword: config?.keyword || "",
        matchMode: config?.matchMode || "contains",
      },
    }
  },
}

triggerRegistry.register(whatsappKeywordTrigger)

export default whatsappKeywordTrigger
