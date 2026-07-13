import { Sparkles } from "lucide-react"
import type { SaleRecord } from "@/src/services/sales.service"

interface RecentSalesFeedProps {
  ventas: SaleRecord[]
  isEmpty: boolean
}

export function RecentSalesFeed({ ventas, isEmpty }: RecentSalesFeedProps) {
  return (
    <div className="relative z-10 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 hover:border-zinc-700 transition-all duration-300 rounded-3xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Actividad reciente</h2>
          <p className="text-zinc-500 text-sm mt-1">Últimos movimientos del sistema</p>
        </div>
        {!isEmpty && (
          <div className="px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-400">
            Live
          </div>
        )}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <Sparkles size={24} className="text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-400">
            Aún no hay actividad
          </h3>
          <p className="text-zinc-600 text-sm mt-1">
            Las ventas y movimientos aparecerán aquí en tiempo real.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ventas.slice(-5).reverse().map((v) => (
            <div
              key={v.id}
              className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 p-4 rounded-2xl flex justify-between items-center"
            >
              <div>
                <p className="font-semibold text-lg">{v.servicio}</p>
                <p className="text-zinc-400 text-sm mt-1">{v.fecha}</p>
              </div>
              <p className="text-green-400 font-bold text-xl">
                ${v.precio.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
