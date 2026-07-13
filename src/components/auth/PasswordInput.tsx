"use client"

import { useState, forwardRef, type InputHTMLAttributes } from "react"
import { Eye, EyeOff } from "lucide-react"

interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "error"> {
  error?: string | null
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(props, ref) {
    const { error, className = "", ...rest } = props
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className="relative">
        <input
          ref={ref}
          type={showPassword ? "text" : "password"}
          aria-invalid={!!error}
          className={`
            w-full
            bg-black/40
            border
            rounded-2xl
            px-4
            py-3.5
            pr-12
            text-sm
            outline-none
            transition-all
            duration-200
            focus:bg-black/60
            placeholder:text-zinc-700
            ${error ? "border-red-500/50 focus:border-red-500" : "border-zinc-800 focus:border-zinc-600"}
            ${className}
          `}
          {...rest}
        />

        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="
            absolute
            right-4
            top-1/2
            -translate-y-1/2
            text-zinc-600
            hover:text-zinc-400
            transition-colors
            duration-200
            cursor-pointer
            focus-visible:outline-none
            focus-visible:text-zinc-300
          "
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    )
  },
)

PasswordInput.displayName = "PasswordInput"
