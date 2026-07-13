import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface VentasPorDia {
  fecha: string
  total: number
}

interface VentasPorServicio {
  name: string
  value: number
}

interface DashboardChartsProps {
  ventasPorDia: VentasPorDia[]
  ventasPorServicio: VentasPorServicio[]
}

const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#f97316",
  "#eab308",
]

export function DashboardCharts({ ventasPorDia, ventasPorServicio }: DashboardChartsProps) {
  return (
    <div className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 hover:border-zinc-700 transition-all duration-300 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Ingresos últimos días</h2>
            <p className="text-zinc-500 mt-1 text-sm">Rendimiento semanal</p>
          </div>
        </div>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ventasPorDia}>
              <XAxis dataKey="fecha" stroke="#71717a" />
              <YAxis stroke="#71717a" />
              <Tooltip />
              <Bar dataKey="total" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 hover:border-zinc-700 transition-all duration-300 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Servicios más vendidos</h2>
            <p className="text-zinc-500 mt-1 text-sm">Distribución de ventas</p>
          </div>
        </div>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ventasPorServicio}
                dataKey="value"
                nameKey="name"
                outerRadius={120}
                label
              >
                {ventasPorServicio.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
