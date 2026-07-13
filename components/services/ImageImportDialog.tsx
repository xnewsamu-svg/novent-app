"use client"

import { useState, useRef } from "react"
import { ImageUp, Loader2, X, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { ServiceImportItem } from "@/types/serviceImport"

type Step = "select" | "analyzing" | "review"

interface ImageImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (services: ServiceImportItem[]) => Promise<void>
}

export function ImageImportDialog({
  open,
  onOpenChange,
  onSave,
}: ImageImportDialogProps) {
  const [step, setStep] = useState<Step>("select")
  const [preview, setPreview] = useState<string | null>(null)
  const [services, setServices] = useState<ServiceImportItem[]>([])
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const fileDataRef = useRef<File | null>(null)

  const reset = () => {
    setStep("select")
    setPreview(null)
    setServices([])
    setSaving(false)
    fileDataRef.current = null
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      reset()
      onOpenChange(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ["image/jpeg", "image/png", "image/webp"]
    if (!allowed.includes(file.type)) {
      toast.error("Formato no válido. Usa JPEG, PNG o WebP")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen es demasiado grande. Máximo 10 MB")
      return
    }

    fileDataRef.current = file
    setPreview(URL.createObjectURL(file))
  }

  const handleAnalyze = async () => {
    if (!fileDataRef.current) return

    setStep("analyzing")

    const formData = new FormData()
    formData.append("image", fileDataRef.current)

    try {
      const res = await fetch("/api/services/import-image", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error al analizar la imagen")
      }

      if (!data.services || data.services.length === 0) {
        throw new Error("No se detectaron servicios en la imagen")
      }

      setServices(data.services.map((s: ServiceImportItem, i: number) => ({
        ...s,
        _key: `${i}-${s.name}`,
      })))
      setStep("review")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido"
      toast.error(msg)
      setStep("select")
    }
  }

  const updateService = (index: number, field: keyof ServiceImportItem, value: string | number) => {
    setServices((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const removeService = (index: number) => {
    setServices((prev) => prev.filter((_, i) => i !== index))
  }

  const addRow = () => {
    setServices((prev) => [...prev, { name: "", price: 0 }])
  }

  const handleSave = async () => {
    const valid = services.filter((s) => s.name.trim() && s.price > 0)
    if (valid.length === 0) {
      toast.error("Agrega al menos un servicio válido")
      return
    }

    setSaving(true)
    try {
      await onSave(valid)
      toast.success(`${valid.length} servicio(s) creado(s)`)
      reset()
      onOpenChange(false)
    } catch {
      toast.error("Error al guardar los servicios")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white">
            Importar servicios desde imagen
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-base">
            Subí una foto del cartel de precios y Novent extraerá los servicios automáticamente.
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4 mt-2">
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full rounded-2xl border border-zinc-800 max-h-64 object-contain bg-black/40"
                />
                <button
                  onClick={() => {
                    setPreview(null)
                    fileDataRef.current = null
                    if (fileRef.current) fileRef.current.value = ""
                  }}
                  className="absolute top-2 right-2 bg-zinc-900/80 rounded-full p-1.5 hover:bg-zinc-800 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-4 p-10 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 transition cursor-pointer bg-zinc-900/50">
                <ImageUp size={40} className="text-zinc-500" />
                <div className="text-center">
                  <p className="text-zinc-300 font-medium">Haz clic para seleccionar una imagen</p>
                  <p className="text-zinc-600 text-sm mt-1">JPEG, PNG o WebP — Máx 10 MB</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!fileDataRef.current}
              className="w-full bg-white text-black py-3 rounded-2xl font-bold text-sm hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ImageUp size={16} />
              Analizar imagen
            </button>
          </div>
        )}

        {step === "analyzing" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 size={32} className="animate-spin text-zinc-400" />
            <p className="text-zinc-300 font-medium">Analizando imagen...</p>
            <p className="text-zinc-600 text-sm">Extrayendo servicios con IA</p>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4 mt-2">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {services.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={s.name}
                    onChange={(e) => updateService(i, "name", e.target.value)}
                    placeholder="Nombre del servicio"
                    className="flex-1 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl text-sm outline-none focus:border-zinc-600"
                  />
                  <div className="relative w-28">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      value={s.price || ""}
                      onChange={(e) => updateService(i, "price", Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 pl-7 pr-3 py-2 rounded-xl text-sm outline-none focus:border-zinc-600"
                    />
                  </div>
                  <button
                    onClick={() => removeService(i)}
                    className="p-2 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addRow}
              className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 text-zinc-400 text-sm hover:border-zinc-500 hover:text-zinc-200 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              Agregar fila
            </button>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { reset(); onOpenChange(false) }}
                className="flex-1 py-3 rounded-2xl border border-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-900 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-white text-black py-3 rounded-2xl font-bold text-sm hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {saving ? "Guardando..." : `Guardar ${services.length} servicio(s)`}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
