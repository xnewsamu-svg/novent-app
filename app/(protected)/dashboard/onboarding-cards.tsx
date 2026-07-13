import Link from "next/link"
import { Users, ShoppingCart, Package, ArrowRight } from "lucide-react"

export function OnboardingCards() {
  return (
    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
      <Link
        href="/clientes"
        className="group bg-zinc-900/60 border border-zinc-800 hover:border-green-500/30 hover:bg-zinc-900/80 rounded-3xl p-6 transition-all duration-300 space-y-4"
      >
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400">
          <Users size={24} />
        </div>
        <div>
          <h3 className="font-bold text-lg group-hover:text-green-400 transition-colors">
            1. Crear cliente
          </h3>
          <p className="text-zinc-500 text-sm mt-1">
            Registra tus primeros clientes en el sistema.
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm text-green-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Ir a clientes <ArrowRight size={14} />
        </div>
      </Link>

      <Link
        href="/inventario"
        className="group bg-zinc-900/60 border border-zinc-800 hover:border-blue-500/30 hover:bg-zinc-900/80 rounded-3xl p-6 transition-all duration-300 space-y-4"
      >
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
          <Package size={24} />
        </div>
        <div>
          <h3 className="font-bold text-lg group-hover:text-blue-400 transition-colors">
            2. Agregar productos
          </h3>
          <p className="text-zinc-500 text-sm mt-1">
            Da de alta los servicios o productos que ofreces.
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Ir a inventario <ArrowRight size={14} />
        </div>
      </Link>

      <Link
        href="/ventas"
        className="group bg-zinc-900/60 border border-zinc-800 hover:border-purple-500/30 hover:bg-zinc-900/80 rounded-3xl p-6 transition-all duration-300 space-y-4"
      >
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
          <ShoppingCart size={24} />
        </div>
        <div>
          <h3 className="font-bold text-lg group-hover:text-purple-400 transition-colors">
            3. Registrar venta
          </h3>
          <p className="text-zinc-500 text-sm mt-1">
            Selecciona cliente y producto para crear tu primera venta.
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm text-purple-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Ir a ventas <ArrowRight size={14} />
        </div>
      </Link>
    </div>
  )
}
