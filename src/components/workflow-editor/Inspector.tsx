"use client"

import { useCallback } from "react"
import { X, Settings2, Variable, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import type { EditorNode } from "./types"

const CONDITION_OPERATORS = [
  { value: "==", label: "Es igual a" },
  { value: "!=", label: "No es igual a" },
  { value: "contains", label: "Contiene" },
  { value: "startsWith", label: "Empieza con" },
  { value: "endsWith", label: "Termina con" },
  { value: "gt", label: "Mayor que" },
  { value: "gte", label: "Mayor o igual que" },
  { value: "lt", label: "Menor que" },
  { value: "lte", label: "Menor o igual que" },
  { value: "exists", label: "Existe" },
  { value: "in", label: "Está en" },
  { value: "notIn", label: "No está en" },
]

const MESSAGE_TYPES = [
  { value: "text", label: "Texto" },
  { value: "template", label: "Plantilla" },
]

const CUSTOMER_STATUSES = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "vip", label: "VIP" },
]

const VARIABLE_HINTS = [
  { label: "Nombre del cliente", value: "{{event.customerName}}" },
  { label: "Teléfono", value: "{{event.phone}}" },
  { label: "Email", value: "{{event.email}}" },
  { label: "ID del workflow", value: "{{workflow.id}}" },
  { label: "Nombre del workflow", value: "{{workflow.name}}" },
  { label: "Nombre de la empresa", value: "{{company.name}}" },
  { label: "ID de la empresa", value: "{{company.id}}" },
]

interface InspectorProps {
  node: EditorNode | null
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void
  onDeleteNode: (nodeId: string) => void
}

export function Inspector({ node, onUpdateConfig, onDeleteNode }: InspectorProps) {
  const set = useCallback(
    (key: string, value: unknown) => {
      if (!node) return
      onUpdateConfig(node.id, { ...node.data.config, [key]: value })
    },
    [node, onUpdateConfig],
  )

  const setNested = useCallback(
    (path: string[], value: unknown) => {
      if (!node) return
      const config = structuredClone(node.data.config)
      let obj: Record<string, unknown> = config
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i]
        if (!(key in obj)) obj[key] = {}
        obj = obj[key] as Record<string, unknown>
      }
      obj[path[path.length - 1]] = value
      onUpdateConfig(node.id, config)
    },
    [node, onUpdateConfig],
  )

  if (!node) {
    return (
      <aside className="w-72 border-l border-zinc-800 bg-zinc-950/30 flex flex-col items-center justify-center text-center p-6">
        <Settings2 className="w-8 h-8 text-zinc-700 mb-3" />
        <p className="text-sm text-zinc-600">Selecciona un nodo para editar sus propiedades</p>
      </aside>
    )
  }

  return (
    <aside className="w-72 border-l border-zinc-800 bg-zinc-950/30 flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-300">Propiedades</h3>
        <Button variant="ghost" size="icon-xs" onClick={() => onDeleteNode(node.id)}>
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-500">Nombre</Label>
          <Input
            value={node.data.label}
            onChange={(e) => {
              const config = { ...node.data.config }
              onUpdateConfig(node.id, { ...config, _label: e.target.value })
            }}
            className="h-7 text-sm"
            placeholder="Nombre del nodo"
          />
        </div>

        <Separator className="bg-zinc-800" />

        {node.type === "trigger" && <TriggerConfig node={node} set={set} />}
        {node.type === "condition" && <ConditionConfig node={node} setNested={setNested} />}
        {node.type === "action" && <ActionConfig node={node} set={set} />}

        <Separator className="bg-zinc-800" />

        <VariableHints />
      </div>
    </aside>
  )
}

function LabelRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-500">{label}</Label>
      {children}
    </div>
  )
}

function VariableHints() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Variable className="w-3 h-3 text-zinc-500" />
        <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Variables disponibles</p>
      </div>
      <div className="space-y-1">
        {VARIABLE_HINTS.map((v) => (
          <button
            key={v.value}
            onClick={() => navigator.clipboard?.writeText(v.value)}
            className="w-full text-left px-2 py-1 rounded text-[11px] font-mono text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors truncate"
            title="Copiar variable"
          >
            {v.label} <span className="text-zinc-600">{v.value}</span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-zinc-600">Haz clic para copiar</p>
    </div>
  )
}

function TriggerConfig({ node, set }: { node: EditorNode; set: (k: string, v: unknown) => void }) {
  const triggerType = node.data.nodeType

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Configuración del disparador</p>
      <LabelRow label="Tipo de evento">
        <p className="text-xs text-zinc-400 font-mono bg-zinc-900 px-2 py-1 rounded">{triggerType}</p>
      </LabelRow>
      {triggerType === "whatsapp.message.received" && (
        <LabelRow label="Filtrar por palabra clave">
          <Input
            placeholder="Ej: promoción, horario"
            onChange={(e) => set("keyword", e.target.value)}
            className="h-7 text-sm"
          />
        </LabelRow>
      )}
      {triggerType === "sale.created" && (
        <LabelRow label="Monto mínimo">
          <Input
            type="number"
            placeholder="Ej: 100"
            onChange={(e) => set("minAmount", Number(e.target.value))}
            className="h-7 text-sm"
          />
        </LabelRow>
      )}
    </div>
  )
}

function ConditionConfig({ node, setNested }: { node: EditorNode; setNested: (p: string[], v: unknown) => void }) {
  const expr = node.data.config?.expression as Record<string, unknown> | undefined
  const conditions = (expr?.conditions as Array<Record<string, unknown>>) ?? [{ field: "", op: "==", value: "" }]
  const operator = (expr?.operator as string) ?? "AND"

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">Configuración de condición</p>

      <LabelRow label="Tipo de condición">
        <Select
          value={operator}
          onValueChange={(v) => setNested(["expression", "operator"], v)}
        >
          <SelectTrigger className="h-7 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">Todas (AND)</SelectItem>
            <SelectItem value="OR">Cualquiera (OR)</SelectItem>
            <SelectItem value="NOT">No (NOT)</SelectItem>
          </SelectContent>
        </Select>
      </LabelRow>

      {conditions.map((cond, i) => (
        <div key={i} className="space-y-1.5 p-2 rounded-lg bg-zinc-900/50 border border-zinc-800">
          <p className="text-[10px] text-zinc-600 font-medium">Condición {i + 1}</p>
          <LabelRow label="Campo">
            <Input
              value={(cond.field as string) ?? ""}
              onChange={(e) => setNested(["expression", "conditions", String(i), "field"], e.target.value)}
              placeholder="Ej: totalAmount"
              className="h-7 text-sm"
            />
          </LabelRow>
          <LabelRow label="Operador">
            <Select
              value={(cond.op as string) ?? "=="}
              onValueChange={(v) => setNested(["expression", "conditions", String(i), "op"], v)}
            >
              <SelectTrigger className="h-7 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPERATORS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </LabelRow>
          <LabelRow label="Valor">
            <Input
              value={(cond.value as string) ?? ""}
              onChange={(e) => setNested(["expression", "conditions", String(i), "value"], e.target.value)}
              placeholder="Ej: 100"
              className="h-7 text-sm"
            />
          </LabelRow>
        </div>
      ))}
    </div>
  )
}

function ActionConfig({ node, set }: { node: EditorNode; set: (k: string, v: unknown) => void }) {
  const actionType = node.data.actionType || node.data.nodeType?.replace("action.", "") || ""

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">
        Configuración de acción
      </p>

      {actionType === "whatsapp.send" && (
        <>
          <LabelRow label="Tipo de mensaje">
            <Select value={(node.data.config?.messageType as string) ?? "text"} onValueChange={(v) => set("messageType", v)}>
              <SelectTrigger className="h-7 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESSAGE_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </LabelRow>
          <LabelRow label="Número destino">
            <Input value={(node.data.config?.to as string) ?? ""} onChange={(e) => set("to", e.target.value)} placeholder="{{event.phone}}" className="h-7 text-sm font-mono" />
          </LabelRow>
          {(node.data.config?.messageType ?? "text") === "text" ? (
            <LabelRow label="Mensaje">
              <Input value={(node.data.config?.body as string) ?? ""} onChange={(e) => set("body", e.target.value)} placeholder="Hola {{event.customerName}}" className="h-7 text-sm font-mono" />
            </LabelRow>
          ) : (
            <>
              <LabelRow label="Nombre de plantilla">
                <Input value={(node.data.config?.templateName as string) ?? ""} onChange={(e) => set("templateName", e.target.value)} placeholder="welcome_message" className="h-7 text-sm" />
              </LabelRow>
              <LabelRow label="Idioma">
                <Input value={(node.data.config?.languageCode as string) ?? "es"} onChange={(e) => set("languageCode", e.target.value)} placeholder="es" className="h-7 text-sm" />
              </LabelRow>
            </>
          )}
        </>
      )}

      {actionType === "customer.create" && (
        <>
          <LabelRow label="Nombre">
            <Input value={(node.data.config?.name as string) ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="{{event.customerName}}" className="h-7 text-sm font-mono" />
          </LabelRow>
          <LabelRow label="Teléfono">
            <Input value={(node.data.config?.phone as string) ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="{{event.phone}}" className="h-7 text-sm font-mono" />
          </LabelRow>
          <LabelRow label="Email">
            <Input value={(node.data.config?.email as string) ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="{{event.email}}" className="h-7 text-sm font-mono" />
          </LabelRow>
        </>
      )}

      {actionType === "customer.update" && (
        <LabelRow label="Estado del cliente">
          <Select value={(node.data.config?.status as string) ?? ""} onValueChange={(v) => set("status", v)}>
            <SelectTrigger className="h-7 text-sm"><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
            <SelectContent>
              {CUSTOMER_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </LabelRow>
      )}

      {actionType === "delay" && (
        <LabelRow label="Duración (segundos)">
          <Input
            type="number"
            value={((node.data.config?.durationMs as number) ?? 5000) / 1000}
            onChange={(e) => set("durationMs", Number(e.target.value) * 1000)}
            min={1}
            className="h-7 text-sm"
          />
        </LabelRow>
      )}
    </div>
  )
}
