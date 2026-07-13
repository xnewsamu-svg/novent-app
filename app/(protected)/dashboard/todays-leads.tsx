"use client"

import { useState, useCallback } from "react"
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { usePolling } from "@/src/hooks/usePolling"
import { Phone, MessageCircle, Clock, User } from "lucide-react"
import type { Lead } from "@/lib/types"

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "Nuevo", color: "bg-blue-500/20 text-blue-400" },
  contacted: { label: "Contactado", color: "bg-yellow-500/20 text-yellow-400" },
  converted: { label: "Convertido", color: "bg-green-500/20 text-green-400" },
  closed: { label: "Cerrado", color: "bg-zinc-500/20 text-zinc-400" },
}

export function TodaysLeads({ companyId }: { companyId: string }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    if (!companyId) return
    setLoadError(null)
    const today = new Date().toISOString().split("T")[0]
    const q = query(
      collection(db, "companies", companyId, "leads"),
      where("leadDate", "==", today),
    )
    try {
      const snap = await getDocs(q)
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Lead[]
      items.sort((a, b) => {
        const aTime = (a.createdAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0
        const bTime = (b.createdAt as unknown as { toMillis?: () => number })?.toMillis?.() ?? 0
        return bTime - aTime
      })
      setLeads(items)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Error al cargar leads")
    } finally {
      setLoading(false)
    }
  }, [companyId])

  usePolling(fetchLeads, 30000)

  if (loading) {
    return (
      <div className="text-zinc-500 text-sm py-8 text-center">
        Cargando citas del día...
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 text-sm">{loadError}</p>
      </div>
    )
  }

  return (
    <div>
      {leads.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
          <p className="text-zinc-500 text-sm">No hay citas hoy</p>
          <p className="text-zinc-600 text-xs mt-1">
            Los mensajes de WhatsApp aparecerán aquí
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                    <User className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{lead.name}</p>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Phone className="w-3 h-3" />
                      {lead.phone}
                    </div>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[lead.status]?.color ?? "bg-zinc-500/20 text-zinc-400"}`}>
                  {STATUS_LABELS[lead.status]?.label ?? lead.status}
                </span>
              </div>
              {lead.message && (
                <p className="text-sm text-zinc-400 line-clamp-2 mb-2">
                  &ldquo;{lead.message}&rdquo;
                </p>
              )}
              {lead.leadTime && (
                <div className="flex items-center gap-1 text-xs text-zinc-600">
                  <Clock className="w-3 h-3" />
                  {lead.leadTime}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
