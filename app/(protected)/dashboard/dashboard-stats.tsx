import StatsCard from "@/components/stats-card"

interface DashboardStatsProps {
  ingresosHoy: number
  totalIngresos: number
  totalClientes: number
  totalVentas: number
  citasPendientes: number
  ingresosEsperados: number
}

export function DashboardStats({
  ingresosHoy,
  totalIngresos,
  totalClientes,
  totalVentas,
  citasPendientes,
  ingresosEsperados,
}: DashboardStatsProps) {
  return (
    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-5">
      <StatsCard
        title="Ingresos Hoy"
        value={`$${ingresosHoy.toLocaleString()}`}
        icon="💰"
        color="from-green-950 to-zinc-900"
      />
      <StatsCard
        title="Ingresos Totales"
        value={`$${totalIngresos.toLocaleString()}`}
        icon="📈"
        color="from-blue-950 to-zinc-900"
      />
      <StatsCard
        title="Clientes"
        value={totalClientes.toString()}
        icon="👥"
        color="from-purple-950 to-zinc-900"
      />
      <StatsCard
        title="Ventas"
        value={totalVentas.toString()}
        icon="🧾"
        color="from-orange-950 to-zinc-900"
      />
      <StatsCard
        title="Citas Pendientes"
        value={citasPendientes.toString()}
        icon="📅"
        color="from-yellow-950 to-zinc-900"
      />
      <StatsCard
        title="Ingresos Esperados"
        value={`$${ingresosEsperados.toLocaleString()}`}
        icon="🎯"
        color="from-cyan-950 to-zinc-900"
      />
    </div>
  )
}
