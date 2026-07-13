"use client"

import { useState, useEffect, useCallback } from "react"
import type { DocumentSnapshot, DocumentData } from "firebase/firestore"
import { salesService, type SaleRecord } from "@/src/services/sales.service"
import { usePaginatedList } from "./usePaginatedList"

export interface UseSalesReturn {
  sales: SaleRecord[]
  loading: boolean
  error: string | null
  create: (data: {
    cliente: string
    clienteNombre?: string
    clienteTelefono?: string
    productoId: string
    cantidad: number
    nombreProducto: string
    precioProducto: number
  }) => Promise<{ saleId: string; newCustomerId?: string }>
  remove: (saleId: string) => Promise<void>
  hasMore: boolean
  loadMore: () => Promise<void>
  search: string
  setSearch: (value: string) => void
}

export function useSales(
  companyId: string | null,
  customerIdOrOptions?: string | null | { pageSize?: number },
): UseSalesReturn {
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [subError, setSubError] = useState<string | null>(null)
  const [dataReady, setDataReady] = useState(false)

  const isPaginated = typeof customerIdOrOptions === "object" && customerIdOrOptions !== null
  const customerId = !isPaginated ? customerIdOrOptions ?? null : null
  const paginationOptions = isPaginated ? customerIdOrOptions : undefined

  // =========================
  // LEGACY (one-shot fetch)
  // =========================

  useEffect(() => {
    if (isPaginated) return
    if (!companyId) return

    const subscribe = customerId
      ? (cb: (items: SaleRecord[]) => void, errCb: (err: Error) => void) =>
          salesService.subscribeByCustomer(companyId, customerId, cb, errCb)
      : (cb: (items: SaleRecord[]) => void, errCb: (err: Error) => void) =>
          salesService.subscribeAll(companyId, cb, errCb)

    const unsub = subscribe(
      (items) => {
        setSales(items)
        setDataReady(true)
      },
      (err) => {
        setSubError(err.message)
        setDataReady(true)
      },
    )

    return () => {
      unsub()
      setDataReady(false)
    }
  }, [companyId, customerId, isPaginated])

  // =========================
  // PAGINATED
  // =========================

  const fetchPageFn = useCallback(
    async (startAfter?: DocumentSnapshot<DocumentData>) =>
      salesService.getPaginated(companyId!, {
        pageSize: paginationOptions?.pageSize || 50,
        startAfter,
      }),
    [companyId, paginationOptions?.pageSize],
  )

  const {
    items: paginatedItems,
    loading: paginatedLoading,
    error: paginatedError,
    hasMore,
    loadMore,
    triggerRefresh,
  } = usePaginatedList<SaleRecord>(isPaginated ? fetchPageFn : null)

  const loading = isPaginated ? paginatedLoading : (!companyId ? false : !dataReady)

  // =========================
  // SHARED CRUD
  // =========================

  const create = useCallback(
    async (data: {
      cliente: string
      clienteNombre?: string
      clienteTelefono?: string
      productoId: string
      cantidad: number
      nombreProducto: string
      precioProducto: number
    }): Promise<{ saleId: string; newCustomerId?: string }> => {
      if (!companyId) throw new Error("Sin empresa asignada")
      const result = await salesService.createWithTransaction(companyId, data)
      if (isPaginated) triggerRefresh()
      return result
    },
    [companyId, isPaginated, triggerRefresh],
  )

  const remove = useCallback(
    async (saleId: string): Promise<void> => {
      if (!companyId) throw new Error("Sin empresa asignada")
      await salesService.deleteWithTransaction(companyId, saleId)
      if (isPaginated) triggerRefresh()
    },
    [companyId, isPaginated, triggerRefresh],
  )

  return {
    sales: isPaginated ? paginatedItems : sales,
    loading,
    error: isPaginated ? paginatedError : subError,
    create,
    remove,
    hasMore,
    loadMore,
    search: "",
    setSearch: () => {},
  }
}
