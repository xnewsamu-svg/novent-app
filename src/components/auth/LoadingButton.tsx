"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"

interface LoadingButtonProps {
  loading: boolean
  disabled?: boolean
  loadingText: string
  onClick: () => void
  children: ReactNode
  className?: string
}

export function LoadingButton({
  loading,
  disabled = false,
  loadingText,
  onClick,
  children,
  className = "",
}: LoadingButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`
        w-full
        bg-white
        text-black
        py-3.5
        rounded-2xl
        font-bold
        text-sm
        flex
        items-center
        justify-center
        gap-2
        hover:bg-zinc-200
        transition-all
        duration-200
        disabled:opacity-50
        disabled:cursor-not-allowed
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-zinc-400
        focus-visible:ring-offset-2
        focus-visible:ring-offset-black
        ${className}
      `}
    >
      {loading && <Loader2 size={16} className="animate-spin shrink-0" />}
      {loading ? loadingText : children}
    </button>
  )
}
