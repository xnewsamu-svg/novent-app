"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { LogOut, ChevronDown, Settings, Building2, Mail, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { auth, db } from "@/lib/firebase"
import { startTokenRefresh, clearSession } from "@/lib/authToken"
import type { BusinessType } from "@/lib/types"
import { MODULES_BY_TYPE, type ModuleConfig } from "@/src/config/modules"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const BUSINESS_TYPE_OPTIONS: {
  type: BusinessType
  label: string
  icon: string
  desc: string
}[] = [
  { type: "restaurante", label: "Restaurante", icon: "🍽️", desc: "Inventario con stock, costos y reportes mensuales" },
  { type: "barberia", label: "Barbería", icon: "💇", desc: "Servicios + citas, integrado con ventas" },
  { type: "odontologia", label: "Odontología", icon: "🦷", desc: "Gestión de citas con calendario + automatización WhatsApp" },
  { type: "otro", label: "Otro", icon: "📋", desc: "Módulos base: clientes, ventas, WhatsApp" },
]

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {

  const pathname = usePathname()
  const router = useRouter()

  const [userEmail, setUserEmail] = useState("")
  const [userNombre, setUserNombre] = useState("")
  const [userCompany, setUserCompany] = useState("")
  const [companyId, setCompanyId] = useState("")
  const [businessType, setBusinessType] = useState<BusinessType | null>(null)
  const [expandedMenu, setExpandedMenu] = useState<string | null>(
    pathname.startsWith("/whatsapp") ? "whatsapp" : null,
  )

  const [showTypeDialog, setShowTypeDialog] = useState(false)
  const [savingType, setSavingType] = useState(false)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login")
        return
      }
      setUserEmail(u.email || "")

      try {
        const userDoc = await getDoc(doc(db, "users", u.uid))
        if (!userDoc.exists()) return

        const data = userDoc.data()
        setUserNombre(data.nombre || "")

        const cid = data.companyId
        if (!cid) return

        setCompanyId(cid)

        try {
          const companyDoc = await getDoc(doc(db, "companies", cid))
          if (companyDoc.exists()) {
            const cd = companyDoc.data()
            setUserCompany(cd.name || "")

            const bt = cd.businessType as BusinessType | undefined
            if (bt && ["restaurante", "barberia", "odontologia", "otro"].includes(bt)) {
              setBusinessType(bt)
            } else {
              setShowTypeDialog(true)
            }
          }
        } catch {
          // silent
        }
      } catch {
        // silent
      }
    })

    const unsubToken = startTokenRefresh()

    return () => {
      unsubAuth()
      unsubToken()
    }
  }, [router])

  const displayName = userNombre || userCompany || userEmail.split("@")[0] || "Usuario"

  const handleLogout = async () => {
    await signOut(auth)
    clearSession()
    router.push("/login")
  }

  const currentModules: ModuleConfig[] = businessType
    ? MODULES_BY_TYPE[businessType]
    : MODULES_BY_TYPE.otro

  const handleSelectBusinessType = async (type: BusinessType) => {
    if (!companyId) return
    setSavingType(true)
    try {
      await updateDoc(doc(db, "companies", companyId), {
        businessType: type,
      } as Record<string, unknown>)
      setBusinessType(type)
      setShowTypeDialog(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido"
      toast.error(`Error al guardar tipo de negocio: ${msg}`)
    } finally {
      setSavingType(false)
    }
  }

  const pageTitle =
    pathname === "/dashboard" ? "Dashboard" :
    pathname === "/clientes" ? "Clientes" :
    pathname === "/ventas" ? "Ventas" :
    pathname === "/inventario" ? "Inventario" :
    pathname === "/servicios" ? "Servicios" :
    pathname === "/citas" ? "Citas" :
    pathname.startsWith("/whatsapp") ? "WhatsApp" :
    pathname.startsWith("/automatizaciones") ? "Automatizaciones" :
    pathname === "/ajustes" ? "Ajustes" : "Dashboard"

  const renderNavItem = (item: ModuleConfig) => {
    const hasChildren = item.children && item.children.length > 0
    const isActive = hasChildren
      ? pathname === item.href || pathname.startsWith(item.href + "/")
      : pathname === item.href

    if (hasChildren) {
      const isExpanded = expandedMenu === item.id
      return (
        <div key={item.name}>
          <button
            onClick={() => setExpandedMenu(isExpanded ? null : item.id)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-sm font-medium
              ${isActive
                ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }
            `}
          >
            <span className="text-base">{item.icon}</span>
            <span className="flex-1 text-left">{item.name}</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              <Link
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium
                  ${pathname === item.href
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:text-white hover:bg-zinc-800/30"
                  }
                `}
              >
                <span className="w-1 h-1 rounded-full bg-current" />
                Dashboard
              </Link>
              {item.children!.map((child) => {
                const childActive = pathname === child.href
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`
                      flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium
                      ${childActive
                        ? "bg-white/10 text-white"
                        : "text-zinc-500 hover:text-white hover:bg-zinc-800/30"
                      }
                    `}
                  >
                    <span className="w-1 h-1 rounded-full bg-current" />
                    {child.name}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`
          group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-sm font-medium
          ${isActive
            ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          }
        `}
      >
        <span className="text-base">{item.icon}</span>
        {item.name}
      </Link>
    )
  }

  return (
    <div className="flex min-h-screen">

      {/* SIDEBAR */}

      <aside className="
        hidden
        md:flex
        w-72
        border-r
        border-zinc-800
        bg-zinc-950/80
        backdrop-blur-2xl
        p-6
        flex-col
        justify-between
        sticky
        top-0
        h-screen
      ">

        <div>

          {/* LOGO */}

          <div className="mb-10">

            <div className="flex items-center gap-3">

              <div className="
                w-10 h-10
                rounded-2xl
                bg-white text-black
                flex items-center justify-center
                font-black text-xl
              ">
                N
              </div>

              <h1 className="text-2xl font-black tracking-tight">
                Novent
              </h1>

            </div>

          </div>

          {/* NAV */}

          <nav className="space-y-2">
            {currentModules.map(renderNavItem)}
          </nav>

        </div>

        {/* FOOTER */}

        <div className="space-y-4">

          <div className="
            bg-zinc-900/60
            border border-zinc-800
            rounded-2xl px-4 py-3
          ">

            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
              Plan actual
            </p>

            <p className="text-sm font-semibold text-zinc-300 mt-1">
              Starter
            </p>

          </div>

          <button
            onClick={handleLogout}
            className="
              w-full flex items-center justify-center gap-2 py-3 rounded-2xl
              text-sm font-medium text-zinc-500
              hover:text-red-400 hover:bg-red-500/10
              transition-all duration-200
            "
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>

        </div>

      </aside>

      {/* MAIN */}

      <main className="
        flex-1 min-h-screen
        bg-gradient-to-b from-black via-zinc-950 to-black
      ">

        {/* TOPBAR */}

        <header className="
          sticky top-0 z-50 h-16
          border-b border-zinc-800/50
          bg-black/60 backdrop-blur-2xl
          px-6 flex items-center justify-between
        ">

          <div>
            <h2 className="text-lg font-semibold text-zinc-300">
              {pageTitle}
            </h2>
          </div>

          <div className="flex items-center gap-3">

            <DropdownMenu>

              <DropdownMenuTrigger asChild>

                <button className="
                  flex items-center gap-2 px-4 py-2 rounded-xl
                  bg-zinc-900 border border-zinc-800
                  hover:bg-zinc-800 hover:border-zinc-700
                  transition-all duration-200 cursor-pointer
                  text-sm font-medium
                ">

                  <div className="
                    w-7 h-7 rounded-lg
                    bg-gradient-to-br from-zinc-600 to-zinc-800
                    flex items-center justify-center
                    text-xs font-bold text-white
                  ">
                    {displayName.charAt(0).toUpperCase()}
                  </div>

                  <span className="text-white hidden sm:inline">
                    {displayName}
                  </span>

                  <ChevronDown size={14} className="text-zinc-500" />

                </button>

              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="
                  bg-zinc-950 border-zinc-800 text-white
                  w-64 rounded-2xl p-2 shadow-2xl
                "
              >

                <div className="px-3 py-3">
                  <p className="font-semibold text-sm">
                    {displayName}
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {userEmail || "Sin sesión"}
                  </p>
                </div>

                <DropdownMenuSeparator className="bg-zinc-800" />

                {userCompany && (
                  <DropdownMenuItem className="
                    text-zinc-400 text-sm
                    focus:bg-zinc-800 focus:text-white rounded-xl cursor-default
                  ">
                    <Building2 size={14} className="mr-3 text-zinc-600" />
                    {userCompany}
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={() => router.push("/ajustes")}
                  className="
                    text-zinc-400 text-sm
                    focus:bg-zinc-800 focus:text-white rounded-xl cursor-pointer
                  "
                >
                  <Settings size={14} className="mr-3 text-zinc-600" />
                  Configuración
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-zinc-800" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="
                    text-red-400 text-sm
                    focus:bg-red-500/10 focus:text-red-400 rounded-xl cursor-pointer
                  "
                >
                  <LogOut size={14} className="mr-3" />
                  Cerrar sesión
                </DropdownMenuItem>

              </DropdownMenuContent>

            </DropdownMenu>

          </div>

        </header>

        {/* CONTENT */}

        <div className="p-4 md:p-6">

          {children}

        </div>

      </main>

      {/* BUSINESS TYPE DIALOG (for companies without type) */}

      <Dialog
        open={showTypeDialog}
        onOpenChange={(open) => {
          if (!open) setShowTypeDialog(false)
        }}
      >
        <DialogContent
          className="bg-zinc-950 border-zinc-800 text-white max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white">
              ¿Qué tipo de negocio tienes?
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-base">
              Selecciona el tipo para mostrar los módulos adecuados. Puedes cambiarlo después desde Configuración.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {BUSINESS_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                onClick={() => handleSelectBusinessType(opt.type)}
                disabled={savingType}
                className={`
                  flex flex-col items-center gap-3 p-5 rounded-2xl border
                  transition-all duration-200 text-center
                  ${savingType
                    ? "opacity-50 cursor-not-allowed border-zinc-800"
                    : "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 cursor-pointer"
                  }
                `}
              >
                <span className="text-3xl">{opt.icon}</span>
                <div>
                  <p className="font-bold text-white">{opt.label}</p>
                  <p className="text-xs text-zinc-500 mt-1">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {savingType && (
            <div className="flex justify-center mt-4">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
