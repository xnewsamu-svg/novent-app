"use client"

import { useCallback, type DragEvent } from "react"
import { PALETTE_ITEMS, CATEGORY_LABELS } from "./constants"

export function Sidebar() {
  const onDragStart = useCallback((event: DragEvent<HTMLDivElement>, type: string) => {
    event.dataTransfer.setData("application/reactflow", type)
    event.dataTransfer.effectAllowed = "move"
  }, [])

  const categories = Array.from(new Set(PALETTE_ITEMS.map((i) => i.category))) as Array<"triggers" | "conditions" | "actions" | "flow">

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950/50 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-300">Nodos</h3>
        <p className="text-xs text-zinc-500 mt-1">Arrástralos al canvas</p>
      </div>
      <div className="flex-1 p-3 space-y-6">
        {categories.map((cat) => {
          const items = PALETTE_ITEMS.filter((i) => i.category === cat)
          return (
            <div key={cat}>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 px-1">
                {CATEGORY_LABELS[cat]}
              </h4>
              <div className="space-y-1">
                {items.map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, item.type)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-700/50 group"
                  >
                    <div className="p-1 rounded-md bg-zinc-800/50 group-hover:bg-zinc-700/50 transition-colors shrink-0">
                      <item.icon className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-300 truncate">{item.label}</p>
                      <p className="text-[10px] text-zinc-600 truncate leading-tight">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
