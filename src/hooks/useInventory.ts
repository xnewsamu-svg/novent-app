"use client"

import { useState, useEffect, useCallback } from "react"
import type { DocumentSnapshot, DocumentData } from "firebase/firestore"
import { inventoryService, type ProductRecord } from "@/src/services/inventory.service"
import { usePaginatedList } from "./usePaginatedList"

export interface UseInventoryReturn {
  products: ProductRecord[]
  loading: boolean
  error: string | null
  create: (data: Partial<ProductRecord>) => Promise<string>
  update: (id: string, data: Partial<ProductRecord>) => Promise<void>
  remove: (id: string) => Promise<void>
  hasMore: boolean
  loadMore: () => Promise<void>
  search: string
  setSearch: (value: string) => void
}

export function useInventory(
  companyId: string | null,
  subscribeToList = true,
  paginationOptions?: { pageSize?: number },
): UseInventoryReturn {
  const [products, setProducts] = useState<ProductRecord[]>([])
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

    const unsub = inventoryService.subscribeAll(
      companyId,
      (items) => {
        setProducts(items)
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
      inventoryService.getPaginated(companyId!, {
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
  } = usePaginatedList<ProductRecord>(isPaginated ? fetchPageFn : null)

  const loading = isPaginated ? paginatedLoading : (!companyId ? false : !dataReady)

  const setSearch = useCallback((value: string) => {
    setSearchState(value)
  }, [])

  // =========================
  // SHARED CRUD
  // =========================

  const create = useCallback(
    async (data: Partial<ProductRecord>): Promise<string> => {
      if (!companyId) throw new Error("Sin empresa asignada")
      const id = await inventoryService.create(companyId, data)
      if (isPaginated) triggerRefresh()
      return id
    },
    [companyId, isPaginated, triggerRefresh],
  )

  const update = useCallback(
    async (id: string, data: Partial<ProductRecord>): Promise<void> => {
      if (!companyId) throw new Error("Sin empresa asignada")
      await inventoryService.update(companyId, id, data)
      if (isPaginated) triggerRefresh()
    },
    [companyId, isPaginated, triggerRefresh],
  )

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!companyId) throw new Error("Sin empresa asignada")
      await inventoryService.delete(companyId, id)
      if (isPaginated) triggerRefresh()
    },
    [companyId, isPaginated, triggerRefresh],
  )

  return {
    products: isPaginated ? paginatedItems : products,
    loading,
    error: isPaginated ? paginatedError : subError,
    create,
    update,
    remove,
    hasMore,
    loadMore,
    search,
    setSearch,
  }
}
