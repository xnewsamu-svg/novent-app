import { MessageSquare, UserPlus, ShoppingCart, GitBranch, Send, UserCog, Clock, StopCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface PaletteItem {
  type: string
  label: string
  description: string
  icon: LucideIcon
  category: "triggers" | "conditions" | "actions" | "flow"
  defaultConfig?: Record<string, unknown>
}

export const PALETTE_ITEMS: PaletteItem[] = [
  ...triggerItems(),
  ...conditionItems(),
  ...actionItems(),
  ...flowControlItems(),
]

function triggerItems(): PaletteItem[] {
  return [
    { type: "whatsapp.message.received", label: "WhatsApp recibido", description: "Se dispara al recibir un mensaje de WhatsApp", icon: MessageSquare, category: "triggers" },
    { type: "customer.created", label: "Cliente creado", description: "Se dispara cuando se crea un nuevo cliente", icon: UserPlus, category: "triggers" },
    { type: "sale.created", label: "Venta creada", description: "Se dispara cuando se registra una venta", icon: ShoppingCart, category: "triggers" },
  ]
}

function conditionItems(): PaletteItem[] {
  return [
    {
      type: "condition",
      label: "Si",
      description: "Evalúa una condición y bifurca el flujo (Sí/No)",
      icon: GitBranch,
      category: "conditions",
      defaultConfig: {
        expression: {
          operator: "AND",
          conditions: [{ field: "", op: "==", value: "" }],
        },
      },
    },
  ]
}

function actionItems(): PaletteItem[] {
  return [
    { type: "action.whatsapp.send", label: "Enviar WhatsApp", description: "Envía un mensaje de WhatsApp", icon: MessageSquare, category: "actions", defaultConfig: { messageType: "text", body: "", to: "" } },
    { type: "action.customer.create", label: "Crear Cliente", description: "Crea un nuevo cliente en el CRM", icon: UserPlus, category: "actions", defaultConfig: { name: "", phone: "" } },
    { type: "action.customer.update", label: "Actualizar Cliente", description: "Actualiza los datos de un cliente existente", icon: UserCog, category: "actions", defaultConfig: { status: "" } },
    { type: "action.delay", label: "Esperar", description: "Pausa la ejecución por un tiempo determinado", icon: Clock, category: "actions", defaultConfig: { durationMs: 5000 } },
  ]
}

function flowControlItems(): PaletteItem[] {
  return [
    { type: "end", label: "Finalizar", description: "Termina la ejecución del workflow", icon: StopCircle, category: "flow" },
  ]
}

export const CATEGORY_LABELS: Record<string, string> = {
  triggers: "Disparadores",
  conditions: "Condiciones",
  actions: "Acciones",
  flow: "Flujo",
}

export const NODE_COLORS: Record<string, string> = {
  trigger: "border-emerald-500/40 bg-emerald-500/5",
  condition: "border-amber-500/40 bg-amber-500/5",
  action: "border-blue-500/40 bg-blue-500/5",
  end: "border-zinc-500/40 bg-zinc-500/5",
}

export const NODE_ICON_COLORS: Record<string, string> = {
  trigger: "text-emerald-400 bg-emerald-500/10",
  condition: "text-amber-400 bg-amber-500/10",
  action: "text-blue-400 bg-blue-500/10",
  end: "text-zinc-400 bg-zinc-500/10",
}

export const RF_DEFAULT_EDGE_OPTIONS = {
  style: { stroke: "#27272a", strokeWidth: 2 },
  markerEnd: { type: "arrowclosed", color: "#27272a" },
} as const

export const RF_DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 }
