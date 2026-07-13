"use client"

import { getPasswordRequirements } from "@/src/lib/auth/validation"
import { Check, X } from "lucide-react"

interface PasswordStrengthIndicatorProps {
  password: string
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null

  const requirements = getPasswordRequirements(password)
  const metCount = requirements.filter((r) => r.valid).length
  const totalCount = requirements.length
  const strength = metCount === totalCount ? "strong" : metCount >= 3 ? "medium" : "weak"

  const barColor =
    strength === "strong"
      ? "bg-green-500"
      : strength === "medium"
        ? "bg-yellow-500"
        : "bg-red-500"

  return (
    <div className="space-y-2 transition-all duration-200">
      {/* Strength bar */}
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${barColor}`}
          style={{ width: `${(metCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Requirement list */}
      <ul className="space-y-1">
        {requirements.map((req) => (
          <li
            key={req.key}
            className="flex items-center gap-2 text-sm transition-all duration-200"
          >
            {req.valid ? (
              <Check
                size={14}
                className="text-green-500 shrink-0 transition-colors duration-200"
              />
            ) : (
              <X
                size={14}
                className="text-zinc-600 shrink-0 transition-colors duration-200"
              />
            )}
            <span
              className={`transition-colors duration-200 ${
                req.valid ? "text-green-400" : "text-zinc-500"
              }`}
            >
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
