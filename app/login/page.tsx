"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "firebase/auth"

import { auth } from "@/lib/firebase"
import { saveSession } from "@/lib/authToken"
import { translateAuthError } from "@/src/lib/auth/auth-error-messages"
import { validateEmail } from "@/src/lib/auth/validation"
import { rememberEmail } from "@/src/lib/auth/remember-email"
import { useCapsLock } from "@/src/lib/auth/use-caps-lock"

import { FormField } from "@/src/components/auth/FormField"
import { PasswordInput } from "@/src/components/auth/PasswordInput"
import { LoadingButton } from "@/src/components/auth/LoadingButton"
import { CapsLockWarning } from "@/src/components/auth/CapsLockWarning"

import { toast } from "sonner"

import {
  ArrowRight,
  Shield,
  X,
  Mail,
} from "lucide-react"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState(() => rememberEmail.load() ?? "")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())
  const [initialCheckDone, setInitialCheckDone] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const resetEmailRef = useRef<HTMLInputElement>(null)

  const { capsLock, onKeyDown: onCapsKeyDown, onKeyUp: onCapsKeyUp } = useCapsLock()

  const markTouched = (field: string) => {
    setTouchedFields((prev) => {
      if (prev.has(field)) return prev
      return new Set(prev).add(field)
    })
  }

  const emailError = email ? validateEmail(email) : null
  const showEmailError = touchedFields.has("email") && emailError !== null
  const canSubmit = !loading && !emailError && email.trim() && password

  useEffect(() => {
    const check = async () => {
      const user = auth.currentUser
      if (user) {
        await saveSession()
        router.push("/dashboard")
      }
      setInitialCheckDone(true)
    }
    check()
  }, [router])

  const handleLogin = async () => {
    try {
      setLoading(true)

      if (!email.trim() || !password) {
        if (!email.trim()) emailRef.current?.focus()
        else passwordRef.current?.focus()
        toast.error("Completa todos los campos")
        setLoading(false)
        return
      }

      await signInWithEmailAndPassword(auth, email, password)
      rememberEmail.save(email)
      await saveSession()
      router.push("/dashboard")
    } catch (err: unknown) {
      console.error(err)
      const { title, message } = translateAuthError(err)
      toast.error(title, { description: message })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = useCallback(async () => {
    try {
      setResetLoading(true)

      if (!resetEmail.trim()) {
        const err = translateAuthError({
          code: "auth/invalid-email",
        } as Record<string, unknown>)
        toast.error(err.title, { description: err.message })
        return
      }

      await sendPasswordResetEmail(auth, resetEmail.trim())

      toast.success("Correo enviado", {
        description:
          "Te enviamos un correo para restablecer tu contraseña. Revisa también la carpeta de spam.",
      })
      setShowForgotPassword(false)
      setResetEmail("")
    } catch (err: unknown) {
      console.error(err)
      const { title, message } = translateAuthError(err)
      toast.error(title, { description: message })
    } finally {
      setResetLoading(false)
    }
  }, [resetEmail])

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    onCapsKeyDown(e)
    if (e.key === "Enter" && !loading) {
      handleLogin()
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
              Iniciar sesión
            </h2>

            <p className="
              text-zinc-500
              text-sm
              mt-2
              leading-relaxed
            ">
              Sistema inteligente para gestionar clientes, ventas e inventario.
            </p>

          </div>

          {/* Form */}
          <div
            className="space-y-5"
            onKeyDown={handleFormKeyDown}
            onKeyUp={onCapsKeyUp}
          >

            <FormField
              label="Email"
              htmlFor="login-email"
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
                  id="login-email"
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
                  autoFocus
                />
              </div>
            </FormField>

            <FormField
              label="Contraseña"
              htmlFor="login-password"
              error={null}
            >
              <PasswordInput
                ref={passwordRef}
                id="login-password"
                aria-label="Contraseña"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => markTouched("password")}
                onKeyDown={onCapsKeyDown}
                onKeyUp={onCapsKeyUp}
                autoComplete="current-password"
                error={null}
              />
              <CapsLockWarning active={capsLock} />
            </FormField>

            {/* Forgot password */}
            <div className="
              flex
              justify-end
              -mt-2
            ">
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email)
                  setShowForgotPassword(true)
                }}
                aria-label="Recuperar contraseña"
                className="
                  text-xs
                  text-zinc-600
                  hover:text-zinc-400
                  transition-colors
                  duration-200
                  cursor-pointer
                  focus-visible:outline-none
                  focus-visible:text-zinc-300
                "
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <LoadingButton
              loading={loading}
              disabled={!canSubmit}
              loadingText="Ingresando..."
              onClick={handleLogin}
            >
              Iniciar sesión
              <ArrowRight size={16} />
            </LoadingButton>

          </div>

          {/* Signup link */}
          <div className="
            mt-6
            text-center
          ">

            <button
              type="button"
              onClick={() => router.push("/signup")}
              aria-label="Crear cuenta nueva"
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
              ¿No tienes cuenta? <span className="font-semibold text-zinc-300 hover:text-white">Crear empresa</span>
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

      {/* Forgot password modal */}
      {showForgotPassword && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/70
            backdrop-blur-sm
            px-4
          "
          role="dialog"
          aria-modal="true"
          aria-label="Recuperar contraseña"
        >
          <div className="
            w-full
            max-w-[400px]
            bg-zinc-950
            border
            border-zinc-800
            rounded-[32px]
            p-8
            shadow-2xl
            animate-in
            fade-in
            zoom-in-95
            duration-200
          ">

            {/* Header */}
            <div className="
              flex
              items-center
              justify-between
              mb-6
            ">
              <h3 className="
                text-xl
                font-black
                tracking-tight
              ">
                Recuperar contraseña
              </h3>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false)
                  setResetEmail("")
                }}
                aria-label="Cerrar"
                className="
                  text-zinc-600
                  hover:text-white
                  transition-colors
                  duration-200
                  cursor-pointer
                  focus-visible:outline-none
                  focus-visible:text-white
                "
              >
                <X size={20} />
              </button>
            </div>

            <p className="
              text-zinc-500
              text-sm
              mb-6
              leading-relaxed
            ">
              Ingresa tu correo electrónico y te enviaremos un
              enlace para restablecer tu contraseña.
            </p>

            <div className="space-y-4">
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
                  id="reset-email"
                  type="email"
                  aria-label="Correo electrónico para recuperación"
                  className="
                    w-full
                    bg-black/40
                    border
                    border-zinc-800
                    rounded-2xl
                    px-4
                    py-3.5
                    pl-11
                    text-sm
                    outline-none
                    transition-all
                    duration-200
                    focus:border-zinc-600
                    focus:bg-black/60
                    placeholder:text-zinc-700
                  "
                  placeholder="tu@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !resetLoading) {
                      handleForgotPassword()
                    }
                  }}
                  autoFocus
                />
              </div>

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                aria-busy={resetLoading}
                className="
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
                "
              >
                {resetLoading ? "Enviando..." : "Enviar enlace"}
                <ArrowRight size={16} />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
