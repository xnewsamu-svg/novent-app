"use client"

import { useState, useEffect, useCallback } from "react"
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { usePolling } from "@/src/hooks/usePolling"
import { AlertTriangle, RefreshCw, Clock, Zap } from "lucide-react"

interface DlqEntry {
  id: string
  type: string
  lastError: string | null
  failedAt: { toDate: () => Date } | null
  attempts: number
  maxAttempts: number
  automationId: string | null
}

export function DlqWidget({ companyId }: { companyId: string }) {
  const [jobs, setJobs] = useState<DlqEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchJobs = useCallback(async () => {
    if (!companyId) return
    const q = query(
      collection(db, "companies", companyId, "deadLetterQueue"),
      orderBy("failedAt", "desc"),
      limit(10),
    )
    try {
      const snap = await getDocs(q)
      const items = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          type: data.type as string,
          lastError: data.lastError as string | null,
          failedAt: data.failedAt as DlqEntry["failedAt"],
          attempts: data.attempts as number,
          maxAttempts: data.maxAttempts as number,
          automationId: data.automationId as string | null,
        }
      })
      setJobs(items)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [companyId])

  usePolling(fetchJobs, 60000)

  if (loading) {
    return (
      <div className="text-zinc-500 text-sm py-8 text-center">
        Cargando jobs fallidos...
      </div>
    )
  }

  return (
    <div>
      {jobs.length === 0 ? (
        <div className="text-center py-8">
          <Zap className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
          <p className="text-zinc-500 text-sm">Sin errores recientes</p>
          <p className="text-zinc-600 text-xs mt-1">
            Los jobs fallidos aparecerán aquí
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 hover:border-red-900/50 transition"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-900/30 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-red-300">
                      {job.type}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <RefreshCw className="w-3 h-3" />
                      {job.attempts}/{job.maxAttempts} intentos
                    </div>
                  </div>
                </div>
              </div>
              {job.lastError && (
                <p className="text-xs text-zinc-500 line-clamp-2 mb-2 font-mono">
                  {job.lastError}
                </p>
              )}
              {job.failedAt && (
                <div className="flex items-center gap-1 text-xs text-zinc-600">
                  <Clock className="w-3 h-3" />
                  {job.failedAt.toDate().toLocaleString("es-MX")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
