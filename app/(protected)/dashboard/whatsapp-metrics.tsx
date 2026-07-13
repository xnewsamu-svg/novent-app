"use client"

import { useMemo } from "react"
import type { CampaignRecord } from "@/src/services/whatsapp.service"
import {
  Send,
  CheckCircle2,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Megaphone,
} from "lucide-react"

interface WhatsAppMetricsProps {
  campaigns: CampaignRecord[]
}

export function WhatsAppMetrics({ campaigns }: WhatsAppMetricsProps) {
  const metrics = useMemo(() => {
    let completed = 0
    let scheduled = 0
    let totalSent = 0
    let totalTargeted = 0
    const dailyData: Record<string, number> = {}

    campaigns.forEach((c) => {
      if (c.status === "completed") completed++
      else if (c.status === "scheduled") scheduled++

      totalSent += c.sent || 0
      totalTargeted += c.total || 0

      if (c.createdAt) {
        const date = c.createdAt.toDate?.() ?? c.createdAt
        if (date instanceof Date) {
          const key = date.toISOString().split("T")[0]
          dailyData[key] = (dailyData[key] || 0) + 1
        }
      }
    })

    const last7Days: Array<{ date: string; total: number }> = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = date.toISOString().split("T")[0]
      last7Days.push({
        date: key,
        total: dailyData[key] || 0,
      })
    }

    const totalCampaigns = campaigns.length
    const deliveryRate =
      totalTargeted > 0 ? (totalSent / totalTargeted) * 100 : 0

    return {
      totalCampaigns,
      completed,
      scheduled,
      totalSent,
      totalTargeted,
      deliveryRate,
      last7Days,
    }
  }, [campaigns])

  const statCard = (icon: React.ReactNode, label: string, value: string | number) => (
    <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4">
      <div className="text-sm text-zinc-400 flex items-center gap-2 mb-1">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  )

  if (campaigns.length === 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4">
              <div className="text-sm text-zinc-500 mb-1">—</div>
              <div className="text-2xl font-bold text-zinc-600">0</div>
            </div>
          ))}
        </div>
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 flex items-center justify-center">
          <div className="text-center text-zinc-500">
            <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay campañas de WhatsApp aún</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCard(<Megaphone className="w-4 h-4 text-blue-500" />, "Campañas", metrics.totalCampaigns)}
        {statCard(<CheckCircle2 className="w-4 h-4 text-green-500" />, "Completadas", metrics.completed)}
        {statCard(<CalendarClock className="w-4 h-4 text-yellow-500" />, "Programadas", metrics.scheduled)}
        {statCard(<Send className="w-4 h-4 text-violet-500" />, "Enviados", metrics.totalSent)}
        {statCard(
          metrics.deliveryRate > 70 ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          ),
          "Entrega",
          `${metrics.deliveryRate.toFixed(1)}%`,
        )}
      </div>

      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-sm font-medium text-zinc-300 mb-4">
          Campañas creadas últimos 7 días
        </h3>
        <div className="flex items-end gap-2 h-24">
          {metrics.last7Days.map((day) => {
            const max = Math.max(...metrics.last7Days.map((d) => d.total), 1)
            const height = (day.total / max) * 100
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-blue-500/80 rounded-t-sm transition-all"
                  style={{ height: `${Math.max(4, height)}%` }}
                />
                <span className="text-xs text-zinc-500">
                  {new Date(day.date).toLocaleDateString("es", { weekday: "short" })}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
