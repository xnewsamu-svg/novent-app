"use client"

import { useState, useCallback } from "react"
import { salesService, type SaleRecord } from "@/src/services/sales.service"
import { customersService, type CustomerRecord } from "@/src/services/customers.service"
import { whatsappService, type CampaignRecord } from "@/src/services/whatsapp.service"
import { citasService, type CitaRecord } from "@/src/services/citas.service"
import { usePolling } from "@/src/hooks/usePolling"

export function useDashboardData(companyId: string | null) {
  const [ventas, setVentas] = useState<SaleRecord[]>([])
  const [clientes, setClientes] = useState<CustomerRecord[]>([])
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([])
  const [citas, setCitas] = useState<CitaRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!companyId) {
      setVentas([])
      setClientes([])
      setCampaigns([])
      setCitas([])
      setLoading(false)
      return
    }
    setError(null)
    try {
      const [v, c, ca, cit] = await Promise.all([
        salesService.getAll(companyId),
        customersService.getAll(companyId),
        whatsappService.getCampaigns(companyId),
        citasService.getAll(companyId),
      ])
      setVentas(v)
      setClientes(c)
      setCampaigns(ca)
      setCitas(cit)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [companyId])

  usePolling(fetchData, companyId ? 30000 : null)

  return { ventas, clientes, campaigns, citas, loading, error, refresh: fetchData }
}
