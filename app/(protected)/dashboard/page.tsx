"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { ShoppingCart, TrendingUp, Loader2 } from "lucide-react"

import type { BusinessType } from "@/lib/types"

import { useAuth } from "@/hooks/useAuth"
import { getUserCompany } from "@/lib/getUserCompany"
import { useDashboardData } from "@/src/hooks/useDashboardData"

import { WhatsAppMetrics } from "./whatsapp-metrics"
import { TodaysLeads } from "./todays-leads"
import { DlqWidget } from "./dlq-widget"
import { DashboardHeader } from "./dashboard-header"
import { OnboardingCards } from "./onboarding-cards"
import { DashboardStats } from "./dashboard-stats"
import { DashboardCharts } from "./dashboard-charts"
import { RecentSalesFeed } from "./recent-sales-feed"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [authReady, setAuthReady] = useState(false)
  const [nombre, setNombre] = useState<string | null>(null)
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [companyId, setCompanyId] = useState("")
  const [showCompanyDialog, setShowCompanyDialog] = useState(false)
  const [companyNameInput, setCompanyNameInput] = useState("")
  const [companyTypeInput, setCompanyTypeInput] = useState<BusinessType>("otro")
  const [creatingCompany, setCreatingCompany] = useState(false)

  const { ventas, clientes, campaigns, citas, loading: dataLoading, error: dataError } = useDashboardData(companyId)

  // =========================
  // AUTH BOOTSTRAP
  // =========================

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }

    const init = async () => {
      try {
        const userData = await getUserCompany(user.uid)
        if (userData) {
          setCompanyId(userData.companyId)
          if (userData.nombre) {
            setNombre(userData.nombre)
          } else {
            setShowNameDialog(true)
            setNameInput(user.displayName || user.email?.split("@")[0] || "")
          }
        } else {
          setShowCompanyDialog(true)
        }
      } catch {
        setShowCompanyDialog(true)
      }
      setAuthReady(true)
    }

    init()
  }, [user, authLoading, router])

  // =========================
  // KPIs
  // =========================

  const totalIngresos = ventas.reduce((acc, v) => acc + (v.precio || 0), 0)

  const today = new Date().toISOString().split("T")[0]

  const ingresosHoy = ventas
    .filter((v) => v.fecha === today)
    .reduce((acc, v) => acc + (v.precio || 0), 0)

  const totalVentas = ventas.length
  const totalClientes = clientes.length

  const citasPendientes = citas.filter((c) => c.estado === "pendiente" || c.estado === "confirmada")
  const ingresosEsperados = citasPendientes.reduce((acc, c) => acc + (c.precio || 0), 0)

  const isEmpty = ventas.length === 0
  const isFresh = ventas.length === 0 && clientes.length === 0

  // =========================
  // CHARTS DATA
  // =========================

  const ventasPorServicio = useMemo(() => {
    const grouped: Record<string, number> = {}
    ventas.forEach((v) => {
      grouped[v.servicio] = (grouped[v.servicio] || 0) + v.precio
    })
    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value,
    }))
  }, [ventas])

  const ventasPorDia = useMemo(() => {
    const grouped: Record<string, number> = {}
    ventas.forEach((v) => {
      grouped[v.fecha] = (grouped[v.fecha] || 0) + v.precio
    })

    const dias: { fecha: string; total: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const fecha = d.toISOString().split("T")[0]
      dias.push({ fecha, total: grouped[fecha] || 0 })
    }
    return dias
  }, [ventas])

  // =========================
  // SAVE NAME
  // =========================

  const handleSaveName = async () => {
    if (!nameInput.trim()) return
    setSavingName(true)
    try {
      const res = await fetch("/api/users/name", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nameInput.trim() }),
      })
      if (!res.ok) throw new Error("Error al guardar nombre")
      setNombre(nameInput.trim())
      setShowNameDialog(false)
    } catch {
      console.error("Error al guardar nombre")
    } finally {
      setSavingName(false)
    }
  }

  // =========================
  // DISPLAY NAME
  // =========================

  const displayName = nombre || user?.email?.split("@")[0] || "Usuario"

  // =========================
  // ONBOARDING COMPANY (orphan users)
  // =========================

  const handleCreateCompany = async () => {
    if (!companyNameInput.trim() || !user) return
    setCreatingCompany(true)
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          companyName: companyNameInput.trim(),
          businessType: companyTypeInput,
          email: user.email,
        }),
      })
      if (!res.ok) throw new Error("Error al crear empresa")
      const data = await res.json()
      setCompanyId(data.companyId)
      setShowCompanyDialog(false)
      setShowNameDialog(true)
      setNameInput(user.displayName || user.email?.split("@")[0] || "")
    } catch {
      // silent
    } finally {
      setCreatingCompany(false)
    }
  }

  // =========================
  // LOADING
  // =========================

  const loading = authLoading || !authReady || (!!companyId && dataLoading)

  if (loading) {
    return (
      <div className="p-6 text-white">
        Cargando dashboard...
      </div>
    )
  }

  if (dataError) {
    return (
      <div className="p-6 text-white">
        <div className="rounded-2xl border border-red-800 bg-red-950/50 p-6">
          <p className="font-semibold text-red-400">Error al cargar datos</p>
          <p className="text-zinc-400 text-sm mt-1">{dataError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-zinc-300 hover:text-white underline transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // =========================
  // UI
  // =========================

  return (
    <div className="relative overflow-hidden min-h-screen p-6 space-y-8 text-white">
      {/* BACKGROUND EFFECT */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* HEADER */}
      <DashboardHeader isFresh={isFresh} displayName={displayName} isEmpty={isEmpty} />

      {/* ONBOARDING */}
      {isFresh && <OnboardingCards />}

      {/* EMPTY SALES STATE */}
      {isEmpty && !isFresh && (
        <div className="relative z-10 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={28} className="text-zinc-500" />
          </div>
          <h3 className="text-xl font-bold text-zinc-300">No hay ventas todavía</h3>
          <p className="text-zinc-500 mt-2 max-w-md mx-auto">
            Una vez que registres tu primera venta, aquí aparecerán las estadísticas y gráficos de tu negocio.
          </p>
          <Link
            href="/ventas"
            className="inline-flex items-center gap-2 mt-6 bg-white text-black px-6 py-3 rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all"
          >
            <ShoppingCart size={16} />
            Registrar primera venta
          </Link>
        </div>
      )}

      {/* STATS */}
      <DashboardStats
        ingresosHoy={ingresosHoy}
        totalIngresos={totalIngresos}
        totalClientes={totalClientes}
        totalVentas={totalVentas}
        citasPendientes={citasPendientes.length}
        ingresosEsperados={ingresosEsperados}
      />

      {/* CHARTS */}
      {!isEmpty && (
        <DashboardCharts
          ventasPorDia={ventasPorDia}
          ventasPorServicio={ventasPorServicio}
        />
      )}

      {/* WHATSAPP METRICS */}
      <div className="relative z-10 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">WhatsApp</h2>
          <p className="text-zinc-500 text-sm mt-1">Métricas de campañas</p>
        </div>
        <WhatsAppMetrics campaigns={campaigns} />
      </div>

      {/* CITAS DEL DÍA */}
      <div className="relative z-10 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Citas del día</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Leads recibidos por WhatsApp hoy
          </p>
        </div>
        <TodaysLeads companyId={companyId} />
      </div>

      {/* DLQ WIDGET */}
      <div className="relative z-10 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-100">Jobs fallidos</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Errores recientes en la cola de mensajes
          </p>
        </div>
        <DlqWidget companyId={companyId} />
      </div>

      {/* LIVE FEED */}
      <RecentSalesFeed ventas={ventas} isEmpty={isEmpty} />

      {/* COMPANY ONBOARDING DIALOG (orphan users) */}
      <Dialog
        open={showCompanyDialog}
        onOpenChange={(open) => {
          if (!open && companyId) setShowCompanyDialog(false)
        }}
      >
        <DialogContent
          className="bg-zinc-950 border-zinc-800 text-white max-w-sm"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white">
              Crea tu empresa
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-base">
              Para comenzar, necesitas crear una empresa. Es el espacio donde
              gestionarás tu negocio.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Tipo de negocio
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { type: "restaurante" as const, label: "🍽️ Restaurante" },
                { type: "barberia" as const, label: "💇 Barbería" },
                { type: "odontologia" as const, label: "🦷 Odontología" },
                { type: "otro" as const, label: "📋 Otro" },
              ]).map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setCompanyTypeInput(opt.type)}
                  className={`
                    px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer
                    ${companyTypeInput === opt.type
                      ? "border-white bg-zinc-800 text-white"
                      : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateCompany}
              disabled={!companyNameInput.trim() || creatingCompany}
              className="w-full bg-white text-black hover:bg-zinc-200 h-11 text-base font-bold"
            >
              {creatingCompany ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creando...</>
              ) : (
                "Crear empresa"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NAME DIALOG */}
      <Dialog
        open={showNameDialog}
        onOpenChange={(open) => {
          if (!open && nombre) setShowNameDialog(false)
        }}
      >
        <DialogContent
          className="bg-zinc-950 border-zinc-800 text-white max-w-sm"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white">
              ¡Bienvenido a Novent!
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-base">
              Cuéntanos cómo te llamas para personalizar tu experiencia.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !savingName) handleSaveName()
            }}
            placeholder="Tu nombre"
            className="bg-black/40 border-zinc-800 text-white h-12 text-base px-4"
            autoFocus
          />
          <DialogFooter>
            <Button
              onClick={handleSaveName}
              disabled={!nameInput.trim() || savingName}
              className="w-full bg-white text-black hover:bg-zinc-200 h-11 text-base font-bold"
            >
              {savingName ? "Guardando..." : "Comenzar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
