"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getUserCompany } from "@/lib/getUserCompany"
import { usePolling } from "@/src/hooks/usePolling"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, Activity, AlertCircle, CheckCircle, Pause, Play, RotateCcw, XCircle } from "lucide-react"
import type { ExecutionStatus } from "@/src/automation"

interface ExecutionDTO {
  id: string
  workflowId: string
  workflowVersion: number
  status: ExecutionStatus
  triggeredAt: string
  startedAt: string | null
  finishedAt: string | null
  error: string | null
  retryCount: number
  maxRetries: number
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-yellow-400" />,
  running: <Play className="w-4 h-4 text-blue-400" />,
  paused: <Pause className="w-4 h-4 text-zinc-400" />,
  completed: <CheckCircle className="w-4 h-4 text-green-400" />,
  failed: <AlertCircle className="w-4 h-4 text-red-400" />,
  cancelled: <XCircle className="w-4 h-4 text-zinc-500" />,
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  running: "Ejecutando",
  paused: "Pausado",
  completed: "Completado",
  failed: "Falló",
  cancelled: "Cancelado",
}

export default function ExecutionsPage() {
  const router = useRouter()
  const [executions, setExecutions] = useState<ExecutionDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return
      const data = await getUserCompany(user.uid)
      if (data) setCompanyId(data.companyId)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const fetchExecutions = useCallback(async () => {
    if (!companyId) return
    try {
      const url = filter
        ? `/api/executions?status=${filter}&max=50`
        : "/api/executions?max=50"
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setExecutions(data.executions ?? [])
      }
    } catch {
      // silent
    }
  }, [companyId, filter])

  usePolling(fetchExecutions, 30000)

  async function handleRetry(executionId: string) {
    setRetrying(executionId)
    try {
      await fetch(`/api/executions/${executionId}/retry`, { method: "POST" })
      fetchExecutions()
    } catch {
      // silent
    }
    setRetrying(null)
  }

  async function handleCancel(executionId: string) {
    try {
      await fetch(`/api/executions/${executionId}/cancel`, { method: "POST" })
      fetchExecutions()
    } catch {
      // silent
    }
  }

  if (loading) {
    return <div className="p-6 text-white">Cargando ejecuciones...</div>
  }

  return (
    <div className="p-6 text-white space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/automatizaciones")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Ejecuciones</h1>
            <p className="text-zinc-400 text-sm">Historial de ejecuciones del engine V2</p>
          </div>
        </div>
        <div className="flex gap-2">
          {[null, "completed", "failed", "running", "paused", "cancelled"].map((s) => (
            <Button
              key={s ?? "all"}
              variant={filter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(s)}
            >
              {s ? STATUS_LABELS[s] ?? s : "Todas"}
            </Button>
          ))}
        </div>
      </div>

      {executions.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-16 text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
          <h2 className="text-2xl font-bold mb-2">Sin ejecuciones</h2>
          <p className="text-zinc-500">Las ejecuciones aparecerán aquí cuando los workflows se activen</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {executions.map((exec) => (
            <Card key={exec.id} className="hover:border-zinc-600 transition">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {STATUS_ICONS[exec.status] ?? <Activity className="w-4 h-4" />}
                    <div>
                      <CardTitle className="text-sm font-mono">{exec.id.slice(0, 12)}...</CardTitle>
                      <p className="text-xs text-zinc-500">
                        v{exec.workflowVersion} &middot; {exec.retryCount > 0 ? `${exec.retryCount} reintento(s)` : "sin reintentos"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-500">
                    <Badge variant={
                      exec.status === "completed" ? "default" :
                      exec.status === "failed" ? "destructive" :
                      exec.status === "running" ? "secondary" : "outline"
                    }>
                      {STATUS_LABELS[exec.status] ?? exec.status}
                    </Badge>
                    <span>{new Date(exec.triggeredAt).toLocaleString()}</span>
                    {exec.status === "failed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRetry(exec.id)}
                        disabled={retrying === exec.id}
                      >
                        <RotateCcw className={`w-4 h-4 ${retrying === exec.id ? "animate-spin" : ""}`} />
                      </Button>
                    )}
                    {(exec.status === "pending" || exec.status === "running" || exec.status === "paused") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(exec.id)}
                      >
                        <XCircle className="w-4 h-4 text-zinc-400 hover:text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {exec.error && (
                <CardContent className="pb-3 pt-0">
                  <p className="text-sm text-red-400 font-mono bg-red-950/30 rounded p-2">
                    {exec.error}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
