import { Handle, Position, type NodeProps } from "@xyflow/react"
import { StopCircle } from "lucide-react"
import { NODE_COLORS, NODE_ICON_COLORS } from "../constants"

export function EndNode(_props: NodeProps) {
  return (
    <div className={`
      relative px-4 py-3 rounded-xl border min-w-32 text-center
      ${NODE_COLORS.end}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-zinc-500 !w-3 !h-3 !border-2 !border-black" />
      <div className="flex items-center justify-center gap-2">
        <StopCircle className="w-4 h-4 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-400">Finalizar</p>
      </div>
    </div>
  )
}
