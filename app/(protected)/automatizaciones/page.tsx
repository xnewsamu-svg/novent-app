"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { getUserCompany } from "@/lib/getUserCompany"
import { usePolling } from "@/src/hooks/usePolling"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Zap, Clock, Activity, Workflow, History } from "lucide-react"
import type { Automation } from "@/lib/types"

const EVENT_LABELS: Record<string, string> = {
  "customer.created": "Cliente creado",
  "customer.updated": "Cliente actualizado",
  "sale.created": "Venta creada",
  "sale.completed": "Venta completada",
  "inventory.low_stock": "Stock bajo",
  "inventory.out_of_stock": "Sin stock",
  "whatsapp.message.received": "WhatsApp recibido",
}

function eventLabel(event: string): string {
  return EVENT_LABELS[event] ?? event ?? "Sin evento"
}

interface V2Workflow {
  id: string
  name: string
  description: string | null
  enabled: boolean
  version: number
  publishedAt: string | null
  trigger: { eventType: string }
  createdAt: string
}

export default function AutomatizacionesPage() {
  const router = useRouter()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [workflows, setWorkflows] = useState<V2Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"v2" | "v1">("v2")
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return
      try {
        const data = await getUserCompany(user.uid)
        if (data) {
          setCompanyId(data.companyId)
        }
      } catch {
        // silent
      }
      setLoading(false)
    })
    return () => unsubAuth()
  }, [])

  const fetchAutomations = useCallback(async () => {
    if (!companyId) return
    const q = query(
      collection(db, "companies", companyId, "automations"),
      orderBy("createdAt", "desc")
    )
    const snap = await getDocs(q)
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Automation[]
    setAutomations(items)
  }, [companyId])

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows")
      if (res.ok) {
        const data = await res.json()
        setWorkflows(data.workflows ?? [])
      }
    } catch {
      // silent
    }
  }, [])

  usePolling(fetchAutomations, 30000)
  usePolling(fetchWorkflows, 30000)

  if (loading) {
    return (
      <div className="p-6 text-white">
        Cargando automatizaciones...
      </div>
    )
  }

  const totalCount = automations.length + workflows.length

  return (
    <div className="p-6 text-white space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-black tracking-tight">
            Automatizaciones
          </h1>
          <p className="text-zinc-400 mt-2">
            Reglas que se ejecutan automáticamente ante eventos del sistema
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => router.push("/automatizaciones/executions")}>
            <History className="w-4 h-4 mr-2" />
            Ejecuciones
          </Button>
          <Button variant="outline" onClick={() => router.push("/automatizaciones/create")}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo workflow
          </Button>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-16 text-center">
          <Zap className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
          <h2 className="text-2xl font-bold mb-2">Sin automatizaciones</h2>
          <p className="text-zinc-500 mb-6">
            Crea tu primera automatización para empezar a ahorrar tiempo
          </p>
          <Button onClick={() => router.push("/automatizaciones/create")}>
            Crear automatización
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-zinc-800 pb-2">
            <button
              onClick={() => setTab("v2")}
              className={`flex items-center gap-2 px-4 py-2 rounded-t text-sm font-medium transition ${
                tab === "v2" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white"
              }`}
            >
              <Workflow className="w-4 h-4" />
              Workflows V2
              <Badge variant="secondary" className="ml-1">{workflows.length}</Badge>
            </button>
            <button
              onClick={() => setTab("v1")}
              className={`flex items-center gap-2 px-4 py-2 rounded-t text-sm font-medium transition ${
                tab === "v1" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white"
              }`}
            >
              <Activity className="w-4 h-4" />
              Automatizaciones V1
              <Badge variant="secondary" className="ml-1">{automations.length}</Badge>
            </button>
          </div>

          {tab === "v2" && (
            <>
              {workflows.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center">
                  <Workflow className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                  <h3 className="text-lg font-semibold mb-1">Sin workflows V2</h3>
                  <p className="text-zinc-500 text-sm mb-4">
                    Los workflows son la nueva versión del editor visual
                  </p>
                  <Button onClick={() => router.push("/automatizaciones/create")}>
                    Crear workflow
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {workflows.map((w) => (
                    <Card
                      key={w.id}
                      className="cursor-pointer hover:border-zinc-600 transition"
                      onClick={() => router.push(`/automatizaciones/${w.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CardTitle>{w.name}</CardTitle>
                            <Badge variant={w.enabled ? "default" : "secondary"}>
                              {w.enabled ? "Activo" : "Inactivo"}
                            </Badge>
                            {w.publishedAt ? (
                              <Badge variant="outline">v{w.version}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-400">Borrador</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(w.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-zinc-400">
                          Evento: {eventLabel(w.trigger?.eventType ?? "")}
                          {w.description && <> &middot; {w.description}</>}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "v1" && (
            <>
              {automations.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                  <h3 className="text-lg font-semibold mb-1">Sin automatizaciones V1</h3>
                  <p className="text-zinc-500 text-sm">No hay automatizaciones clásicas</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {automations.map((a) => (
                    <Card
                      key={a.id}
                      className="cursor-pointer hover:border-zinc-600 transition"
                      onClick={() => router.push(`/automatizaciones/${a.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CardTitle>{a.name}</CardTitle>
                            <Badge variant={a.enabled ? "default" : "secondary"}>
                              {a.enabled ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              {(a as unknown as { executionCount?: number }).executionCount ?? 0} ejecuciones
                            </span>
                          {a.lastTriggeredAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date((a.lastTriggeredAt as unknown as { toDate: () => Date }).toDate?.() ?? a.lastTriggeredAt).toLocaleDateString()}
                            </span>
                          )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-zinc-400">
                          Evento: {eventLabel(a.trigger?.event ?? "")}
                          {a.description && <> &middot; {a.description}</>}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
