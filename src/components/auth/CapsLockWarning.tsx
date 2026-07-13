"use client"

import { AlertTriangle } from "lucide-react"

interface CapsLockWarningProps {
  active: boolean
}

export function CapsLockWarning({ active }: CapsLockWarningProps) {
  if (!active) return null

  return (
    <div
      className="
        flex
        items-center
        gap-1.5
        text-xs
        text-yellow-500
        transition-all
        duration-200
      "
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle size={12} className="shrink-0" />
      Bloq Mayús está activado.
    </div>
  )
}
