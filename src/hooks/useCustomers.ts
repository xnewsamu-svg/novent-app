"use client"

import { useState, useEffect, useCallback } from "react"
import type { DocumentSnapshot, DocumentData } from "firebase/firestore"
import { customersService, type CustomerRecord, type CustomerDetail } from "@/src/services/customers.service"
import { usePaginatedList } from "./usePaginatedList"

export interface UseCustomersReturn {
  customers: CustomerRecord[]
  loading: boolean
  error: string | null
  fetchById: (id: string) => Promise<CustomerDetail | null>
  create: (data: Partial<CustomerRecord>) => Promise<string>
  update: (id: string, data: Partial<CustomerRecord>) => Promise<void>
  remove: (id: string) => Promise<void>
  hasMore: boolean
  loadMore: () => Promise<void>
  search: string
  setSearch: (value: string) => void
}

export function useCustomers(
  companyId: string | null,
  subscribeToList = true,
  paginationOptions?: { pageSize?: number },
): UseCustomersReturn {
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [subError, setSubError] = useState<string | null>(null)
  const [dataReady, setDataReady] = useState(false)

  const isPaginated = !!paginationOptions
  const [search, setSearchState] = useState("")

  // =========================
  // NON-PAGINATED (one-shot fetch)
  // =========================

  useEffect(() => {
    if (isPaginated) return
    if (!subscribeToList) return
    if (!companyId) return

    const unsub = customersService.subscribeAll(
      companyId,
      (items) => {
        setCustomers(items)
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
  }, [companyId, subscribeToList, isPaginated])

  // =========================
  // PAGINATED
  // =========================

  const fetchPageFn = useCallback(
    async (startAfter?: DocumentSnapshot<DocumentData>) =>
      customersService.getPaginated(companyId!, {
        search: search || undefined,
        pageSize: paginationOptions?.pageSize || 50,
        startAfter,
      }),
    [companyId, search, paginationOptions?.pageSize],
  )

  const {
    items: paginatedItems,
    loading: paginatedLoading,
    error: paginatedError,
    hasMore,
    loadMore,
    triggerRefresh,
  } = usePaginatedList<CustomerRecord>(isPaginated ? fetchPageFn : null)

  const loading = isPaginated ? paginatedLoading : (!companyId ? false : !dataReady)

  const setSearch = useCallback((value: string) => {
    setSearchState(value)
  }, [])

  // =========================
  // SHARED CRUD
  // =========================

  const fetchById = useCallback(
    async (id: string): Promise<CustomerDetail | null> => {
      if (!companyId) return null
      return customersService.getById(companyId, id)
    },
    [companyId],
  )

  const create = useCallback(
    async (data: Partial<CustomerRecord>): Promise<string> => {
      if (!companyId) throw new Error("Sin empresa asignada")
      const id = await customersService.create(companyId, data)
      if (isPaginated) triggerRefresh()
      return id
    },
    [companyId, isPaginated, triggerRefresh],
  )

  const update = useCallback(
    async (id: string, data: Partial<CustomerRecord>): Promise<void> => {
      if (!companyId) throw new Error("Sin empresa asignada")
      await customersService.update(companyId, id, data)
      if (isPaginated) triggerRefresh()
    },
    [companyId, isPaginated, triggerRefresh],
  )

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!companyId) throw new Error("Sin empresa asignada")
      await customersService.delete(companyId, id)
      if (isPaginated) triggerRefresh()
    },
    [companyId, isPaginated, triggerRefresh],
  )

  return {
    customers: isPaginated ? paginatedItems : customers,
    loading,
    error: isPaginated ? paginatedError : subError,
    fetchById,
    create,
    update,
    remove,
    hasMore,
    loadMore,
    search,
    setSearch,
  }
}
