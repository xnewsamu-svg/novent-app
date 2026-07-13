import Link from "next/link"

interface DashboardHeaderProps {
  isFresh: boolean
  displayName: string
  isEmpty: boolean
}

export function DashboardHeader({ isFresh, displayName, isEmpty }: DashboardHeaderProps) {
  return (
    <div className="space-y-4 relative z-10">
      <div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none">
          {isFresh
            ? "Bienvenido a Novent 👋"
            : `Hola ${displayName} 👋`
          }
        </h1>
        <p className="text-zinc-500 text-base mt-2">
          {isFresh
            ? "Tu sistema de gestión inteligente está listo. Comienza configurando tu negocio."
            : isEmpty
              ? "Aún no hay ventas registradas. Crea tu primera venta para comenzar."
              : "Aquí tienes el resumen de tu negocio."
          }
        </p>
      </div>
    </div>
  )
}
