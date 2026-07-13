type StatsCardProps = {
  title: string
  value: string
  icon?: string
  color?: string
}

export default function StatsCard({
  title,
  value,
  icon,
  color = "from-zinc-900 to-zinc-800",
}: StatsCardProps) {

  return (

    <div
      className={`
        relative overflow-hidden
        bg-gradient-to-br ${color}
        border border-zinc-800
        rounded-3xl
        p-6
        shadow-xl
        hover:scale-[1.02]
        transition-all
        duration-300
      `}
    >

      {/* Glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">

        <p className="text-zinc-400 text-sm font-medium">
          {title}
        </p>

        {icon && (
          <div className="text-2xl">
            {icon}
          </div>
        )}

      </div>

      {/* Value */}
      <h2 className="text-4xl font-bold tracking-tight text-white">

        {value}

      </h2>

      {/* Bottom decoration */}
      <div className="mt-6 h-1 w-16 rounded-full bg-white/20" />

    </div>
  )
}