"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getUserCompany } from "@/lib/getUserCompany"
import { toast } from "sonner"
import { Save, Loader2 } from "lucide-react"
import type { BusinessType } from "@/lib/types"
import { useCompanyType } from "@/src/hooks/useCompanyType"

const BUSINESS_TYPE_OPTIONS: {
  type: BusinessType
  label: string
  icon: string
  desc: string
  modules: string
}[] = [
  {
    type: "restaurante", label: "Restaurante", icon: "🍽️",
    desc: "Inventario con stock, costos y reportes mensuales",
    modules: "Dashboard, Clientes, Ventas, Inventario, WhatsApp, Automatizaciones",
  },
  {
    type: "barberia", label: "Barbería", icon: "💇",
    desc: "Catálogo de servicios + citas, integrado con ventas",
    modules: "Dashboard, Clientes, Ventas, Servicios, Citas, WhatsApp, Automatizaciones",
  },
  {
    type: "odontologia", label: "Odontología", icon: "🦷",
    desc: "Gestión de citas con calendario + automatización WhatsApp",
    modules: "Dashboard, Clientes, Ventas, Citas, WhatsApp, Automatizaciones",
  },
  {
    type: "otro", label: "Otro", icon: "📋",
    desc: "Módulos base: clientes, ventas, WhatsApp",
    modules: "Dashboard, Clientes, Ventas, WhatsApp, Automatizaciones",
  },
]

export default function AjustesPage() {
  const { businessType, companyId, loading } = useCompanyType()
  const [selected, setSelected] = useState<BusinessType>("otro")
  const [saving, setSaving] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!loading && businessType && !initialized) {
      setSelected(businessType)
      setInitialized(true)
    }
  }, [businessType, loading, initialized])

  const handleSave = async () => {
    if (!companyId) return
    if (selected === businessType) {
      toast.info("El tipo de negocio ya está seleccionado")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/company/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: selected }),
      })
      if (!res.ok) throw new Error("Error al guardar")
      toast.success("Tipo de negocio actualizado", {
        description: "Los cambios se reflejarán al recargar la página",
      })
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-white flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="p-6 text-white max-w-3xl space-y-8">

      <div>
        <h1 className="text-5xl font-black tracking-tight">Ajustes</h1>
        <p className="text-zinc-400 mt-2">Configuración de tu negocio</p>
      </div>

      {/* BUSINESS TYPE */}

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Tipo de negocio</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Esto determina qué módulos están disponibles en tu panel.
            Al cambiar, algunos módulos se ocultarán o aparecerán.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BUSINESS_TYPE_OPTIONS.map((opt) => {
            const isSelected = selected === opt.type
            return (
              <button
                key={opt.type}
                onClick={() => setSelected(opt.type)}
                className={`
                  flex flex-col items-start gap-3 p-5 rounded-2xl border text-left
                  transition-all duration-200 cursor-pointer
                  ${isSelected
                    ? "border-white bg-zinc-800 ring-1 ring-white/20"
                    : "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{opt.icon}</span>
                  <div>
                    <p className={`font-bold text-lg ${isSelected ? "text-white" : "text-zinc-300"}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">{opt.desc}</p>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-600 leading-relaxed mt-1">
                  Módulos: {opt.modules}
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-800">
          <button
            onClick={handleSave}
            disabled={saving || selected === businessType}
            className="bg-white text-black px-8 py-3.5 rounded-2xl font-bold text-sm hover:bg-zinc-200 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

    </div>
  )
}
