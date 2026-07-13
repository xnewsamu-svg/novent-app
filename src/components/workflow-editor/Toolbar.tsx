"use client"

import { useState } from "react"
import { Save, Send, CheckCircle2, AlertCircle, RotateCcw, Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { EditorState } from "./types"

const TRIGGER_OPTIONS = [
  { value: "whatsapp.message.received", label: "WhatsApp recibido" },
  { value: "customer.created", label: "Cliente creado" },
  { value: "sale.created", label: "Venta creada" },
]

interface ToolbarProps {
  workflowName: string
  onNameChange: (name: string) => void
  state: EditorState
  onSave: () => void
  onPublish: () => void
  onUnpublish: () => void
  onValidate: () => void
}

export function Toolbar({ workflowName, onNameChange, state, onSave, onPublish, onUnpublish, onValidate }: ToolbarProps) {
  const [nameEditing, setNameEditing] = useState(false)
  const { isDirty, isValidating, validationErrors, isSaving, isPublishing, workflow } = state
  const enabled = workflow?.enabled ?? false
  const publishedAt = workflow?.publishedAt ?? null
  const isPublished = !!(enabled && publishedAt)

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {nameEditing ? (
          <Input
            value={workflowName}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={() => setNameEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && setNameEditing(false)}
            className="h-7 w-64 text-sm font-semibold"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setNameEditing(true)}
            className="text-sm font-semibold text-zinc-200 hover:text-white truncate max-w-48 cursor-text"
          >
            {workflowName || "Sin nombre"}
          </button>
        )}
        {isDirty && (
          <span className="text-[10px] text-amber-500 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
            Sin guardar
          </span>
        )}
        {isValidating && (
          <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin shrink-0" />
        )}
        {validationErrors.length > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded shrink-0">
            <AlertCircle className="w-3 h-3" />
            {validationErrors.length} error{validationErrors.length > 1 ? "es" : ""}
          </div>
        )}
        {!isValidating && validationErrors.length === 0 && workflow && (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isPublished && (
          <Button variant="ghost" size="sm" onClick={onUnpublish} disabled={isSaving}>
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Despublicar
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onValidate} disabled={isValidating}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Validar
        </Button>
        <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving || !isDirty}>
          {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Guardar
        </Button>
        <Button size="sm" onClick={onPublish} disabled={isPublishing || validationErrors.length > 0}>
          {isPublishing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
          {isPublished ? "Publicar nueva versión" : "Publicar"}
        </Button>
      </div>
    </header>
  )
}
