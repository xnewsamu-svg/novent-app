"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"

import { auth } from "@/lib/firebase"

import {
  BarChart3,
  Bot,
  Boxes,
  Check,
  ChevronRight,
  Shield,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react"

export default function Home() {
  const router = useRouter()

  // 🔥 Si ya está autenticado → redirect a dashboard
  useEffect(() => {
    const hasCookie =
      document.cookie.includes("firebase-auth-token=")

    if (hasCookie) {
      router.push("/dashboard")
      return
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/dashboard")
      }
    })

    return () => unsub()
  }, [router])

  const goToLogin = () => {
    router.push("/login")
  }

  const features = [
    {
      title: "CRM Inteligente",
      desc: "Gestiona clientes, historial, visitas y crecimiento en tiempo real.",
      icon: <Users size={28} />,
    },
    {
      title: "POS Moderno",
      desc: "Registra ventas rápidamente con una experiencia fluida y profesional.",
      icon: <Wallet size={28} />,
    },
    {
      title: "Inventario Smart",
      desc: "Controla stock, productos y alertas automáticas.",
      icon: <Boxes size={28} />,
    },
    {
      title: "Analytics",
      desc: "Visualiza ingresos, métricas y crecimiento del negocio.",
      icon: <BarChart3 size={28} />,
    },
    {
      title: "Automatización",
      desc: "WhatsApp, recordatorios y flujos automáticos para clientes.",
      icon: <Bot size={28} />,
    },
    {
      title: "Seguridad",
      desc: "Infraestructura moderna y escalable con Firebase.",
      icon: <Shield size={28} />,
    },
  ]

  const plans = [
    {
      name: "Starter",
      price: "$29",
      features: ["CRM", "Ventas", "Inventario"],
    },
    {
      name: "Pro",
      price: "$79",
      features: ["Analytics", "Automatizaciones", "Realtime", "Dashboard premium"],
    },
    {
      name: "Business",
      price: "$149",
      features: ["Multiempresa", "Roles", "Escalabilidad", "Soporte prioritario"],
    },
  ]

  return (
    <div className="bg-black text-white overflow-hidden">

      {/* NAVBAR */}
      <header className="border-b border-white/10 backdrop-blur-xl sticky top-0 z-50 bg-black/50">

        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-black">
              N
            </div>
            <h1 className="text-2xl font-black">Novent</h1>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-zinc-400">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#dashboard">Dashboard</a>
          </nav>

          <button
            onClick={goToLogin}
            className="bg-white text-black px-5 py-3 rounded-2xl font-bold hover:scale-105 transition"
          >
            Empezar
          </button>

        </div>
      </header>

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 pt-28 pb-24">

        <div className="max-w-4xl">

          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-zinc-300 mb-8">
            <Sparkles size={16} />
            Plataforma SaaS Multiempresa
          </div>

          <h1 className="text-6xl md:text-8xl font-black">
            Automatiza y escala
            <span className="block text-zinc-500">tu negocio.</span>
          </h1>

          <p className="text-zinc-400 text-xl max-w-2xl mt-8">
            CRM, ventas, inventario, analytics y automatización.
          </p>

          <div className="flex gap-4 mt-10">

            <button
              onClick={goToLogin}
              className="bg-white text-black px-7 py-4 rounded-2xl font-bold hover:scale-105 transition flex items-center gap-2"
            >
              Empezar ahora <ChevronRight size={18} />
            </button>

          </div>
        </div>

      </section>

      {/* PRICING CTA FIX */}
      <section className="max-w-7xl mx-auto px-6 py-28">

        <div className="text-center mb-20">
          <h2 className="text-5xl font-black">Planes simples</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {plans.map((plan, i) => (
            <div key={i} className="bg-zinc-950 border border-white/10 rounded-[32px] p-8 flex flex-col">

              <h3 className="text-3xl font-black">{plan.name}</h3>

              <div className="mt-6 mb-8">
                <span className="text-6xl font-black">{plan.price}</span>
                <span className="text-zinc-400">/mes</span>
              </div>

              <div className="space-y-4 flex-1">
                {plan.features.map((feature, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Check size={18} />
                    {feature}
                  </div>
                ))}
              </div>

              <button
                onClick={goToLogin}
                className="mt-10 bg-white text-black p-4 rounded-2xl font-bold hover:scale-105 transition"
              >
                Empezar
              </button>

            </div>
          ))}

        </div>

      </section>

      {/* CTA FINAL */}
      <section className="max-w-7xl mx-auto px-6 pb-28">

        <div className="bg-white text-black rounded-[40px] p-14 text-center">

          <h2 className="text-5xl font-black">
            Lleva tu negocio al siguiente nivel
          </h2>

          <button
            onClick={goToLogin}
            className="mt-10 bg-black text-white px-8 py-5 rounded-2xl font-bold"
          >
            Comenzar ahora
          </button>

        </div>

      </section>

    </div>
  )
}
