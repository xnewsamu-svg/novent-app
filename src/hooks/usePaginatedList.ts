"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { DocumentSnapshot, DocumentData } from "firebase/firestore"

export interface UsePaginatedListReturn<T> {
  items: T[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  triggerRefresh: () => void
}

interface PageResult<T> {
  items: T[]
  lastDoc: DocumentSnapshot<DocumentData> | null
  hasMore: boolean
}

export function usePaginatedList<T>(
  fetcher: ((startAfter?: DocumentSnapshot<DocumentData>) => Promise<PageResult<T>>) | null,
): UsePaginatedListReturn<T> {
  const [items, setItems] = useState<T[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState<DocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const loadingRef = useRef(false)
  const [dataReady, setDataReady] = useState(false)
  const loading = !fetcher ? false : !dataReady

  const fetchPage = useCallback(
    async (cursorVal?: DocumentSnapshot<DocumentData>) => {
      if (!fetcher) return
      loadingRef.current = true
      setError(null)
      try {
        const result = await fetcher(cursorVal)
        if (cursorVal) {
          setItems((prev) => [...prev, ...result.items])
        } else {
          setItems(result.items)
        }
        setCursor(result.lastDoc)
        setHasMore(result.hasMore)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error fetching data")
      } finally {
        loadingRef.current = false
      }
    },
    [fetcher],
  )

  useEffect(() => {
    if (!fetcher) return

    const run = async () => {
      await fetchPage()
      setDataReady(true)
    }
    queueMicrotask(run)

    return () => {
      setDataReady(false)
    }
  }, [fetcher, refreshTrigger, fetchPage])

  const loadMore = useCallback(async () => {
    if (!cursor || !hasMore || loadingRef.current) return
    await fetchPage(cursor)
  }, [cursor, hasMore, fetchPage])

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((c) => c + 1)
  }, [])

  return { items, loading, error, hasMore, loadMore, triggerRefresh }
}
