"use client"

import { type ReactNode, useId } from "react"

interface FormFieldProps {
  label: string
  htmlFor: string
  error: string | null
  children: ReactNode
  className?: string
}

export function FormField({
  label,
  htmlFor,
  error,
  children,
  className = "",
}: FormFieldProps) {
  const errorId = useId()

  return (
    <div className={`space-y-2 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="
          text-xs
          text-zinc-500
          font-medium
          uppercase
          tracking-wider
          block
        "
      >
        {label}
      </label>

      {children}

      <div
        id={errorId}
        role="alert"
        aria-live="polite"
        className={`
          overflow-hidden
          transition-all
          duration-200
          ease-out
          ${error ? "max-h-10 opacity-100 mt-1" : "max-h-0 opacity-0"}
        `}
      >
        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <span className="shrink-0">✕</span>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
