'use client'

import { useCallback, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUserCompany } from '@/lib/getUserCompany'
import { usePolling } from '@/src/hooks/usePolling'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Copy, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Template {
  id: string
  name: string
  message: string
  variables: string[]
  category: string
  status: string
  createdAt: { _seconds?: number; seconds?: number } | string
  companyId: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [companyId, setCompanyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    message: '',
    category: 'marketing',
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

  const fetchTemplates = useCallback(async () => {
    if (!companyId) return
    try {
      const res = await fetch('/api/whatsapp/templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates ?? [])
      }
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [companyId])

  usePolling(fetchTemplates, 30000)

  const handleSubmit = async () => {
    if (!companyId) return
    if (!form.name.trim() || !form.message.trim()) {
      toast.error('Nombre y mensaje son requeridos')
      return
    }

    try {
      if (editingId) {
        const res = await fetch(`/api/whatsapp/templates/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error((await res.json()).error ?? 'Error al actualizar')
        toast.success('Template actualizado')
      } else {
        const res = await fetch('/api/whatsapp/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error((await res.json()).error ?? 'Error al crear')
        toast.success('Template creado')
      }

      setDialogOpen(false)
      resetForm()
      fetchTemplates()
    } catch (error: unknown) {
      toast.error('Error: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!companyId) return
    if (!confirm('¿Eliminar este template?')) return

    try {
      const res = await fetch(`/api/whatsapp/templates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      toast.success('Template eliminado')
      fetchTemplates()
    } catch (error: unknown) {
      toast.error('Error: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const editTemplate = (template: Template) => {
    setEditingId(template.id)
    setForm({
      name: template.name,
      message: template.message,
      category: template.category,
    })
    setDialogOpen(true)
  }

  const resetForm = () => {
    setEditingId(null)
    setForm({ name: '', message: '', category: 'marketing' })
  }

  const previewMessage = (message: string) => {
    return message.replace(/\{([^}]+)\}/g, '[$1]')
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
          <h1 className="text-3xl font-bold">Templates de WhatsApp</h1>
          <p className="text-zinc-400">Crea templates para tus campañas</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="w-12 h-12 mb-4 text-zinc-600" />
            <h3 className="text-lg font-semibold">Sin templates</h3>
            <p className="text-zinc-500 text-center max-w-md">
              Crea templates para mensajes de WhatsApp con variables personalizadas.
            </p>
            <Button className="mt-4" onClick={() => { resetForm(); setDialogOpen(true) }}>
              Crear template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{template.category}</Badge>
                      <Badge variant={template.status === 'active' ? 'default' : template.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {template.status}
                      </Badge>
                      {template.variables.length > 0 && (
                        <Badge variant="secondary">
                          {template.variables.length} variables
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => editTemplate(template)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(template.message)
                        toast.success('Mensaje copiado')
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteTemplate(template.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-zinc-900 p-3 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{previewMessage(template.message)}</p>
                </div>
                {template.variables.length > 0 && (
                  <div className="mt-2 text-xs text-zinc-500">
                    Variables: {template.variables.join(', ')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar template' : 'Nuevo template'}</DialogTitle>
            <DialogDescription>
              Crea un template con variables entre llaves. Ej: Hola {'{nombre}'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del template</Label>
              <Input
                id="name"
                placeholder="Ej: Bienvenida"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="category">Categoría</Label>
              <select
                id="category"
                className="w-full p-2 rounded-md border bg-zinc-950 border-zinc-800 text-white"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="marketing">Marketing</option>
                <option value="transactional">Transaccional</option>
                <option value="support">Soporte</option>
              </select>
            </div>
            <div>
              <Label htmlFor="message">Mensaje</Label>
              <Textarea
                id="message"
                placeholder="Hola {nombre}, bienvenido a nuestro negocio."
                rows={6}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
              <div className="text-xs text-zinc-500 mt-1">
                Usa {'{variable}'} para variables. Ej: {'{nombre}'}, {'{servicio}'}
              </div>
            </div>
            {form.message && (
              <div className="bg-zinc-900 p-3 rounded-lg">
                <div className="text-xs text-zinc-500 mb-1">Vista previa:</div>
                <p className="text-sm">{previewMessage(form.message)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingId ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
