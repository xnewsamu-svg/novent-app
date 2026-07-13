"use client"

import { useState, useEffect, useCallback } from "react"
import { automationsService } from "@/src/services/automations.service"
import type { Automation, AutomationExecution } from "@/lib/types"

export interface UseAutomationsReturn {
  automations: Automation[]
  loading: boolean
  error: string | null
  create: (data: Partial<Automation>) => Promise<string>
  update: (id: string, data: Partial<Automation>) => Promise<void>
  remove: (id: string) => Promise<void>
}

export interface UseAutomationExecutionsReturn {
  executions: AutomationExecution[]
  loading: boolean
  error: string | null
}

export function useAutomations(companyId: string | null): UseAutomationsReturn {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dataReady, setDataReady] = useState(false)

  const loading = !companyId ? false : !dataReady

  useEffect(() => {
    if (!companyId) return

    const unsub = automationsService.subscribeAll(
      companyId,
      (items) => {
        setAutomations(items)
        setDataReady(true)
      },
      (err) => {
        setError(err.message)
        setDataReady(true)
      },
    )

    return () => {
      unsub()
      setDataReady(false)
    }
  }, [companyId])

  const create = useCallback(
    async (data: Partial<Automation>): Promise<string> => {
      if (!companyId) throw new Error("Sin empresa asignada")
      return automationsService.create(companyId, data)
    },
    [companyId],
  )

  const update = useCallback(
    async (id: string, data: Partial<Automation>): Promise<void> => {
      if (!companyId) throw new Error("Sin empresa asignada")
      return automationsService.update(companyId, id, data)
    },
    [companyId],
  )

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!companyId) throw new Error("Sin empresa asignada")
      return automationsService.delete(companyId, id)
    },
    [companyId],
  )

  return { automations, loading, error, create, update, remove }
}

export function useAutomationExecutions(
  companyId: string | null,
  automationId: string | null,
): UseAutomationExecutionsReturn {
  const [executions, setExecutions] = useState<AutomationExecution[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dataReady, setDataReady] = useState(false)

  const loading = !companyId || !automationId ? false : !dataReady

  useEffect(() => {
    if (!companyId || !automationId) return

    const unsub = automationsService.subscribeExecutions(
      companyId,
      automationId,
      (items) => {
        setExecutions(items)
        setDataReady(true)
      },
      50,
      (err) => {
        setError(err.message)
        setDataReady(true)
      },
    )

    return () => {
      unsub()
      setDataReady(false)
    }
  }, [companyId, automationId])

  return { executions, loading, error }
}
