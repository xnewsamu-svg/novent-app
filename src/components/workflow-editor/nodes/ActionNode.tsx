import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Play } from "lucide-react"
import { NODE_COLORS, NODE_ICON_COLORS } from "../constants"
import type { EditorNodeData } from "../types"

export function ActionNode({ data, selected }: NodeProps) {
  const label = (data as EditorNodeData).label

  return (
    <div className={`
      relative px-4 py-3 rounded-xl border min-w-48
      ${NODE_COLORS.action}
      ${selected ? "ring-2 ring-blue-500/60" : ""}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-black" />
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-black" />
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-lg ${NODE_ICON_COLORS.action}`}>
          <Play className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs text-blue-400/60 font-medium uppercase tracking-wider">Acción</p>
          <p className="text-sm font-medium text-white mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  )
}
