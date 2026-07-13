"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

import {
  createUserWithEmailAndPassword,
  deleteUser,
} from "firebase/auth"

import { auth } from "@/lib/firebase"
import { saveSession } from "@/lib/authToken"
import { translateAuthError } from "@/src/lib/auth/auth-error-messages"
import {
  validateEmail,
  isPasswordValid,
  validateConfirmPassword,
} from "@/src/lib/auth/validation"

import { useCapsLock } from "@/src/lib/auth/use-caps-lock"

import { FormField } from "@/src/components/auth/FormField"
import { PasswordInput } from "@/src/components/auth/PasswordInput"
import { PasswordStrengthIndicator } from "@/src/components/auth/PasswordStrengthIndicator"
import { CompanyAvailability } from "@/src/components/auth/CompanyAvailability"
import { LoadingButton } from "@/src/components/auth/LoadingButton"
import { CapsLockWarning } from "@/src/components/auth/CapsLockWarning"

import { toast } from "sonner"

import {
  Building2,
  Mail,
  ArrowRight,
  Shield,
  LogIn,
} from "lucide-react"

import type { BusinessType } from "@/lib/types"

const BUSINESS_TYPE_OPTIONS: {
  type: BusinessType
  label: string
  icon: string
  desc: string
}[] = [
  { type: "restaurante", label: "Restaurante", icon: "🍽️", desc: "Inventario con stock y costos" },
  { type: "barberia", label: "Barbería", icon: "💇", desc: "Servicios + citas, integrado con ventas" },
  { type: "odontologia", label: "Odontología", icon: "🦷", desc: "Gestión de citas con calendario" },
  { type: "otro", label: "Otro", icon: "📋", desc: "Módulos base: clientes, ventas, WhatsApp" },
]

export default function SignupPage() {

  const router = useRouter()

  const [companyName, setCompanyName] = useState("")
  const [businessType, setBusinessType] = useState<BusinessType | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [companyAvailable, setCompanyAvailable] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())
  const [emailAlreadyInUse, setEmailAlreadyInUse] = useState(false)

  const companyRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  const { capsLock, onKeyDown: onCapsKeyDown, onKeyUp: onCapsKeyUp } = useCapsLock()

  const markTouched = (field: string) => {
    setTouchedFields((prev) => {
      if (prev.has(field)) return prev
      return new Set(prev).add(field)
    })
  }

  const emailError = email ? validateEmail(email) : null
  const passwordValid = !password || isPasswordValid(password)
  const confirmError = confirmPassword
    ? validateConfirmPassword(password, confirmPassword)
    : null

  const showEmailError = touchedFields.has("email") && emailError !== null
  const showConfirmError = touchedFields.has("confirmPassword") && confirmError !== null
  const companyNameMinLength = companyName.trim().length >= 2

  const canSubmit =
    !loading &&
    companyName.trim().length >= 2 &&
    !!businessType &&
    email.trim().length > 0 &&
    !emailError &&
    password.length >= 1 &&
    passwordValid &&
    confirmPassword.length > 0 &&
    !confirmError &&
    companyAvailable !== false

  const handleAvailabilityChange = useCallback(
    (available: boolean | null) => {
      setCompanyAvailable(available)
    },
    [],
  )

  const handleResetEmailInUse = () => {
    setEmailAlreadyInUse(false)
  }

  const handleSignup = async () => {
    try {
      setLoading(true)

      const name = companyName.trim() || "Mi Empresa"

      if (!email.trim() || !password || !confirmPassword) {
        if (!email.trim()) emailRef.current?.focus()
        else if (!password) passwordRef.current?.focus()
        else confirmRef.current?.focus()
        toast.error("Completa todos los campos")
        setLoading(false)
        return
      }

      if (!isPasswordValid(password)) {
        passwordRef.current?.focus()
        toast.error("La contraseña no cumple los requisitos de seguridad")
        setLoading(false)
        return
      }

      if (password !== confirmPassword) {
        confirmRef.current?.focus()
        toast.error("Las contraseñas no coinciden")
        setLoading(false)
        return
      }

      // =========================
      // CHECK COMPANY NAME FIRST (antes de crear Auth user)
      // =========================
      const res = await fetch(
        `/api/company/check-name?name=${encodeURIComponent(name)}`,
      )
      if (!res.ok) {
        throw new Error("Error verificando disponibilidad del nombre")
      }
      const { available } = await res.json()
      if (!available) {
        throw { customCode: "company/name-taken" }
      }

      // =========================
      // CREATE AUTH USER
      // =========================
      const userCred =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        )

      const user = userCred.user

      try {
        // =========================
        // CREATE COMPANY + USER DOCS VIA API
        // =========================
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.uid,
            companyName: name,
            businessType: businessType ?? "otro",
            email,
          }),
        })

        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error ?? "Error al crear empresa")
        }
      } catch (err) {
        // Si falla la creación de empresa/documentos, eliminar el Auth user
        try { await deleteUser(user) } catch { /* el cleanup no debe fallar */ }
        throw err
      }

      // 🔥 crea sesión para middleware
      await saveSession()

      toast.success("Empresa creada correctamente", {
        description: "Estamos preparando tu espacio de trabajo...",
      })

      router.push("/dashboard")

    } catch (err: unknown) {
      console.error(err)
      const isEmailInUse =
        typeof err === "object" &&
        err !== null &&
        (err as Record<string, unknown>).code === "auth/email-already-in-use"

      if (isEmailInUse) {
        setEmailAlreadyInUse(true)
      } else {
        const { title, message } = translateAuthError(err)
        toast.error(title, { description: message })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    onCapsKeyDown(e)
    if (e.key === "Enter" && !loading && canSubmit) {
      handleSignup()
    }
  }

  return (
    <div className="
      min-h-screen
      bg-black
      text-white
      flex
      items-center
      justify-center
      relative
      overflow-hidden
    ">

      {/* Background glow */}
      <div className="
        absolute
        top-1/2
        left-1/2
        -translate-x-1/2
        -translate-y-1/2
        w-[600px]
        h-[600px]
        bg-green-500/5
        rounded-full
        blur-[150px]
        pointer-events-none
      " />

      <div className="
        relative
        w-full
        max-w-[420px]
        mx-4
        py-8
      ">

        <div className="
          bg-zinc-950/90
          backdrop-blur-2xl
          border
          border-zinc-800
          rounded-[32px]
          p-8
          md:p-10
          shadow-2xl
        ">

          {/* Logo */}
          <div className="
            flex
            items-center
            gap-3
            mb-8
          ">

            <div className="
              w-10
              h-10
              rounded-2xl
              bg-white
              text-black
              flex
              items-center
              justify-center
              font-black
              text-xl
            ">
              N
            </div>

            <div>
              <h1 className="
                text-xl
                font-black
              ">
                Novent
              </h1>
            </div>

          </div>

          {/* Title */}
          <div className="mb-8">

            <h2 className="
              text-3xl
              font-black
              tracking-tight
            ">
              Crear cuenta
            </h2>

            <p className="
              text-zinc-500
              text-sm
              mt-2
              leading-relaxed
            ">
              Comienza a gestionar tu negocio de forma inteligente.
            </p>

          </div>

          {emailAlreadyInUse ? (
            <div className="space-y-6 text-center">
              <div className="
                w-16 h-16
                rounded-full
                bg-red-500/10
                border border-red-500/20
                flex items-center justify-center
                mx-auto
              ">
                <Mail className="text-red-400" size={24} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">
                  Correo ya registrado
                </h3>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  El correo <span className="text-zinc-200 font-semibold">{email}</span> ya tiene una cuenta en Novent.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="
                    w-full
                    bg-white
                    text-black
                    rounded-2xl
                    py-3.5
                    text-sm
                    font-semibold
                    flex
                    items-center
                    justify-center
                    gap-2
                    hover:bg-zinc-200
                    transition-colors
                    duration-200
                    cursor-pointer
                  "
                >
                  <LogIn size={16} />
                  Iniciar sesión
                </button>

                <button
                  type="button"
                  onClick={handleResetEmailInUse}
                  className="
                    w-full
                    bg-transparent
                    text-zinc-500
                    rounded-2xl
                    py-3
                    text-sm
                    hover:text-zinc-300
                    transition-colors
                    duration-200
                    cursor-pointer
                  "
                >
                  Usar otro correo
                </button>
              </div>
            </div>
          ) : (
            <div
              className="space-y-5"
              onKeyDown={handleKeyDown}
              onKeyUp={onCapsKeyUp}
            >

              <FormField
                label="Nombre del negocio"
                htmlFor="signup-company"
                error={null}
              >
                <div className="relative">
                  <Building2 className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-zinc-600
                    pointer-events-none
                  " size={16} />

                  <input
                    ref={companyRef}
                    id="signup-company"
                    type="text"
                    aria-label="Nombre del negocio"
                    aria-invalid={companyAvailable === false}
                    className={`
                      w-full
                      bg-black/40
                      border
                      rounded-2xl
                      px-4
                      py-3.5
                      pl-11
                      text-sm
                      outline-none
                      transition-all
                      duration-200
                      focus:bg-black/60
                      placeholder:text-zinc-700
                      ${companyAvailable === false ? "border-red-500/50 focus:border-red-500" : "border-zinc-800 focus:border-zinc-600"}
                    `}
                    placeholder="Ej: Barbería Central"
                    value={companyName}
                    onChange={(e) => {
                      const next = e.target.value.replace(/\s{2,}/g, " ")
                      setCompanyName(next)
                    }}
                    onBlur={() => {
                      setCompanyName((prev) => prev.trim())
                    }}
                    autoComplete="organization"
                    autoFocus
                  />
                </div>

                <CompanyAvailability
                  name={companyName}
                  onAvailabilityChange={handleAvailabilityChange}
                />
              </FormField>

              {/* BUSINESS TYPE SELECTOR */}

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">
                  Tipo de negocio
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BUSINESS_TYPE_OPTIONS.map((opt) => {
                    const selected = businessType === opt.type
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => setBusinessType(opt.type)}
                        className={`
                          flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer
                          ${selected
                            ? "border-white bg-zinc-900"
                            : "border-zinc-800 bg-black/40 hover:border-zinc-600"
                          }
                        `}
                      >
                        <span className="text-2xl">{opt.icon}</span>
                        <div>
                          <p className={`text-sm font-bold ${selected ? "text-white" : "text-zinc-400"}`}>
                            {opt.label}
                          </p>
                          <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">
                            {opt.desc}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <FormField
                label="Email"
                htmlFor="signup-email"
                error={showEmailError ? emailError : null}
              >
                <div className="relative">
                  <Mail className="
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-zinc-600
                    pointer-events-none
                  " size={16} />

                  <input
                    ref={emailRef}
                    id="signup-email"
                    type="email"
                    aria-label="Correo electrónico"
                    aria-invalid={!!emailError}
                    className={`
                      w-full
                      bg-black/40
                      border
                      rounded-2xl
                      px-4
                      py-3.5
                      pl-11
                      text-sm
                      outline-none
                      transition-all
                      duration-200
                      focus:bg-black/60
                      placeholder:text-zinc-700
                      ${showEmailError ? "border-red-500/50 focus:border-red-500" : "border-zinc-800 focus:border-zinc-600"}
                    `}
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.replace(/\s/g, ""))}
                    onBlur={() => {
                      markTouched("email")
                      setEmail((prev) => prev.trim())
                    }}
                    autoComplete="email"
                  />
                </div>
              </FormField>

              <FormField
                label="Contraseña"
                htmlFor="signup-password"
                error={null}
              >
                <PasswordInput
                  ref={passwordRef}
                  id="signup-password"
                  aria-label="Contraseña"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => markTouched("password")}
                  onKeyDown={onCapsKeyDown}
                  onKeyUp={onCapsKeyUp}
                  autoComplete="new-password"
                  error={null}
                />

                <PasswordStrengthIndicator password={password} />
                <CapsLockWarning active={capsLock} />
              </FormField>

              <FormField
                label="Confirmar contraseña"
                htmlFor="signup-confirm"
                error={showConfirmError ? confirmError : null}
              >
                <PasswordInput
                  ref={confirmRef}
                  id="signup-confirm"
                  aria-label="Confirmar contraseña"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => markTouched("confirmPassword")}
                  onKeyDown={onCapsKeyDown}
                  onKeyUp={onCapsKeyUp}
                  onPaste={(e) => e.preventDefault()}
                  autoComplete="new-password"
                  error={showConfirmError ? confirmError : null}
                />
              </FormField>

              <LoadingButton
                loading={loading}
                disabled={!canSubmit}
                loadingText="Creando cuenta..."
                onClick={handleSignup}
              >
                Crear cuenta
                <ArrowRight size={16} />
              </LoadingButton>

            </div>
          )}

          {/* Login link */}
          <div className="
            mt-6
            text-center
          ">

            <button
              type="button"
              onClick={() => router.push("/login")}
              aria-label="Iniciar sesión"
              className="
                text-zinc-500
                text-sm
                hover:text-white
                transition-colors
                duration-200
                cursor-pointer
                focus-visible:outline-none
                focus-visible:text-white
              "
            >
              ¿Ya tienes cuenta? <span className="font-semibold text-zinc-300 hover:text-white">Iniciar sesión</span>
            </button>

          </div>

          {/* Footer */}
          <div className="
            mt-8
            pt-6
            border-t
            border-zinc-800/50
            flex
            items-center
            justify-center
            gap-2
            text-zinc-600
            text-xs
          ">
            <Shield size={12} />
            Seguridad Firebase
          </div>

        </div>

      </div>

    </div>
  )
}
