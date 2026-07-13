"use client"

import { useEffect, useState, useRef } from "react"
import { Loader2, Check, X, AlertTriangle } from "lucide-react"

type AsyncStatus =
  | "idle"
  | "available"
  | "unavailable"
  | "error"

interface CompanyAvailabilityProps {
  name: string
  onAvailabilityChange: (available: boolean | null) => void
}

export function CompanyAvailability({
  name,
  onAvailabilityChange,
}: CompanyAvailabilityProps) {
  const trimmed = name.trim()
  const [asyncStatus, setAsyncStatus] = useState<AsyncStatus>("idle")

  const status: "idle" | "too-short" | "checking" | "available" | "unavailable" | "error" =
    !trimmed ? "idle"
    : trimmed.length < 2 ? "too-short"
    : asyncStatus === "idle" ? "checking"
    : asyncStatus

  useEffect(() => {
    if (!trimmed || trimmed.length < 2) {
      onAvailabilityChange(null)
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/company/check-name?name=${encodeURIComponent(trimmed)}`
        )
        if (!res.ok) {
          setAsyncStatus("error")
          onAvailabilityChange(null)
          return
        }
        const data = await res.json()
        const available = data.available === true
        setAsyncStatus(available ? "available" : "unavailable")
        onAvailabilityChange(available ? true : false)
      } catch {
        setAsyncStatus("error")
        onAvailabilityChange(null)
      }
    }, 500)

    return () => {
      clearTimeout(timer)
    }
  }, [trimmed, onAvailabilityChange])

  if (status === "idle") return null

  return (
    <div className="flex items-center gap-1.5 text-xs transition-all duration-200">
      {status === "too-short" && (
        <>
          <X size={12} className="text-zinc-600 shrink-0" />
          <span className="text-zinc-500">Mínimo 2 caracteres</span>
        </>
      )}

      {status === "checking" && (
        <>
          <Loader2 size={12} className="animate-spin text-zinc-500 shrink-0" />
          <span className="text-zinc-500">Verificando disponibilidad...</span>
        </>
      )}

      {status === "available" && (
        <>
          <Check size={12} className="text-green-500 shrink-0" />
          <span className="text-green-400">Disponible</span>
        </>
      )}

      {status === "unavailable" && (
        <>
          <X size={12} className="text-red-500 shrink-0" />
          <span className="text-red-400">Nombre ya registrado</span>
        </>
      )}

      {status === "error" && (
        <>
          <AlertTriangle size={12} className="text-yellow-500 shrink-0" />
          <span className="text-yellow-400">No pudimos verificar</span>
        </>
      )}
    </div>
  )
}
