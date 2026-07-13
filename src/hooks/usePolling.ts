"use client"

import { useEffect, useRef } from "react"

export function usePolling(
  fetchFn: () => Promise<void> | void,
  intervalMs: number | null,
) {
  const fetchRef = useRef(fetchFn)

  useEffect(() => {
    fetchRef.current = fetchFn
  }, [fetchFn])

  useEffect(() => {
    if (intervalMs === null) return

    // Use stable ref for interval so the latest fetchFn is always called
    const call = () => {
      Promise.resolve(fetchRef.current()).catch(() => {
        // silent — errors are handled by individual callers
      })
    }

    call()

    const id = setInterval(call, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, fetchFn])
}
