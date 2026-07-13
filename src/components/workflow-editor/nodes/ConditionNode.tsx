import { Handle, Position, type NodeProps } from "@xyflow/react"
import { GitBranch } from "lucide-react"
import { NODE_COLORS, NODE_ICON_COLORS } from "../constants"
import type { EditorNodeData } from "../types"

export function ConditionNode({ data, selected }: NodeProps) {
  const label = (data as EditorNodeData).label

  return (
    <div className={`
      relative px-4 py-3 rounded-xl border min-w-48
      ${NODE_COLORS.condition}
      ${selected ? "ring-2 ring-amber-500/60" : ""}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-black" />
      <Handle type="source" position={Position.Left} id="false" className="!bg-red-500 !w-3 !h-3 !border-2 !border-black" style={{ top: "65%" }} />
      <Handle type="source" position={Position.Right} id="true" className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-black" style={{ top: "35%" }} />
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-lg ${NODE_ICON_COLORS.condition}`}>
          <GitBranch className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs text-amber-400/60 font-medium uppercase tracking-wider">Condición</p>
          <p className="text-sm font-medium text-white mt-0.5">{label}</p>
        </div>
      </div>
      <div className="flex justify-between mt-2 text-[10px] font-medium">
        <span className="text-emerald-500">✓ Sí</span>
        <span className="text-red-500">✗ No</span>
      </div>
    </div>
  )
}
