"use client"

import { useState, useEffect, useCallback } from "react"
import { serviciosService, type ServicioRecord } from "@/src/services/servicios.service"

export interface UseServiciosReturn {
  servicios: ServicioRecord[]
  loading: boolean
  error: string | null
  create: (data: Partial<ServicioRecord>) => Promise<string>
  update: (id: string, data: Partial<ServicioRecord>) => Promise<void>
  remove: (id: string) => Promise<void>
  refresh: () => void
}

export function useServicios(
  companyId: string | null,
): UseServiciosReturn {
  const [servicios, setServicios] = useState<ServicioRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!companyId) return
    setLoading(true)
    serviciosService.getAll(companyId)
      .then((items) => {
        setServicios(items)
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar servicios"))
      .finally(() => setLoading(false))
  }, [companyId, refreshKey])

  const create = useCallback(async (data: Partial<ServicioRecord>): Promise<string> => {
    if (!companyId) throw new Error("Sin empresa asignada")
    const id = await serviciosService.create(companyId, data)
    refresh()
    return id
  }, [companyId, refresh])

  const update = useCallback(async (id: string, data: Partial<ServicioRecord>): Promise<void> => {
    if (!companyId) throw new Error("Sin empresa asignada")
    await serviciosService.update(companyId, id, data)
    refresh()
  }, [companyId, refresh])

  const remove = useCallback(async (id: string): Promise<void> => {
    if (!companyId) throw new Error("Sin empresa asignada")
    await serviciosService.delete(companyId, id)
    refresh()
  }, [companyId, refresh])

  return { servicios, loading, error, create, update, remove, refresh }
}
