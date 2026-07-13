'use client'

import { useCallback, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUserCompany } from '@/lib/getUserCompany'
import { usePolling } from '@/src/hooks/usePolling'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Send, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

interface Campaign {
  id: string
  name: string
  message: string
  templateId?: string
  audience: string
  status: string
  scheduledFor?: { _seconds?: number; seconds?: number } | string | null
  sentAt?: { _seconds?: number; seconds?: number } | string | null
  total: number
  sent: number
  companyId: string
  createdAt: { _seconds?: number; seconds?: number } | string
}

interface Template {
  id: string
  name: string
  message: string
  companyId: string
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [companyId, setCompanyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<{
    name: string
    message: string
    templateId: string
    audience: 'all' | 'active' | 'inactive' | 'vip'
    schedule: boolean
    scheduledDate: Date
    scheduledTime: string
  }>({
    name: '',
    message: '',
    templateId: '',
    audience: 'all',
    schedule: false,
    scheduledDate: new Date(),
    scheduledTime: '09:00',
  })

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return
      const data = await getUserCompany(user.uid)
      if (!data) return
      setCompanyId(data.companyId)
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
      setLoading(false)
    } catch {
      setLoading(false)
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

  const handleSubmit = async () => {
    if (!companyId) return
    if (!form.name.trim()) {
      toast.error('Nombre es requerido')
      return
    }

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        message: form.message.trim(),
        templateId: form.templateId || null,
        audience: form.audience,
        schedule: form.schedule,
      }

      if (form.schedule) {
        payload.scheduledFor = `${format(form.scheduledDate, 'yyyy-MM-dd')}T${form.scheduledTime}`
      }

      const res = await fetch('/api/whatsapp/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al crear')

      toast.success('Campaña creada')
      setShowCreate(false)
      resetForm()
      fetchCampaigns()
    } catch (error: unknown) {
      toast.error('Error: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const resetForm = () => {
    setForm({
      name: '',
      message: '',
      templateId: '',
      audience: 'all',
      schedule: false,
      scheduledDate: new Date(),
      scheduledTime: '09:00',
    })
  }

  const getAudienceLabel = (audience: string) => {
    const labels: Record<string, string> = {
      all: 'Todos los clientes',
      active: 'Clientes activos',
      inactive: 'Clientes inactivos',
      vip: 'Clientes VIP',
    }
    return labels[audience] || audience
  }

  function toDate(v: unknown): Date | null {
    if (!v) return null
    if (typeof v === 'string') return new Date(v)
    if (typeof v === 'object' && v !== null) {
      const obj = v as { _seconds?: number; seconds?: number }
      const secs = obj._seconds ?? obj.seconds
      if (secs) return new Date(secs * 1000)
    }
    return null
  }

  if (loading) {
    return (
      <div className="p-6 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-600 border-t-white" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Campañas WhatsApp</h1>
          <p className="text-zinc-400">Gestiona tus campañas de marketing</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Send className="w-4 h-4 mr-2" />
          Nueva campaña
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva campaña</CardTitle>
            <CardDescription>Configura tu campaña de WhatsApp</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                placeholder="Ej: Promoción fin de mes"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Plantilla (opcional)</Label>
              <Select
                value={form.templateId}
                onValueChange={(value) => {
                  const template = templates.find((t) => t.id === value)
                  setForm({
                    ...form,
                    templateId: value,
                    message: template?.message || '',
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plantilla" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Mensaje</Label>
              <Textarea
                placeholder="Escribe tu mensaje o usa variables como {nombre}"
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>

            <div>
              <Label>Audiencia</Label>
              <Select
                value={form.audience}
                onValueChange={(value: 'all' | 'active' | 'inactive' | 'vip') =>
                  setForm({ ...form, audience: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  <SelectItem value="active">Clientes activos</SelectItem>
                  <SelectItem value="inactive">Clientes inactivos</SelectItem>
                  <SelectItem value="vip">Clientes VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.schedule}
                onCheckedChange={(checked) => setForm({ ...form, schedule: checked })}
              />
              <span>Programar envío</span>
            </div>

            {form.schedule && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Fecha</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(form.scheduledDate, 'dd/MM/yyyy', { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={form.scheduledDate}
                        onSelect={(date) => date && setForm({ ...form, scheduledDate: date })}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1">
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={form.scheduledTime}
                    onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {form.schedule ? 'Programar campaña' : 'Guardar borrador'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {campaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="w-12 h-12 mb-4 text-zinc-600" />
            <h3 className="text-lg font-semibold">Sin campañas</h3>
            <p className="text-zinc-500 text-center max-w-md">
              Crea tu primera campaña de WhatsApp para llegar a tus clientes.
            </p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              Crear campaña
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      <Badge
                        variant={
                          campaign.status === 'completed'
                            ? 'default'
                            : campaign.status === 'cancelled'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {campaign.status}
                      </Badge>
                      <Badge variant="outline">
                        {getAudienceLabel(campaign.audience)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right text-sm text-zinc-500">
                    <div>
                      {campaign.sent}/{campaign.total} enviados
                    </div>
                    {campaign.scheduledFor && (
                      <div className="text-xs">
                        {format(toDate(campaign.scheduledFor) ?? new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-400 line-clamp-2">{campaign.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
