'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUserCompany } from '@/lib/getUserCompany'
import { usePolling } from '@/src/hooks/usePolling'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageCircle, Send, FileText, CalendarClock, ArrowRight } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  sent: number
  total: number
  status: string
  createdAt?: { _seconds?: number; seconds?: number } | string
}

interface Template {
  id: string
  name: string
  status: string
}

export default function WhatsappDashboard() {
  const [companyId, setCompanyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<Template[]>([])

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

  const fetchCampaigns = useCallback(async () => {
    if (!companyId) return
    try {
      const res = await fetch('/api/whatsapp/campaigns')
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns ?? [])
      }
    } catch {
      // silent
    }
  }, [companyId])

  const fetchTemplates = useCallback(async () => {
    if (!companyId) return
    try {
      const res = await fetch('/api/whatsapp/templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates ?? [])
      }
    } catch {
      // silent
    }
  }, [companyId])

  usePolling(fetchCampaigns, 30000)
  usePolling(fetchTemplates, 30000)

  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent || 0), 0)
  const totalTargeted = campaigns.reduce((acc, c) => acc + (c.total || 0), 0)
  const activeTemplates = templates.filter((t) => t.status === 'active').length
  const scheduledCount = campaigns.filter((c) => c.status === 'scheduled').length
  const recentCampaigns = [...campaigns]
    .sort((a, b) => {
      const getTs = (c: Campaign) => {
        if (!c.createdAt) return 0
        if (typeof c.createdAt === 'string') return new Date(c.createdAt).getTime()
        const obj = c.createdAt as { _seconds?: number; seconds?: number }
        const secs = obj._seconds ?? obj.seconds
        return secs ? secs * 1000 : 0
      }
      return getTs(b) - getTs(a)
    })
    .slice(0, 5)

  if (loading) {
    return (
      <div className="p-6 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-600 border-t-white" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">WhatsApp</h1>
        <p className="text-zinc-400">Panel de control de WhatsApp</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Campañas totales</CardTitle>
            <Send className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-zinc-500">
              {campaigns.filter((c) => c.status === 'completed').length} completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Templates activos</CardTitle>
            <FileText className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTemplates}</div>
            <p className="text-xs text-zinc-500">
              {templates.length} templates creados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mensajes enviados</CardTitle>
            <MessageCircle className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent}</div>
            <p className="text-xs text-zinc-500">
              de {totalTargeted} destinatarios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Programadas</CardTitle>
            <CalendarClock className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledCount}</div>
            <p className="text-xs text-zinc-500">
              campañas pendientes de envío
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Campañas recientes</CardTitle>
              <Link href="/whatsapp/campaigns">
                <Button variant="ghost" size="sm">
                  Ver todas <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">
                No hay campañas aún
              </p>
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((c) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-zinc-500">
                        {c.sent}/{c.total} enviados
                      </p>
                    </div>
                    <Badge
                      variant={
                        c.status === 'completed'
                          ? 'default'
                          : c.status === 'cancelled'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Acciones rápidas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/whatsapp/campaigns" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Send className="w-4 h-4 mr-2" />
                Nueva campaña
              </Button>
            </Link>
            <Link href="/whatsapp/templates" className="block">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Gestionar templates
              </Button>
            </Link>
            <Link href="/automatizaciones" className="block">
              <Button variant="outline" className="w-full justify-start">
                <CalendarClock className="w-4 h-4 mr-2" />
                Automatizaciones
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
