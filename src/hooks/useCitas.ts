"use client"

import { useState, useEffect, useCallback } from "react"
import { citasService, type CitaRecord } from "@/src/services/citas.service"

export interface UseCitasReturn {
  citas: CitaRecord[]
  loading: boolean
  error: string | null
  create: (data: Partial<CitaRecord>) => Promise<string>
  update: (id: string, data: Partial<CitaRecord>) => Promise<void>
  remove: (id: string) => Promise<void>
  refresh: () => void
}

export function useCitas(
  companyId: string | null,
): UseCitasReturn {
  const [citas, setCitas] = useState<CitaRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!companyId) return
    setLoading(true)
    citasService.getAll(companyId)
      .then((items) => {
        setCitas(items)
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar citas"))
      .finally(() => setLoading(false))
  }, [companyId, refreshKey])

  const create = useCallback(async (data: Partial<CitaRecord>): Promise<string> => {
    if (!companyId) throw new Error("Sin empresa asignada")
    const res = await fetch("/api/citas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || "Error al crear cita")
    }
    const json = await res.json()
    refresh()
    return json.id
  }, [companyId, refresh])

  const update = useCallback(async (id: string, data: Partial<CitaRecord>): Promise<void> => {
    if (!companyId) throw new Error("Sin empresa asignada")
    const res = await fetch(`/api/citas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || "Error al actualizar cita")
    }
    refresh()
  }, [companyId, refresh])

  const remove = useCallback(async (id: string): Promise<void> => {
    if (!companyId) throw new Error("Sin empresa asignada")
    const res = await fetch(`/api/citas/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || "Error al eliminar cita")
    }
    refresh()
  }, [companyId, refresh])

  return { citas, loading, error, create, update, remove, refresh }
}
